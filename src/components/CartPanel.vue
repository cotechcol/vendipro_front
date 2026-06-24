<script setup lang="ts">
import { useCartStore } from '@/stores/cart'
import { formatMoney } from '@/utils/format'
import type { Customer } from '@/types'

defineProps<{
  customers: Customer[]
  processing?: boolean
}>()

defineEmits<{ checkout: [] }>()

const cart = useCartStore()
</script>
<template>
  <div class="flex flex-col h-full p-4">
    <h3 class="font-semibold mb-3">Carrito ({{ cart.itemCount }})</h3>
    <div class="flex-1 overflow-y-auto space-y-2 mb-4">
      <div v-if="cart.items.length === 0" class="text-slate-400 text-sm text-center py-8">Agrega productos</div>
      <div v-for="item in cart.items" :key="item.cartKey" class="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ item.product.name }}</p>
          <p v-if="item.optionLabel" class="text-xs text-slate-400 truncate">{{ item.optionLabel }}</p>
          <p class="text-xs text-slate-500">{{ formatMoney(cart.itemUnitPrice(item)) }}</p>
        </div>
        <div class="flex items-center gap-1">
          <button :disabled="processing" class="w-7 h-7 bg-white border rounded text-sm disabled:opacity-50" @click="cart.updateQuantity(item.cartKey, item.quantity - 1)">-</button>
          <span class="w-8 text-center text-sm font-medium">{{ item.quantity }}</span>
          <button :disabled="processing" class="w-7 h-7 bg-white border rounded text-sm disabled:opacity-50" @click="cart.updateQuantity(item.cartKey, item.quantity + 1)">+</button>
        </div>
        <button :disabled="processing" class="text-red-400 text-sm ml-1 disabled:opacity-50" @click="cart.removeItem(item.cartKey)">&times;</button>
      </div>
    </div>
    <div class="space-y-3 border-t pt-3">
      <select v-model="cart.customerId" class="w-full px-3 py-2 border rounded-lg text-sm">
        <option :value="null">Cliente general</option>
        <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="cart.paymentMethod" class="w-full px-3 py-2 border rounded-lg text-sm">
        <option value="cash">Efectivo</option>
        <option value="card">Tarjeta</option>
        <option value="mixed">Mixto</option>
      </select>
      <div v-if="cart.paymentMethod !== 'card'">
        <label class="text-xs text-slate-500">Monto recibido</label>
        <input v-model.number="cart.amountPaid" type="number" step="0.01" class="w-full px-3 py-2 border rounded-lg" />
        <p v-if="cart.amountPaid > cart.total" class="text-sm text-green-600 mt-1">
          Cambio: {{ formatMoney(cart.amountPaid - cart.total) }}
        </p>
      </div>
      <div class="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span class="text-primary-600">{{ formatMoney(cart.total) }}</span>
      </div>
      <button
        :disabled="cart.items.length === 0 || processing"
        class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-lg disabled:opacity-50 disabled:pointer-events-none transition-colors"
        @click="$emit('checkout')"
      >
        {{ processing ? 'Procesando venta...' : 'Cobrar' }}
      </button>
      <button :disabled="processing" class="w-full text-sm text-slate-500 py-1 disabled:opacity-50" @click="cart.clear()">Limpiar carrito (Esc)</button>
    </div>
  </div>
</template>
