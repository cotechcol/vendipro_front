import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem, Product } from '@/types'
import { calculateItemUnitPrice } from '@/utils/product-options'

function buildCartKey(productId: number, selectedOptionIds?: number[]): string {
  const opts = (selectedOptionIds ?? []).slice().sort((a, b) => a - b).join(',')
  return opts ? `${productId}:${opts}` : String(productId)
}

function itemUnitPrice(item: CartItem): number {
  return item.unitPrice ?? calculateItemUnitPrice(item.product, item.selectedOptionIds)
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const customerId = ref<number | null>(null)
  const paymentMethod = ref<'cash' | 'card' | 'mixed'>('cash')
  const amountPaid = ref<number>(0)

  const total = computed(() =>
    items.value.reduce((sum, i) => sum + itemUnitPrice(i) * i.quantity, 0),
  )

  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0),
  )

  function maxQty(product: Product): number {
    return product.sellableUnits ?? Math.floor(Number(product.stock))
  }

  function addProduct(
    product: Product,
    selectedOptionIds?: number[],
    optionLabel?: string,
    unitPrice?: number,
  ) {
    const cartKey = buildCartKey(product.id, selectedOptionIds)
    const max = maxQty(product)
    const price = unitPrice ?? calculateItemUnitPrice(product, selectedOptionIds)
    const existing = items.value.find((i) => i.cartKey === cartKey)
    if (existing) {
      if (existing.quantity < max) existing.quantity++
    } else {
      items.value.push({
        product,
        quantity: 1,
        selectedOptionIds,
        optionLabel,
        unitPrice: price,
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
    } else if (quantity <= maxQty(item.product)) {
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
