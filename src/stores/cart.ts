import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem, Product } from '@/types'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const customerId = ref<number | null>(null)
  const paymentMethod = ref<'cash' | 'card' | 'mixed'>('cash')
  const amountPaid = ref<number>(0)

  const total = computed(() =>
    items.value.reduce((sum, i) => sum + Number(i.product.salePrice) * i.quantity, 0),
  )

  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0),
  )

  function maxQty(product: Product): number {
    return product.sellableUnits ?? Math.floor(Number(product.stock))
  }

  function addProduct(product: Product) {
    const max = maxQty(product)
    const existing = items.value.find((i) => i.product.id === product.id)
    if (existing) {
      if (existing.quantity < max) existing.quantity++
    } else {
      items.value.push({ product, quantity: 1 })
    }
    amountPaid.value = total.value
  }

  function updateQuantity(productId: number, quantity: number) {
    const item = items.value.find((i) => i.product.id === productId)
    if (!item) return
    if (quantity <= 0) {
      removeItem(productId)
    } else if (quantity <= maxQty(item.product)) {
      item.quantity = quantity
    }
    amountPaid.value = total.value
  }

  function removeItem(productId: number) {
    items.value = items.value.filter((i) => i.product.id !== productId)
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
    addProduct, updateQuantity, removeItem, clear,
  }
})
