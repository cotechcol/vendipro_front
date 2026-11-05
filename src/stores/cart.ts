import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem, Product } from '@/types'
import { calculateItemUnitPrice } from '@/utils/product-options'

function buildCartKey(
  productId: number,
  selectedOptionIds?: number[],
  portionScoopCount?: number,
  soldAsUnit?: boolean,
): string {
  const opts = (selectedOptionIds ?? []).slice().sort((a, b) => a - b).join(',')
  const scoop = portionScoopCount ? `:s${portionScoopCount}` : ''
  const pack = soldAsUnit ? ':u' : ''
  return opts ? `${productId}:${opts}${scoop}${pack}` : `${productId}${scoop}${pack}`
}

function packTotalUnits(product: Product): number {
  const per = Math.max(1, Math.floor(Number(product.unitsPerPack) || 1))
  return Math.floor(Number(product.stock) || 0) * per
    + Math.floor(Number(product.looseUnits) || 0)
}

function itemUnits(item: CartItem): number {
  if (item.product.productType !== 'packaged') return item.quantity
  const per = Math.max(1, Math.floor(Number(item.product.unitsPerPack) || 1))
  return item.soldAsUnit ? item.quantity : item.quantity * per
}

function itemUnitPrice(item: CartItem): number {
  return item.unitPrice ?? calculateItemUnitPrice(
    item.product,
    item.selectedOptionIds,
    item.portionScoopCount,
    item.soldAsUnit,
  )
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const customerId = ref<number | null>(null)
  const paymentMethod = ref<'cash' | 'card' | 'mixed' | 'nequi'>('cash')
  const amountPaid = ref<number>(0)

  const total = computed(() =>
    items.value.reduce((sum, i) => sum + itemUnitPrice(i) * i.quantity, 0),
  )

  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0),
  )

  function maxQty(product: Product, soldAsUnit?: boolean, exceptKey?: string): number {
    if (product.productType === 'packaged') {
      const per = Math.max(1, Math.floor(Number(product.unitsPerPack) || 1))
      const reserved = items.value
        .filter((i) => i.product.id === product.id && i.cartKey !== exceptKey)
        .reduce((sum, i) => sum + itemUnits(i), 0)
      const available = Math.max(0, packTotalUnits(product) - reserved)
      return soldAsUnit ? available : Math.floor(available / per)
    }
    return product.sellableUnits ?? Math.floor(Number(product.stock))
  }

  function addProduct(
    product: Product,
    selectedOptionIds?: number[],
    optionLabel?: string,
    unitPrice?: number,
    portionScoopCount?: number,
    soldAsUnit?: boolean,
  ) {
    const cartKey = buildCartKey(product.id, selectedOptionIds, portionScoopCount, soldAsUnit)
    const max = maxQty(product, soldAsUnit, cartKey)
    const price = unitPrice ?? calculateItemUnitPrice(
      product,
      selectedOptionIds,
      portionScoopCount,
      soldAsUnit,
    )
    const existing = items.value.find((i) => i.cartKey === cartKey)
    if (existing) {
      if (existing.quantity < max) existing.quantity++
    } else if (max >= 1) {
      items.value.push({
        product,
        quantity: 1,
        selectedOptionIds,
        optionLabel,
        unitPrice: price,
        portionScoopCount,
        soldAsUnit,
        cartKey,
      })
    }
    amountPaid.value = total.value
  }

  function updateQuantity(cartKey: string, quantity: number) {
    const item = items.value.find((i) => i.cartKey === cartKey)
    if (!item) return
    if (quantity <= 0) {
      removeItem(cartKey)
    } else if (quantity <= maxQty(item.product, item.soldAsUnit, cartKey)) {
      item.quantity = quantity
    }
    amountPaid.value = total.value
  }

  function removeItem(cartKey: string) {
    items.value = items.value.filter((i) => i.cartKey !== cartKey)
    amountPaid.value = total.value
  }

  function clear() {
    items.value = []
    customerId.value = null
    paymentMethod.value = 'cash'
    amountPaid.value = 0
  }

  return {
    items, customerId, paymentMethod, amountPaid,
    total, itemCount,
    addProduct, updateQuantity, removeItem, clear, itemUnitPrice,
  }
})
