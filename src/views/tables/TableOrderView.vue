<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import ProductOptionsModal from '@/components/ProductOptionsModal.vue'
import TicketPrint from '@/components/TicketPrint.vue'
import Toast from '@/components/Toast.vue'
import { useAppStore } from '@/stores/app'
import type { Category, Customer, Product, Sale, Setting, TableOrder } from '@/types'
import { formatMoney } from '@/utils/format'
import { printHtmlElement } from '@/utils/printTicket'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const orderId = computed(() => Number(route.params.orderId))

const order = ref<TableOrder | null>(null)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const customers = ref<Customer[]>([])
const search = ref('')
const categoryFilter = ref<number | ''>('')
const loading = ref(true)
const processing = ref(false)
const optionsProduct = ref<Product | null>(null)
const showOptions = ref(false)
const showCheckout = ref(false)
const showSuccess = ref(false)
const lastSale = ref<Sale | null>(null)
const ticketSettings = ref<Setting | null>(null)
const ticketRef = ref<InstanceType<typeof TicketPrint> | null>(null)
const checkoutForm = ref({
  customerId: null as number | null,
  paymentMethod: 'cash' as 'cash' | 'card' | 'mixed',
  amountPaid: 0,
})
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const filteredProducts = computed(() => {
  let list = products.value
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }
  if (categoryFilter.value) list = list.filter((p) => p.categoryId === categoryFilter.value)
  return list
})

const canCheckout = computed(() => !!order.value?.items.length && !processing.value)

async function load() {
  loading.value = true
  try {
    const [orderRes, prodRes, catRes, custRes] = await Promise.all([
      api.get<TableOrder>(`/tables/orders/${orderId.value}`),
      api.get<Product[]>('/products/pos'),
      api.get<Category[]>('/categories/active'),
      api.get('/customers', { params: { limit: 100 } }),
    ])
    order.value = orderRes.data
    products.value = prodRes.data
    categories.value = catRes.data
    customers.value = custRes.data.data
    checkoutForm.value.customerId = orderRes.data.customerId ?? null
    checkoutForm.value.amountPaid = Number(orderRes.data.total ?? 0)
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo cargar la mesa', type: 'error' }
  } finally {
    loading.value = false
  }
}

function sellableCount(p: Product): number {
  return Number(p.sellableUnits ?? p.stock ?? 0)
}

function isAvailable(p: Product): boolean {
  return sellableCount(p) > 0
}

function hasConfigurableOptions(p: Product): boolean {
  if ((p.optionGroups?.length ?? 0) > 0) return true
  return p.productType === 'portion' && (p.scoopCount ?? 0) > 0
}

async function addProduct(product: Product) {
  if (processing.value) return
  if (!isAvailable(product)) {
    toast.value = { show: true, message: 'Sin stock disponible para vender', type: 'error' }
    return
  }

  let detailed = product
  if (hasConfigurableOptions(product)) {
    try {
      const { data } = await api.get<Product>(`/products/${product.id}`)
      detailed = data
      const idx = products.value.findIndex((p) => p.id === product.id)
      if (idx >= 0) products.value[idx] = { ...products.value[idx], ...data }
    } catch {
      toast.value = { show: true, message: 'No se pudieron cargar las opciones', type: 'error' }
      return
    }
  }

  if (detailed.optionGroups?.length) {
    optionsProduct.value = detailed
    showOptions.value = true
    return
  }

  if (detailed.productType === 'portion' && detailed.scoopCount) {
    toast.value = {
      show: true,
      message: 'Este producto no tiene envases configurados.',
      type: 'error',
    }
    return
  }

  await persistItem({ productId: detailed.id })
}

async function persistItem(payload: {
  productId: number
  selectedOptionIds?: number[]
  optionLabel?: string
  portionScoopCount?: number
}) {
  processing.value = true
  try {
    const { data } = await api.post<TableOrder>(`/tables/orders/${orderId.value}/items`, payload)
    order.value = data
    checkoutForm.value.amountPaid = Number(data.total ?? 0)
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo agregar el producto', type: 'error' }
  } finally {
    processing.value = false
  }
}

async function onOptionsConfirm(
  selectedOptionIds: number[],
  label: string,
  _unitPrice: number,
  portionScoopCount?: number,
) {
  if (!optionsProduct.value) return
  showOptions.value = false
  await persistItem({
    productId: optionsProduct.value.id,
    selectedOptionIds,
    optionLabel: label,
    portionScoopCount,
  })
  optionsProduct.value = null
}

async function updateQuantity(itemId: number, quantity: number) {
  if (quantity <= 0) {
    await removeItem(itemId)
    return
  }
  processing.value = true
  try {
    const { data } = await api.patch<TableOrder>(
      `/tables/orders/${orderId.value}/items/${itemId}`,
      { quantity },
    )
    order.value = data
    checkoutForm.value.amountPaid = Number(data.total ?? 0)
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo actualizar el producto', type: 'error' }
  } finally {
    processing.value = false
  }
}

async function removeItem(itemId: number) {
  processing.value = true
  try {
    const { data } = await api.delete<TableOrder>(`/tables/orders/${orderId.value}/items/${itemId}`)
    order.value = data
    checkoutForm.value.amountPaid = Number(data.total ?? 0)
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo quitar el producto', type: 'error' }
  } finally {
    processing.value = false
  }
}

function openCheckout() {
  if (!app.cashSession) {
    toast.value = { show: true, message: 'Debes abrir la caja primero', type: 'error' }
    return
  }
  checkoutForm.value.amountPaid = Number(order.value?.total ?? 0)
  showCheckout.value = true
}

async function closeOrder() {
  if (!order.value) return
  processing.value = true
  try {
    const { data } = await api.post<{ sale: Sale }>(`/tables/orders/${order.value.id}/close`, {
      customerId: checkoutForm.value.customerId || undefined,
      paymentMethod: checkoutForm.value.paymentMethod,
      amountPaid: checkoutForm.value.paymentMethod === 'card'
        ? undefined
        : checkoutForm.value.amountPaid,
    })
    const ticketRes = await api.get(`/sales/${data.sale.id}/ticket`)
    lastSale.value = ticketRes.data.sale
    ticketSettings.value = ticketRes.data.settings
    showCheckout.value = false
    showSuccess.value = true
    await app.fetchCashSession()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo cobrar la mesa', type: 'error' }
  } finally {
    processing.value = false
  }
}

function printTicket() {
  const el = ticketRef.value?.$el as HTMLElement | undefined
  if (el) printHtmlElement(el)
}

function finishSuccess() {
  showSuccess.value = false
  router.push('/tables')
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <button class="text-sm text-slate-500 hover:text-slate-800 mb-2" @click="router.push('/tables')">
          ← Volver a mesas
        </button>
        <h1 class="text-2xl font-bold text-slate-900">
          {{ order?.table?.name ?? 'Mesa' }}
        </h1>
        <p class="text-sm text-slate-500">Cuenta abierta · agrega productos y cobra al final</p>
      </div>
      <button
        class="btn-primary"
        :disabled="!canCheckout"
        @click="openCheckout"
      >
        Cobrar mesa {{ order ? formatMoney(order.total) : '' }}
      </button>
    </div>

    <div v-if="loading" class="text-center text-slate-400 py-16">Cargando cuenta...</div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-5">
      <section class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <div class="flex flex-col md:flex-row gap-3">
            <input
              v-model="search"
              placeholder="Buscar producto..."
              class="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select v-model="categoryFilter" class="px-4 py-2 border border-slate-300 rounded-lg md:w-56">
              <option value="">Todas las categorías</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3">
          <button
            v-for="p in filteredProducts"
            :key="p.id"
            class="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-primary-300 hover:shadow-sm transition disabled:opacity-50"
            :disabled="processing || !isAvailable(p)"
            @click="addProduct(p)"
          >
            <p class="font-semibold text-sm text-slate-900 line-clamp-2">{{ p.name }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ p.sku }}</p>
            <div class="flex justify-between items-end mt-4">
              <span class="font-bold text-primary-700">{{ formatMoney(Number(p.salePrice)) }}</span>
              <span class="text-[11px]" :class="isAvailable(p) ? 'text-emerald-600' : 'text-red-500'">
                {{ isAvailable(p) ? `${sellableCount(p)} disp.` : 'Agotado' }}
              </span>
            </div>
          </button>
        </div>
      </section>

      <aside class="bg-white border border-slate-200 rounded-2xl xl:sticky xl:top-4 xl:h-[calc(100dvh-8rem)] flex flex-col min-h-[520px]">
        <div class="p-4 border-b border-slate-100">
          <h2 class="font-bold text-slate-900">Cuenta</h2>
          <p class="text-xs text-slate-500">{{ order?.itemCount ?? 0 }} producto{{ order?.itemCount === 1 ? '' : 's' }}</p>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          <div v-if="!order?.items.length" class="text-center text-slate-400 text-sm py-12">
            Agrega productos a la mesa
          </div>
          <div
            v-for="item in order?.items ?? []"
            :key="item.id"
            class="bg-slate-50 rounded-xl p-3 flex gap-2"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{{ item.productName }}</p>
              <p v-if="item.optionLabel" class="text-xs text-slate-400 truncate">{{ item.optionLabel }}</p>
              <p class="text-xs text-slate-500">
                {{ formatMoney(item.unitPrice) }} · {{ formatMoney(Number(item.unitPrice) * Number(item.quantity)) }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <button :disabled="processing" class="w-7 h-7 bg-white border rounded" @click="updateQuantity(item.id, item.quantity - 1)">-</button>
              <span class="w-7 text-center text-sm font-medium">{{ item.quantity }}</span>
              <button :disabled="processing" class="w-7 h-7 bg-white border rounded" @click="updateQuantity(item.id, item.quantity + 1)">+</button>
            </div>
            <button :disabled="processing" class="text-red-400 px-1" @click="removeItem(item.id)">&times;</button>
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 space-y-3">
          <div class="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span class="text-primary-700">{{ formatMoney(order?.total ?? 0) }}</span>
          </div>
          <button
            class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-50"
            :disabled="!canCheckout"
            @click="openCheckout"
          >
            Cobrar mesa
          </button>
        </div>
      </aside>
    </div>

    <ProductOptionsModal
      :show="showOptions"
      :product="optionsProduct"
      @close="showOptions = false"
      @confirm="onOptionsConfirm"
    />

    <AppModal title="Cobrar mesa" :show="showCheckout" @close="showCheckout = false">
      <div class="space-y-4">
        <select v-model="checkoutForm.customerId" class="w-full px-3 py-2 border rounded-lg text-sm">
          <option :value="null">Cliente general</option>
          <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="checkoutForm.paymentMethod" class="w-full px-3 py-2 border rounded-lg text-sm">
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="mixed">Mixto</option>
        </select>
        <div v-if="checkoutForm.paymentMethod !== 'card'">
          <label class="text-xs text-slate-500">Monto recibido</label>
          <input v-model.number="checkoutForm.amountPaid" type="number" step="0.01" class="w-full px-3 py-2 border rounded-lg" />
          <p v-if="checkoutForm.amountPaid > (order?.total ?? 0)" class="text-sm text-green-600 mt-1">
            Cambio: {{ formatMoney(checkoutForm.amountPaid - (order?.total ?? 0)) }}
          </p>
        </div>
        <div class="flex justify-between text-xl font-bold border-t pt-3">
          <span>Total</span>
          <span>{{ formatMoney(order?.total ?? 0) }}</span>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 text-slate-600" @click="showCheckout = false">Cancelar</button>
        <button class="px-4 py-2 bg-green-600 text-white rounded-lg" :disabled="processing" @click="closeOrder">
          {{ processing ? 'Cobrando...' : 'Confirmar cobro' }}
        </button>
      </template>
    </AppModal>

    <AppModal title="Mesa cobrada" :show="showSuccess" @close="finishSuccess">
      <div class="text-center space-y-4">
        <div class="text-5xl">✓</div>
        <p class="text-lg font-semibold">Venta registrada</p>
        <p v-if="lastSale" class="text-slate-500">Ticket {{ lastSale.ticketNumber }} · {{ formatMoney(lastSale.total) }}</p>
        <div class="flex justify-center gap-2">
          <button class="btn-secondary" @click="printTicket">Imprimir ticket</button>
          <button class="btn-primary" @click="finishSuccess">Volver a mesas</button>
        </div>
      </div>
      <div class="hidden">
        <TicketPrint v-if="lastSale && ticketSettings" ref="ticketRef" :sale="lastSale" :settings="ticketSettings" />
      </div>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
