<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api/client'
import { useCartStore } from '@/stores/cart'
import { useAppStore } from '@/stores/app'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import TicketPrint from '@/components/TicketPrint.vue'
import CartPanel from '@/components/CartPanel.vue'
import type { Product, Category, Customer, Sale, Setting } from '@/types'

import { formatMoney } from '@/utils/format'
import { printHtmlElement } from '@/utils/printTicket'

const cart = useCartStore()
const app = useAppStore()
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const customers = ref<Customer[]>([])
const search = ref('')
const categoryFilter = ref<number | ''>('')
const loading = ref(true)
const processing = ref(false)
const showCart = ref(false)
const showSuccess = ref(false)
const lastSale = ref<Sale | null>(null)
const ticketSettings = ref<Setting | null>(null)
const ticketRef = ref<InstanceType<typeof TicketPrint> | null>(null)
const toast = ref({ show: false, message: '', type: 'error' as 'success' | 'error' })

const filtered = computed(() => {
  let list = products.value
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }
  if (categoryFilter.value) list = list.filter((p) => p.categoryId === categoryFilter.value)
  return list
})

async function loadProducts() {
  loading.value = true
  try {
    const [prodRes, catRes, custRes] = await Promise.all([
      api.get('/products/pos', { params: { search: search.value || undefined, categoryId: categoryFilter.value || undefined } }),
      api.get('/categories/active'),
      api.get('/customers', { params: { limit: 100 } }),
    ])
    products.value = prodRes.data
    categories.value = catRes.data
    customers.value = custRes.data.data
  } finally {
    loading.value = false
  }
}

async function checkout() {
  if (processing.value || cart.items.length === 0) return
  if (!app.cashSession) {
    toast.value = { show: true, message: 'Debes abrir la caja primero', type: 'error' }
    return
  }
  processing.value = true
  try {
    const { data } = await api.post('/sales', {
      items: cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      customerId: cart.customerId || undefined,
      paymentMethod: cart.paymentMethod,
      amountPaid: cart.paymentMethod === 'card' ? undefined : cart.amountPaid,
    })
    const ticketRes = await api.get(`/sales/${data.id}/ticket`)
    lastSale.value = ticketRes.data.sale
    ticketSettings.value = ticketRes.data.settings
    cart.clear()
    showSuccess.value = true
    await loadProducts()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al procesar venta'
    toast.value = { show: true, message: msg, type: 'error' }
  } finally {
    processing.value = false
  }
}

function printTicket() {
  const el = ticketRef.value?.$el as HTMLElement | undefined
  if (el) printHtmlElement(el)
}

function closeSuccess() {
  showSuccess.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (processing.value) return
  if (e.key === 'Escape') cart.clear()
  if (e.key === 'Enter' && e.ctrlKey) checkout()
}

onMounted(() => {
  loadProducts()
  app.fetchCashSession()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="pb-20 lg:pb-0">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Punto de Venta</h2>
      <div v-if="!app.cashSession" class="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full">
        Caja cerrada — <router-link to="/cash" class="underline">Abrir caja</router-link>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-12rem)]">
      <div class="flex-1 flex flex-col min-h-0">
        <div class="flex gap-2 mb-3">
          <input
            v-model="search"
            placeholder="Buscar producto o SKU..."
            class="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            @keyup.enter="loadProducts"
          />
          <select v-model="categoryFilter" class="px-3 py-2 border rounded-lg" @change="loadProducts">
            <option value="">Todas</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          <button
            v-for="p in filtered"
            :key="p.id"
            :disabled="processing"
            class="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-primary-500 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            @click="cart.addProduct(p)"
          >
            <p class="font-semibold text-sm leading-tight">{{ p.name }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ p.sku }}</p>
            <div class="flex justify-between items-end mt-2">
              <span class="text-primary-600 font-bold">{{ formatMoney(Number(p.salePrice)) }}</span>
              <span class="text-xs text-slate-400">{{ p.sellableUnits ?? p.stock }} disp.</span>
            </div>
          </button>
          <div v-if="!loading && filtered.length === 0" class="col-span-full text-center text-slate-400 py-12">
            No hay productos disponibles
          </div>
        </div>
      </div>

      <div class="hidden lg:flex flex-col w-96 bg-white border border-slate-200 rounded-xl shrink-0">
        <CartPanel :customers="customers" :processing="processing" @checkout="checkout" />
      </div>
    </div>

    <button
      class="lg:hidden fixed bottom-20 right-4 bg-primary-600 text-white rounded-full w-16 h-16 shadow-lg flex items-center justify-center z-20"
      @click="showCart = true"
    >
      <span class="text-2xl">🛒</span>
      <span v-if="cart.itemCount" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">{{ cart.itemCount }}</span>
    </button>

    <div v-if="showCart" class="lg:hidden fixed inset-0 z-40">
      <div class="absolute inset-0 bg-black/40" @click="showCart = false" />
      <div class="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="font-semibold">Carrito</h3>
          <button @click="showCart = false">&times;</button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <CartPanel :customers="customers" :processing="processing" @checkout="checkout(); showCart = false" />
        </div>
      </div>
    </div>

    <AppModal :show="showSuccess" title="Venta completada" size="lg" @close="closeSuccess">
      <div v-if="lastSale && ticketSettings" class="space-y-4">
        <div class="flex items-center justify-center gap-2 text-emerald-600 mb-2">
          <span class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">✓</span>
          <div>
            <p class="font-semibold text-slate-900">Pago registrado</p>
            <p class="text-2xl font-bold">{{ formatMoney(Number(lastSale.total)) }}</p>
          </div>
        </div>

        <div class="bg-slate-100 rounded-xl p-4 overflow-y-auto max-h-[55vh]">
          <TicketPrint ref="ticketRef" :sale="lastSale" :settings="ticketSettings" preview />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="closeSuccess">Continuar vendiendo</button>
        <button class="btn-primary" @click="printTicket">🖨 Imprimir recibo</button>
      </template>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
