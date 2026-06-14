<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { formatMoney, formatDate, formatStock, formatQuantity, formatMovementQty, formatMovementStock, stockUnitLabel } from '@/utils/format'
import type { Product, Category } from '@/types'

interface Movement {
  id: number
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  reference?: string
  notes?: string
  createdAt: string
  product: Product
  user?: { name: string }
}

interface MovementGroup {
  id: string
  createdAt: string
  type: string
  reference?: string
  movements: Movement[]
}

interface InventorySummary {
  totalProducts: number
  totalUnits: number
  bulkInsumos?: number
  inventoryCost: number
  inventoryRetail: number
}

const tab = ref<'stock' | 'movements'>('stock')
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const lowStock = ref<Product[]>([])
const movements = ref<Movement[]>([])
const summary = ref<InventorySummary | null>(null)
const loading = ref(true)
const showModal = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const search = ref('')
const categoryFilter = ref<number | ''>('')
const statusFilter = ref<'all' | 'ok' | 'low' | 'out'>('all')
const movementProductFilter = ref<number | ''>('')

const form = ref({ productId: 0, type: 'adjustment_in', quantity: 1, notes: '' })

const typeLabels: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment_in: 'Entrada',
  adjustment_out: 'Salida',
}

const typeStyles: Record<string, string> = {
  sale: 'bg-red-100 text-red-700',
  purchase: 'bg-green-100 text-green-700',
  adjustment_in: 'bg-blue-100 text-blue-700',
  adjustment_out: 'bg-orange-100 text-orange-700',
}

function stockStatus(p: Product): 'ok' | 'low' | 'out' {
  const stock = Number(p.stock)
  const min = Number(p.minStock)
  if (p.productType === 'portion' || p.productType === 'composite') {
    const avail = p.sellableUnits ?? 0
    if (avail <= 0) return 'out'
    return 'ok'
  }
  if (stock <= 0) return 'out'
  if (stock <= min) return 'low'
  return 'ok'
}

function stockLabel(p: Product): string {
  if (p.productType === 'portion' || p.productType === 'composite') {
    return `${p.sellableUnits ?? 0} disp.`
  }
  return formatStock(p.stock, p.stockUnit)
}

const adjustableProducts = computed(() =>
  products.value.filter((p) => p.productType === 'simple' || p.productType === 'bulk'),
)

const statusLabels = { ok: 'Normal', low: 'Bajo', out: 'Agotado' }
const statusStyles = {
  ok: 'bg-green-100 text-green-700',
  low: 'bg-amber-100 text-amber-700',
  out: 'bg-red-100 text-red-700',
}

const filteredProducts = computed(() => {
  let list = products.value
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }
  if (categoryFilter.value) {
    list = list.filter((p) => p.categoryId === categoryFilter.value)
  }
  if (statusFilter.value !== 'all') {
    list = list.filter((p) => stockStatus(p) === statusFilter.value)
  }
  return list
})

const filteredMovements = computed(() => {
  if (!movementProductFilter.value) return movements.value
  return movements.value.filter((m) => m.product?.id === movementProductFilter.value)
})

const movementGroups = computed((): MovementGroup[] => {
  const list = filteredMovements.value
  const groups: MovementGroup[] = []
  const usedRefs = new Set<string>()

  for (const m of list) {
    if (m.type === 'sale' && m.reference && !usedRefs.has(m.reference)) {
      const related = list.filter((x) => x.reference === m.reference && x.type === 'sale')
      if (related.length > 1) {
        usedRefs.add(m.reference)
        groups.push({
          id: m.reference,
          createdAt: m.createdAt,
          type: m.type,
          reference: m.reference,
          movements: related,
        })
        continue
      }
    }
    if (m.reference && usedRefs.has(m.reference)) continue
    groups.push({
      id: String(m.id),
      createdAt: m.createdAt,
      type: m.type,
      reference: m.reference,
      movements: [m],
    })
  }
  return groups
})

function isOutflow(type: string): boolean {
  return type === 'sale' || type === 'adjustment_out'
}

function productUnit(m: Movement): string {
  return m.product?.stockUnit ?? 'unit'
}

function stockPercent(p: Product) {
  const stock = Number(p.stock)
  const min = Number(p.minStock)
  if (min <= 0) return stock > 0 ? 100 : 0
  return Math.min(100, Math.round((stock / (min * 2)) * 100))
}

function stockBarColor(p: Product) {
  const s = stockStatus(p)
  if (s === 'out') return 'bg-red-500'
  if (s === 'low') return 'bg-amber-500'
  return 'bg-green-500'
}

function openAdjust(product?: Product) {
  form.value = {
    productId: product?.id ?? 0,
    type: 'adjustment_in',
    quantity: 1,
    notes: '',
  }
  showModal.value = true
}

async function load() {
  loading.value = true
  try {
    const [reportRes, lowRes, movRes, catRes] = await Promise.all([
      api.get('/reports/inventory'),
      api.get('/products/low-stock'),
      api.get('/inventory/movements', { params: { limit: 50 } }),
      api.get('/categories/active'),
    ])
    products.value = reportRes.data.products
    summary.value = reportRes.data.summary
    lowStock.value = lowRes.data
    movements.value = movRes.data.data
    categories.value = catRes.data
  } finally {
    loading.value = false
  }
}

async function adjust() {
  if (!form.value.productId) {
    toast.value = { show: true, message: 'Selecciona un producto', type: 'error' }
    return
  }
  try {
    await api.post('/inventory/adjust', form.value)
    showModal.value = false
    toast.value = { show: true, message: 'Ajuste registrado correctamente', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al ajustar'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Inventario" subtitle="Control de stock y movimientos">
      <template #actions>
        <button class="btn-primary" @click="openAdjust()">+ Ajustar stock</button>
      </template>
    </PageHeader>

    <!-- Stats -->
    <div v-if="summary" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Productos" :value="summary.totalProducts" icon="📦" color="blue" />
      <StatCard
        title="Unidades en stock"
        :value="formatQuantity(summary.totalUnits)"
        :trend="summary.bulkInsumos ? `${summary.bulkInsumos} insumos base (g/ml)` : undefined"
        icon="📊"
        color="brand"
      />
      <StatCard title="Valor costo" :value="formatMoney(summary.inventoryCost)" icon="💰" color="amber" />
      <StatCard title="Stock bajo" :value="lowStock.length" icon="⚠️" color="red" />
    </div>

    <!-- Low stock alert -->
    <div
      v-if="lowStock.length"
      class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-5"
    >
      <div class="flex items-start gap-3">
        <span class="text-2xl">⚠️</span>
        <div class="flex-1">
          <h3 class="font-semibold text-red-800">
            {{ lowStock.length }} producto{{ lowStock.length > 1 ? 's' : '' }} con stock bajo
          </h3>
          <p class="text-sm text-red-600/80 mt-0.5">Revisa y repone estos productos pronto</p>
          <div class="flex flex-wrap gap-2 mt-3">
            <button
              v-for="p in lowStock"
              :key="p.id"
              class="text-sm bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
              @click="openAdjust(p)"
            >
              {{ p.name }}
              <span class="text-red-600 font-medium ml-1">{{ stockLabel(p) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
      <button
        :class="['px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'stock' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700']"
        @click="tab = 'stock'"
      >
        Stock actual
      </button>
      <button
        :class="['px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'movements' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700']"
        @click="tab = 'movements'"
      >
        Movimientos
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400">
      <div class="text-center">
        <div class="text-3xl mb-2 animate-pulse">📋</div>
        Cargando inventario...
      </div>
    </div>

    <!-- Stock tab -->
    <div v-else-if="tab === 'stock'" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3">
        <input
          v-model="search"
          placeholder="Buscar por nombre o SKU..."
          class="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
        <select v-model="categoryFilter" class="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="">Todas las categorías</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="statusFilter" class="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="all">Todos los estados</option>
          <option value="ok">Stock normal</option>
          <option value="low">Stock bajo</option>
          <option value="out">Agotado</option>
        </select>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-4 py-3 font-medium">Producto</th>
              <th class="text-left px-4 py-3 font-medium hidden md:table-cell">Categoría</th>
              <th class="text-left px-4 py-3 font-medium">Nivel</th>
              <th class="text-right px-4 py-3 font-medium">Stock</th>
              <th class="text-right px-4 py-3 font-medium hidden sm:table-cell">Mín.</th>
              <th class="text-right px-4 py-3 font-medium hidden lg:table-cell">Valor</th>
              <th class="text-center px-4 py-3 font-medium">Estado</th>
              <th class="text-right px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredProducts.length === 0">
              <td colspan="8" class="px-4 py-12 text-center text-slate-400">No se encontraron productos</td>
            </tr>
            <tr
              v-for="p in filteredProducts"
              :key="p.id"
              class="border-t border-slate-100 hover:bg-slate-50/80 transition-colors"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-slate-800">{{ p.name }}</p>
                <p class="text-xs text-slate-400 font-mono">{{ p.sku }}</p>
              </td>
              <td class="px-4 py-3 text-slate-500 hidden md:table-cell">{{ p.category?.name || '—' }}</td>
              <td class="px-4 py-3 min-w-[120px]">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      :class="['h-full rounded-full transition-all', stockBarColor(p)]"
                      :style="{ width: stockPercent(p) + '%' }"
                    />
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ stockLabel(p) }}</td>
              <td class="px-4 py-3 text-right text-slate-400 tabular-nums hidden sm:table-cell">
                {{ p.productType === 'bulk' || p.productType === 'simple' ? formatStock(p.minStock, p.stockUnit) : '—' }}
              </td>
              <td class="px-4 py-3 text-right text-slate-600 hidden lg:table-cell tabular-nums">
                {{ formatMoney(Number(p.costPrice) * Number(p.stock)) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="['text-xs font-medium px-2.5 py-1 rounded-full', statusStyles[stockStatus(p)]]">
                  {{ statusLabels[stockStatus(p)] }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="p.productType === 'simple' || p.productType === 'bulk'"
                  class="text-primary-600 hover:text-primary-700 text-xs font-medium hover:underline"
                  @click="openAdjust(p)"
                >
                  Ajustar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
        {{ filteredProducts.length }} de {{ products.length }} productos
      </div>
    </div>

    <!-- Movements tab -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="p-4 border-b border-slate-100">
        <select v-model="movementProductFilter" class="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full sm:w-64">
          <option value="">Todos los productos</option>
          <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-4 py-3 font-medium">Fecha</th>
              <th class="text-left px-4 py-3 font-medium">Producto</th>
              <th class="text-left px-4 py-3 font-medium hidden lg:table-cell">Unidad</th>
              <th class="text-left px-4 py-3 font-medium">Tipo</th>
              <th class="text-right px-4 py-3 font-medium">Cantidad</th>
              <th class="text-right px-4 py-3 font-medium hidden sm:table-cell">Stock</th>
              <th class="text-left px-4 py-3 font-medium hidden md:table-cell">Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="movementGroups.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-slate-400">Sin movimientos registrados</td>
            </tr>
            <template v-for="group in movementGroups" :key="group.id">
              <tr
                v-if="group.movements.length > 1"
                class="border-t border-slate-200 bg-slate-50/80"
              >
                <td class="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs font-medium">
                  {{ formatDate(group.createdAt) }}
                </td>
                <td class="px-4 py-2.5 text-slate-700 text-xs font-semibold" colspan="2">
                  Venta · {{ group.movements.length }} insumos descontados
                </td>
                <td class="px-4 py-2.5">
                  <span :class="['text-xs font-medium px-2.5 py-1 rounded-full', typeStyles[group.type] || 'bg-slate-100 text-slate-600']">
                    {{ typeLabels[group.type] || group.type }}
                  </span>
                </td>
                <td colspan="3" />
              </tr>
              <tr
                v-for="m in group.movements"
                :key="m.id"
                :class="[
                  'border-t border-slate-100 hover:bg-slate-50/80',
                  group.movements.length > 1 ? 'bg-white' : '',
                ]"
              >
                <td class="px-4 py-3 text-slate-500 whitespace-nowrap">
                  <span v-if="group.movements.length === 1">{{ formatDate(m.createdAt) }}</span>
                  <span v-else class="pl-3 text-slate-300">↳</span>
                </td>
                <td class="px-4 py-3" :class="group.movements.length > 1 ? 'pl-8' : ''">
                  <p class="font-medium">{{ m.product?.name }}</p>
                  <p class="text-xs text-slate-400 font-mono">{{ m.product?.sku }}</p>
                </td>
                <td class="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                  {{ stockUnitLabel(productUnit(m)) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="group.movements.length === 1"
                    :class="['text-xs font-medium px-2.5 py-1 rounded-full', typeStyles[m.type] || 'bg-slate-100 text-slate-600']"
                  >
                    {{ typeLabels[m.type] || m.type }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">
                  <span :class="isOutflow(m.type) ? 'text-red-600' : 'text-green-600'">
                    {{ formatMovementQty(m.quantity, productUnit(m), isOutflow(m.type)) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right text-slate-500 tabular-nums hidden sm:table-cell text-xs">
                  {{ formatMovementStock(m.stockBefore, m.stockAfter, productUnit(m)) }}
                </td>
                <td class="px-4 py-3 text-slate-400 text-xs hidden md:table-cell truncate max-w-[200px]">
                  {{ m.notes || '—' }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Adjust modal -->
    <AppModal title="Ajustar inventario" :show="showModal" @close="showModal = false">
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-slate-700">Producto</label>
          <select v-model.number="form.productId" class="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
            <option :value="0" disabled>Seleccionar producto...</option>
            <option v-for="p in adjustableProducts" :key="p.id" :value="p.id">
              {{ p.name }} — Stock actual: {{ stockLabel(p) }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-slate-700">Tipo de movimiento</label>
            <select v-model="form.type" class="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
              <option value="adjustment_in">Entrada (+)</option>
              <option value="adjustment_out">Salida (-)</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-slate-700">Cantidad</label>
            <input
              v-model.number="form.quantity"
              type="number"
              min="0.001"
              step="0.001"
              class="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Notas (opcional)</label>
          <input
            v-model="form.notes"
            placeholder="Ej: Conteo físico, merma, devolución..."
            class="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
          />
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 text-slate-600 hover:text-slate-800" @click="showModal = false">Cancelar</button>
        <button class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium" @click="adjust">
          Aplicar ajuste
        </button>
      </template>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
