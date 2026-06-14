<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/api/client'
import PageHeader from '@/components/PageHeader.vue'
import AppModal from '@/components/AppModal.vue'
import StatCard from '@/components/StatCard.vue'
import Toast from '@/components/Toast.vue'
import type { Supplier, Product } from '@/types'
import { formatMoney, formatDate, toNumber } from '@/utils/format'

interface PurchaseItem { productId: number; quantity: number; unitCost: number }
interface Purchase {
  id: number
  invoiceNumber?: string
  total: number
  notes?: string
  createdAt: string
  supplier: Supplier
  user?: { name: string }
  items: { product: Product; quantity: number; unitCost: number; subtotal: number }[]
}

const purchases = ref<Purchase[]>([])
const suppliers = ref<Supplier[]>([])
const products = ref<Product[]>([])
const loading = ref(true)
const showModal = ref(false)
const showDetailModal = ref(false)
const selectedPurchase = ref<Purchase | null>(null)
const supplierFilter = ref<number | ''>('')
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const form = ref({
  supplierId: 0,
  invoiceNumber: '',
  notes: '',
  items: [{ productId: 0, quantity: 1, unitCost: 0 }] as PurchaseItem[],
})

const totalPurchases = computed(() => purchases.value.length)
const totalSpent = computed(() =>
  purchases.value.reduce((sum, p) => sum + toNumber(p.total), 0),
)
const purchasableProducts = computed(() =>
  products.value.filter((p) => p.productType === 'simple' || p.productType === 'bulk'),
)
const formTotal = computed(() =>
  form.value.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
)

async function load() {
  loading.value = true
  try {
    const params: Record<string, number> = { limit: 50 }
    if (supplierFilter.value) params.supplierId = supplierFilter.value
    const [purRes, supRes, prodRes] = await Promise.all([
      api.get('/purchases', { params }),
      api.get('/suppliers', { params: { limit: 100 } }),
      api.get('/products', { params: { limit: 100 } }),
    ])
    purchases.value = purRes.data.data
    suppliers.value = supRes.data.data
    products.value = prodRes.data.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = {
    supplierId: supplierFilter.value ? Number(supplierFilter.value) : 0,
    invoiceNumber: '',
    notes: '',
    items: [{ productId: 0, quantity: 1, unitCost: 0 }],
  }
  showModal.value = true
}

function addItem() {
  form.value.items.push({ productId: 0, quantity: 1, unitCost: 0 })
}

function removeItem(idx: number) {
  if (form.value.items.length > 1) form.value.items.splice(idx, 1)
}

function onProductChange(idx: number) {
  const item = form.value.items[idx]
  const product = products.value.find((p) => p.id === item.productId)
  if (product && item.unitCost === 0) {
    item.unitCost = toNumber(product.costPrice)
  }
}

function viewDetail(purchase: Purchase) {
  selectedPurchase.value = purchase
  showDetailModal.value = true
}

async function save() {
  if (!form.value.supplierId) {
    toast.value = { show: true, message: 'Selecciona un proveedor', type: 'error' }
    return
  }
  if (form.value.items.some((i) => !i.productId || i.quantity <= 0)) {
    toast.value = { show: true, message: 'Completa todos los productos', type: 'error' }
    return
  }
  try {
    await api.post('/purchases', form.value)
    showModal.value = false
    toast.value = { show: true, message: 'Compra registrada correctamente', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al registrar'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

watch(supplierFilter, load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Compras a proveedores" subtitle="Registro de pedidos e ingreso de mercancía">
      <template #actions>
        <button class="btn-primary" @click="openCreate">+ Registrar compra</button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard title="Compras registradas" :value="totalPurchases" icon="◉" color="brand" />
      <StatCard title="Total comprado" :value="formatMoney(totalSpent)" icon="💰" color="amber" />
      <StatCard title="Proveedores" :value="suppliers.length" icon="▥" color="blue" />
    </div>

    <div class="card overflow-hidden">
      <div class="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 class="font-semibold text-slate-900">Historial de compras</h3>
        <select v-model="supplierFilter" class="input !w-auto !py-2 text-sm">
          <option value="">Todos los proveedores</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>

      <div v-if="loading" class="p-12 text-center text-slate-400">Cargando compras...</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-6 py-3 font-medium">#</th>
              <th class="text-left px-6 py-3 font-medium">Proveedor</th>
              <th class="text-left px-6 py-3 font-medium hidden sm:table-cell">Factura</th>
              <th class="text-left px-6 py-3 font-medium">Fecha</th>
              <th class="text-right px-6 py-3 font-medium hidden md:table-cell">Productos</th>
              <th class="text-right px-6 py-3 font-medium">Total</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="purchases.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                No hay compras registradas
              </td>
            </tr>
            <tr
              v-for="p in purchases"
              :key="p.id"
              class="hover:bg-slate-50/80 transition-colors cursor-pointer"
              @click="viewDetail(p)"
            >
              <td class="px-6 py-4 font-mono text-brand-700 font-medium">#{{ p.id }}</td>
              <td class="px-6 py-4">
                <p class="font-medium text-slate-900">{{ p.supplier?.name }}</p>
                <p v-if="p.user" class="text-xs text-slate-400 hidden lg:block">Por {{ p.user.name }}</p>
              </td>
              <td class="px-6 py-4 text-slate-500 hidden sm:table-cell">{{ p.invoiceNumber || '—' }}</td>
              <td class="px-6 py-4 text-slate-500 whitespace-nowrap">{{ formatDate(p.createdAt) }}</td>
              <td class="px-6 py-4 text-right tabular-nums hidden md:table-cell">{{ p.items?.length ?? 0 }}</td>
              <td class="px-6 py-4 text-right font-semibold text-emerald-700 tabular-nums">
                {{ formatMoney(p.total) }}
              </td>
              <td class="px-6 py-4 text-right">
                <button class="text-brand-600 text-xs font-medium hover:underline" @click.stop="viewDetail(p)">
                  Ver
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal registrar -->
    <AppModal :show="showModal" title="Registrar compra" size="lg" @close="showModal = false">
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-slate-700">Proveedor *</label>
            <select v-model.number="form.supplierId" class="input mt-1.5">
              <option :value="0" disabled>Seleccionar proveedor...</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700">No. Factura</label>
            <input v-model="form.invoiceNumber" class="input mt-1.5" placeholder="Ej. FEV-12345" />
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-700">Notas</label>
          <input v-model="form.notes" class="input mt-1.5" placeholder="Observaciones del pedido..." />
        </div>

        <div class="border-t border-slate-200 pt-4">
          <p class="text-sm font-medium text-slate-700 mb-3">Productos</p>
          <div class="space-y-3">
            <div
              v-for="(item, idx) in form.items"
              :key="idx"
              class="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded-xl p-3"
            >
              <div class="col-span-12 sm:col-span-5">
                <label class="text-xs text-slate-500">Producto</label>
                <select
                  v-model.number="item.productId"
                  class="input mt-1 !py-2 text-sm"
                  @change="onProductChange(idx)"
                >
                  <option :value="0" disabled>Seleccionar...</option>
                  <option v-for="p in purchasableProducts" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.sku }}){{ p.productType === 'bulk' ? ` — ${p.stockUnit}` : '' }}
                  </option>
                </select>
              </div>
              <div class="col-span-4 sm:col-span-2">
                <label class="text-xs text-slate-500">Cantidad</label>
                <input v-model.number="item.quantity" type="number" min="0.001" step="0.001" class="input mt-1 !py-2 text-sm" />
              </div>
              <div class="col-span-5 sm:col-span-3">
                <label class="text-xs text-slate-500">Costo unit.</label>
                <input v-model.number="item.unitCost" type="number" min="0" step="1" class="input mt-1 !py-2 text-sm" />
                <p v-if="item.unitCost > 0" class="text-xs text-slate-400 mt-0.5">{{ formatMoney(item.unitCost) }}</p>
              </div>
              <div class="col-span-3 sm:col-span-2 flex items-end justify-end pb-1">
                <button
                  v-if="form.items.length > 1"
                  class="text-red-400 hover:text-red-600 text-sm"
                  @click="removeItem(idx)"
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
          <button class="text-brand-600 text-sm font-medium mt-3 hover:underline" @click="addItem">
            + Agregar producto
          </button>
        </div>

        <div class="bg-emerald-50 rounded-xl p-4 flex justify-between items-center">
          <span class="text-sm font-medium text-emerald-800">Total de la compra</span>
          <span class="text-xl font-bold text-emerald-700">{{ formatMoney(formTotal) }}</span>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showModal = false">Cancelar</button>
        <button class="btn-primary" @click="save">Registrar compra</button>
      </template>
    </AppModal>

    <!-- Modal detalle -->
    <AppModal
      :show="showDetailModal"
      :title="`Compra #${selectedPurchase?.id}`"
      size="lg"
      @close="showDetailModal = false"
    >
      <template v-if="selectedPurchase">
        <div class="grid grid-cols-2 gap-3 mb-6 text-sm">
          <div><span class="text-slate-500">Proveedor:</span> <strong>{{ selectedPurchase.supplier?.name }}</strong></div>
          <div><span class="text-slate-500">Factura:</span> <strong>{{ selectedPurchase.invoiceNumber || '—' }}</strong></div>
          <div><span class="text-slate-500">Fecha:</span> <strong>{{ formatDate(selectedPurchase.createdAt) }}</strong></div>
          <div><span class="text-slate-500">Registrado por:</span> <strong>{{ selectedPurchase.user?.name || '—' }}</strong></div>
        </div>
        <p v-if="selectedPurchase.notes" class="text-sm text-slate-500 mb-4 bg-slate-50 rounded-lg p-3">
          {{ selectedPurchase.notes }}
        </p>

        <h4 class="font-semibold text-slate-900 mb-3">Productos ({{ selectedPurchase.items.length }})</h4>
        <div class="border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div
            v-for="(item, i) in selectedPurchase.items"
            :key="i"
            class="flex justify-between items-center px-4 py-3 text-sm hover:bg-slate-50"
          >
            <div>
              <p class="font-medium">{{ item.product?.name }}</p>
              <p class="text-xs text-slate-400">{{ item.quantity }} uds × {{ formatMoney(item.unitCost) }}</p>
            </div>
            <p class="font-semibold tabular-nums">{{ formatMoney(item.subtotal) }}</p>
          </div>
        </div>

        <div class="mt-4 flex justify-between items-center pt-4 border-t border-slate-200">
          <span class="font-medium text-slate-700">Total</span>
          <span class="text-xl font-bold text-emerald-700">{{ formatMoney(selectedPurchase.total) }}</span>
        </div>
      </template>
      <template #footer>
        <button class="btn-secondary" @click="showDetailModal = false">Cerrar</button>
      </template>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
