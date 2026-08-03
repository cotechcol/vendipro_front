<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/api/client'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import { formatMoney, formatDate, todayColombia, daysAgoColombia } from '@/utils/format'

interface SaleItemRow {
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface SaleRow {
  id: number
  ticketNumber: string
  total: number
  taxAmount?: number
  profit: number
  paymentMethod?: 'cash' | 'card' | 'mixed'
  status?: 'completed' | 'reversed'
  reverseReason?: string | null
  reversedAt?: string | null
  createdAt: string
  user?: { name: string }
  customer?: { name: string }
  items?: SaleItemRow[]
}

interface Summary {
  count: number
  revenue: number
  profit: number
  tax: number
}

const from = ref(daysAgoColombia(7))
const to = ref(todayColombia())
const statusFilter = ref<'all' | 'completed' | 'reversed'>('all')
const loading = ref(false)
const reversing = ref(false)
const sales = ref<SaleRow[]>([])
const summary = ref<Summary | null>(null)

const showReverseModal = ref(false)
const showDetailModal = ref(false)
const reverseSale = ref<SaleRow | null>(null)
const detailSale = ref<SaleRow | null>(null)
const reverseReason = ref('')
const detailLoading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  mixed: 'Mixto',
}

const filteredSales = computed(() => {
  if (statusFilter.value === 'all') return sales.value
  return sales.value.filter((s) => (s.status || 'completed') === statusFilter.value)
})

const reversedCount = computed(() =>
  sales.value.filter((s) => s.status === 'reversed').length,
)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<{ sales: SaleRow[]; summary: Summary }>('/reports/sales', {
      params: { from: from.value, to: to.value },
    })
    sales.value = data.sales
    summary.value = data.summary
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudieron cargar las ventas', type: 'error' }
  } finally {
    loading.value = false
  }
}

function openReverse(sale: SaleRow) {
  reverseSale.value = sale
  reverseReason.value = ''
  showReverseModal.value = true
}

async function confirmReverse() {
  if (!reverseSale.value) return
  reversing.value = true
  try {
    await api.post(`/sales/${reverseSale.value.id}/reverse`, {
      reason: reverseReason.value.trim() || undefined,
    })
    showReverseModal.value = false
    toast.value = {
      show: true,
      message: `Venta ${reverseSale.value.ticketNumber} anulada`,
      type: 'success',
    }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    toast.value = {
      show: true,
      message: Array.isArray(msg) ? msg.join(', ') : (msg || 'No se pudo anular la venta'),
      type: 'error',
    }
  } finally {
    reversing.value = false
  }
}

async function openDetail(sale: SaleRow) {
  showDetailModal.value = true
  detailSale.value = sale
  detailLoading.value = true
  try {
    const { data } = await api.get<SaleRow>(`/sales/${sale.id}`)
    detailSale.value = data
  } catch {
    // Mantener fila básica si falla el detalle
  } finally {
    detailLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      title="Ventas"
      subtitle="Consulta tickets y anula ventas. Solo administradores."
    >
      <template #actions>
        <div class="flex items-center gap-2 flex-wrap">
          <input v-model="from" type="date" class="input !w-auto !py-2" />
          <span class="text-slate-400">—</span>
          <input v-model="to" type="date" class="input !w-auto !py-2" />
          <button class="btn-primary !py-2" :disabled="loading" @click="load">
            {{ loading ? '...' : 'Consultar' }}
          </button>
        </div>
      </template>
    </PageHeader>

    <div v-if="summary" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard title="Ventas válidas" :value="summary.count" icon="🧾" color="brand" />
      <StatCard title="Ingresos" :value="formatMoney(summary.revenue)" icon="💵" color="blue" />
      <StatCard title="Ganancias" :value="formatMoney(summary.profit)" icon="📈" color="amber" />
      <StatCard title="Anuladas" :value="reversedCount" icon="⊘" color="red" />
    </div>

    <div class="card overflow-hidden">
      <div class="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 class="font-semibold">Listado de ventas</h3>
          <p class="text-xs text-slate-500 mt-0.5">Anular restaura inventario y saca la venta de los totales</p>
        </div>
        <select v-model="statusFilter" class="input !w-auto !py-2 text-sm">
          <option value="all">Todas</option>
          <option value="completed">Completadas</option>
          <option value="reversed">Anuladas</option>
        </select>
      </div>

      <div v-if="loading" class="py-16 text-center text-slate-400">Cargando ventas...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-5 py-3 font-medium">Ticket</th>
              <th class="text-left px-5 py-3 font-medium">Fecha</th>
              <th class="text-left px-5 py-3 font-medium hidden md:table-cell">Cajero</th>
              <th class="text-left px-5 py-3 font-medium hidden sm:table-cell">Pago</th>
              <th class="text-left px-5 py-3 font-medium">Estado</th>
              <th class="text-right px-5 py-3 font-medium">Total</th>
              <th class="text-right px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="filteredSales.length === 0">
              <td colspan="7" class="px-5 py-14 text-center text-slate-400">
                No hay ventas en el periodo seleccionado
              </td>
            </tr>
            <tr
              v-for="s in filteredSales"
              :key="s.id"
              :class="['hover:bg-slate-50/50', s.status === 'reversed' ? 'opacity-70' : '']"
            >
              <td class="px-5 py-3 font-mono text-xs text-brand-700">{{ s.ticketNumber }}</td>
              <td class="px-5 py-3 text-slate-500">{{ formatDate(s.createdAt) }}</td>
              <td class="px-5 py-3 hidden md:table-cell">{{ s.user?.name || '—' }}</td>
              <td class="px-5 py-3 hidden sm:table-cell text-slate-500">
                {{ paymentLabels[s.paymentMethod || ''] || '—' }}
              </td>
              <td class="px-5 py-3">
                <span
                  v-if="s.status === 'reversed'"
                  class="inline-flex text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-200 text-slate-600"
                  :title="s.reverseReason || ''"
                >
                  Anulada
                </span>
                <span
                  v-else
                  class="inline-flex text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                >
                  Completada
                </span>
              </td>
              <td
                class="px-5 py-3 text-right font-semibold"
                :class="s.status === 'reversed' ? 'line-through text-slate-400' : ''"
              >
                {{ formatMoney(Number(s.total)) }}
              </td>
              <td class="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                <button
                  class="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                  @click="openDetail(s)"
                >
                  Ver
                </button>
                <button
                  v-if="s.status !== 'reversed'"
                  class="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                  @click="openReverse(s)"
                >
                  Anular
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal
      :show="showReverseModal"
      title="Anular venta"
      size="sm"
      @close="showReverseModal = false"
    >
      <div v-if="reverseSale" class="space-y-4">
        <p class="text-sm text-slate-600">
          Vas a anular el ticket
          <span class="font-mono font-semibold text-brand-700">{{ reverseSale.ticketNumber }}</span>
          por {{ formatMoney(Number(reverseSale.total)) }}. Se restaurará el inventario y la venta
          dejará de contar en reportes y caja.
        </p>
        <div>
          <label class="text-sm font-medium text-slate-700">Motivo (opcional)</label>
          <input
            v-model="reverseReason"
            class="input mt-1.5"
            maxlength="500"
            placeholder="Ej. cobro duplicado, error de producto..."
          />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" :disabled="reversing" @click="showReverseModal = false">Cancelar</button>
        <button
          class="btn-primary !bg-red-600 hover:!bg-red-700"
          :disabled="reversing"
          @click="confirmReverse"
        >
          {{ reversing ? 'Anulando...' : 'Confirmar anulación' }}
        </button>
      </template>
    </AppModal>

    <AppModal
      :show="showDetailModal"
      :title="detailSale ? `Ticket ${detailSale.ticketNumber}` : 'Detalle'"
      size="md"
      @close="showDetailModal = false"
    >
      <div v-if="detailLoading" class="py-10 text-center text-slate-400">Cargando...</div>
      <div v-else-if="detailSale" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs text-slate-500">Fecha</p>
            <p class="font-medium">{{ formatDate(detailSale.createdAt) }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Estado</p>
            <p class="font-medium">{{ detailSale.status === 'reversed' ? 'Anulada' : 'Completada' }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Cajero</p>
            <p class="font-medium">{{ detailSale.user?.name || '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Pago</p>
            <p class="font-medium">{{ paymentLabels[detailSale.paymentMethod || ''] || '—' }}</p>
          </div>
        </div>

        <p v-if="detailSale.status === 'reversed' && detailSale.reverseReason" class="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
          Motivo: {{ detailSale.reverseReason }}
        </p>

        <div class="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
          <div
            v-for="(item, idx) in detailSale.items || []"
            :key="idx"
            class="flex justify-between gap-3 px-4 py-3 text-sm"
          >
            <div class="min-w-0">
              <p class="font-medium truncate">{{ item.productName }}</p>
              <p class="text-xs text-slate-400">{{ item.quantity }} × {{ formatMoney(Number(item.unitPrice)) }}</p>
            </div>
            <p class="font-semibold shrink-0">{{ formatMoney(Number(item.subtotal)) }}</p>
          </div>
          <div v-if="!(detailSale.items || []).length" class="px-4 py-8 text-center text-slate-400 text-sm">
            Sin ítems
          </div>
        </div>

        <div class="flex justify-between text-lg font-bold border-t pt-3">
          <span>Total</span>
          <span>{{ formatMoney(Number(detailSale.total)) }}</span>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showDetailModal = false">Cerrar</button>
        <button
          v-if="detailSale && detailSale.status !== 'reversed'"
          class="btn-primary !bg-red-600 hover:!bg-red-700"
          @click="showDetailModal = false; openReverse(detailSale)"
        >
          Anular venta
        </button>
      </template>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
