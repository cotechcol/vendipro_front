<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/api/client'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import { formatMoney, formatDate, formatDateShort, toNumber } from '@/utils/format'

interface SessionSummary {
  totalSales: number
  totalRevenue: number
  totalProfit: number
  cashTotal?: number
  cardTotal: number
}

interface CashSessionRow {
  id: number
  openingAmount: number
  closingAmount?: number
  expectedAmount?: number
  difference?: number
  status: 'open' | 'closed'
  openedAt: string
  closedAt?: string
  notes?: string
  user?: { name: string }
  summary?: SessionSummary
}

interface SaleRow {
  id: number
  ticketNumber: string
  total: number
  profit: number
  paymentMethod: string
  createdAt: string
  customer?: { name: string }
}

const app = useAppStore()
const auth = useAuthStore()
const history = ref<CashSessionRow[]>([])
const loading = ref(true)
const showOpenModal = ref(false)
const showCloseModal = ref(false)
const showDetailModal = ref(false)
const selectedSession = ref<CashSessionRow | null>(null)
const detailSales = ref<SaleRow[]>([])
const detailSummary = ref<SessionSummary | null>(null)
const detailLoading = ref(false)

const openingAmount = ref(0)
const closingAmount = ref(0)
const notes = ref('')
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const currentSummary = computed(() => app.cashSession?.summary as SessionSummary | undefined)

async function loadHistory() {
  loading.value = true
  try {
    await app.fetchCashSession()
    if (!auth.isAdmin) {
      history.value = []
      return
    }
    const { data } = await api.get('/cash-sessions', { params: { limit: 30 } })
    history.value = data.data
  } finally {
    loading.value = false
  }
}

async function openCash() {
  try {
    await app.openCash(openingAmount.value)
    showOpenModal.value = false
    openingAmount.value = 0
    toast.value = { show: true, message: 'Caja abierta correctamente', type: 'success' }
    await loadHistory()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

async function closeCash() {
  if (!app.cashSession) return
  try {
    await app.closeCash(app.cashSession.id, closingAmount.value, notes.value)
    showCloseModal.value = false
    closingAmount.value = 0
    notes.value = ''
    toast.value = { show: true, message: 'Caja cerrada correctamente', type: 'success' }
    await loadHistory()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

async function viewDetail(session: CashSessionRow) {
  selectedSession.value = session
  showDetailModal.value = true
  detailLoading.value = true
  try {
    const { data } = await api.get(`/cash-sessions/${session.id}`)
    detailSales.value = data.sales
    detailSummary.value = data.summary
    selectedSession.value = data.session
  } finally {
    detailLoading.value = false
  }
}

function diffClass(diff: number) {
  if (diff === 0) return 'badge-success'
  if (diff > 0) return 'badge-info'
  return 'badge-danger'
}

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', mixed: 'Mixto',
}

onMounted(loadHistory)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Caja" :subtitle="auth.isAdmin ? 'Apertura, cierre e historial de turnos' : 'Apertura y cierre de tu turno'">
      <template #actions>
        <button v-if="!app.cashSession" class="btn-primary" @click="showOpenModal = true">Abrir caja</button>
        <button v-else class="btn-primary !bg-red-600 hover:!bg-red-700" @click="showCloseModal = true">Cerrar caja</button>
      </template>
    </PageHeader>

    <!-- Caja activa -->
    <div v-if="app.cashSession" class="card overflow-hidden">
      <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 bg-white rounded-full animate-pulse" />
            <div>
              <h3 class="font-bold text-lg">Caja abierta — Turno #{{ app.cashSession.id }}</h3>
              <p class="text-emerald-100 text-sm">{{ formatDate(app.cashSession.openedAt) }}</p>
            </div>
          </div>
          <span class="badge bg-white/20 text-white border-0">En curso</span>
        </div>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-2 gap-4" :class="auth.isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-3'">
          <div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">Fondo inicial</p>
            <p class="text-xl font-bold text-slate-900 mt-1">{{ formatMoney(app.cashSession.openingAmount) }}</p>
          </div>
          <div v-if="currentSummary">
            <p class="text-xs text-slate-500 uppercase tracking-wide">Ventas</p>
            <p class="text-xl font-bold text-slate-900 mt-1">{{ currentSummary.totalSales }}</p>
          </div>
          <div v-if="currentSummary">
            <p class="text-xs text-slate-500 uppercase tracking-wide">Ingresos</p>
            <p class="text-xl font-bold text-emerald-600 mt-1">{{ formatMoney(currentSummary.totalRevenue) }}</p>
          </div>
          <div v-if="currentSummary && auth.isAdmin">
            <p class="text-xs text-slate-500 uppercase tracking-wide">Efectivo</p>
            <p class="text-xl font-bold text-slate-900 mt-1">{{ formatMoney(currentSummary.cashTotal ?? 0) }}</p>
          </div>
          <div v-if="currentSummary && auth.isAdmin">
            <p class="text-xs text-slate-500 uppercase tracking-wide">Esperado en caja</p>
            <p class="text-xl font-bold text-brand-600 mt-1">{{ formatMoney(toNumber(app.cashSession.openingAmount) + (currentSummary.cashTotal ?? 0)) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sin caja abierta -->
    <div v-else class="card p-10 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">◆</div>
      <h3 class="text-lg font-semibold text-slate-900">No hay caja abierta</h3>
      <p class="text-slate-500 mt-1 mb-6">Abre un turno de caja para registrar ventas</p>
      <button class="btn-primary" @click="showOpenModal = true">Abrir caja</button>
    </div>

    <!-- Historial (solo admin) -->
    <div v-if="auth.isAdmin" class="card overflow-hidden">
      <div class="card-header flex justify-between items-center">
        <div>
          <h3 class="font-semibold text-slate-900">Historial de cajas</h3>
          <p class="text-xs text-slate-500 mt-0.5">{{ auth.isAdmin ? 'Todos los turnos' : 'Tus turnos' }}</p>
        </div>
      </div>

      <div v-if="loading" class="p-12 text-center text-slate-400">Cargando historial...</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-6 py-3 font-medium">Turno</th>
              <th class="text-left px-6 py-3 font-medium hidden sm:table-cell">Cajero</th>
              <th class="text-left px-6 py-3 font-medium">Apertura</th>
              <th class="text-left px-6 py-3 font-medium hidden md:table-cell">Cierre</th>
              <th class="text-right px-6 py-3 font-medium">Fondo</th>
              <th class="text-right px-6 py-3 font-medium">Ventas</th>
              <th class="text-right px-6 py-3 font-medium hidden lg:table-cell">Ingresos</th>
              <th class="text-center px-6 py-3 font-medium">Estado</th>
              <th class="text-right px-6 py-3 font-medium hidden md:table-cell">Diferencia</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="history.length === 0">
              <td colspan="10" class="px-6 py-12 text-center text-slate-400">Sin registros de caja</td>
            </tr>
            <tr
              v-for="s in history"
              :key="s.id"
              class="hover:bg-slate-50/80 transition-colors cursor-pointer"
              @click="viewDetail(s)"
            >
              <td class="px-6 py-4 font-mono text-brand-700 font-medium">#{{ s.id }}</td>
              <td class="px-6 py-4 hidden sm:table-cell text-slate-600">{{ s.user?.name || '—' }}</td>
              <td class="px-6 py-4 text-slate-500 whitespace-nowrap">{{ formatDateShort(s.openedAt) }}</td>
              <td class="px-6 py-4 text-slate-500 hidden md:table-cell whitespace-nowrap">
                {{ s.closedAt ? formatDateShort(s.closedAt) : '—' }}
              </td>
              <td class="px-6 py-4 text-right font-medium tabular-nums">{{ formatMoney(s.openingAmount) }}</td>
              <td class="px-6 py-4 text-right tabular-nums">{{ s.summary?.totalSales ?? 0 }}</td>
              <td class="px-6 py-4 text-right font-medium text-emerald-600 hidden lg:table-cell tabular-nums">
                {{ formatMoney(s.summary?.totalRevenue ?? 0) }}
              </td>
              <td class="px-6 py-4 text-center">
                <span :class="s.status === 'open' ? 'badge-success' : 'badge-neutral'">
                  {{ s.status === 'open' ? 'Abierta' : 'Cerrada' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right hidden md:table-cell">
                <span v-if="s.difference != null" :class="diffClass(toNumber(s.difference))">
                  {{ formatMoney(s.difference) }}
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-6 py-4 text-right">
                <button class="text-brand-600 text-xs font-medium hover:underline" @click.stop="viewDetail(s)">Ver</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal abrir -->
    <AppModal :show="showOpenModal" title="Abrir caja" @close="showOpenModal = false">
      <div>
        <label class="text-sm font-medium text-slate-700">Monto inicial en efectivo</label>
        <input v-model.number="openingAmount" type="number" min="0" step="1" class="input mt-1.5 text-lg" placeholder="0" />
        <p v-if="openingAmount > 0" class="text-sm text-slate-500 mt-2">= {{ formatMoney(openingAmount) }}</p>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showOpenModal = false">Cancelar</button>
        <button class="btn-primary !bg-emerald-600 hover:!bg-emerald-700" @click="openCash">Abrir caja</button>
      </template>
    </AppModal>

    <!-- Modal cerrar -->
    <AppModal :show="showCloseModal" title="Cerrar caja" @close="showCloseModal = false">
      <div class="space-y-4">
        <div v-if="currentSummary && auth.isAdmin" class="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
          <div class="flex justify-between"><span class="text-slate-500">Fondo inicial</span><span class="font-medium">{{ formatMoney(app.cashSession!.openingAmount) }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">+ Ventas efectivo</span><span class="font-medium">{{ formatMoney(currentSummary.cashTotal ?? 0) }}</span></div>
          <div class="flex justify-between border-t border-slate-200 pt-2 font-bold">
            <span>Esperado en caja</span>
            <span class="text-brand-600">{{ formatMoney(toNumber(app.cashSession!.openingAmount) + (currentSummary.cashTotal ?? 0)) }}</span>
          </div>
        </div>
        <div v-else-if="!auth.isAdmin && app.cashSession" class="bg-slate-50 rounded-xl p-4 text-sm">
          <div class="flex justify-between"><span class="text-slate-500">Fondo inicial</span><span class="font-medium">{{ formatMoney(app.cashSession!.openingAmount) }}</span></div>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Monto contado en caja</label>
          <input v-model.number="closingAmount" type="number" min="0" step="1" class="input mt-1.5 text-lg" />
          <p v-if="closingAmount > 0" class="text-sm text-slate-500 mt-2">= {{ formatMoney(closingAmount) }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Notas (opcional)</label>
          <input v-model="notes" class="input mt-1.5" placeholder="Observaciones del cierre..." />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showCloseModal = false">Cancelar</button>
        <button class="btn-primary !bg-red-600 hover:!bg-red-700" @click="closeCash">Cerrar caja</button>
      </template>
    </AppModal>

    <!-- Modal detalle sesión -->
    <AppModal :show="showDetailModal" :title="`Turno #${selectedSession?.id}`" size="lg" @close="showDetailModal = false">
      <div v-if="detailLoading" class="py-12 text-center text-slate-400">Cargando...</div>
      <template v-else-if="selectedSession && detailSummary">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard title="Ventas" :value="detailSummary.totalSales" icon="🧾" color="brand" />
          <StatCard title="Ingresos" :value="formatMoney(detailSummary.totalRevenue)" icon="💵" color="blue" />
          <StatCard title="Efectivo" :value="formatMoney(detailSummary.cashTotal ?? 0)" icon="◆" color="amber" />
          <StatCard title="Tarjeta" :value="formatMoney(detailSummary.cardTotal)" icon="💳" color="purple" />
        </div>

        <div class="bg-slate-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-slate-500">Apertura:</span> <strong>{{ formatDate(selectedSession.openedAt) }}</strong></div>
          <div><span class="text-slate-500">Cierre:</span> <strong>{{ selectedSession.closedAt ? formatDate(selectedSession.closedAt) : 'En curso' }}</strong></div>
          <div><span class="text-slate-500">Fondo inicial:</span> <strong>{{ formatMoney(selectedSession.openingAmount) }}</strong></div>
          <div v-if="selectedSession.closingAmount != null"><span class="text-slate-500">Conteo final:</span> <strong>{{ formatMoney(selectedSession.closingAmount) }}</strong></div>
          <div v-if="selectedSession.expectedAmount != null"><span class="text-slate-500">Esperado:</span> <strong>{{ formatMoney(selectedSession.expectedAmount) }}</strong></div>
          <div v-if="selectedSession.difference != null">
            <span class="text-slate-500">Diferencia:</span>
            <span :class="['ml-1 font-bold', toNumber(selectedSession.difference) >= 0 ? 'text-emerald-600' : 'text-red-600']">
              {{ formatMoney(selectedSession.difference) }}
            </span>
          </div>
        </div>

        <h4 class="font-semibold text-slate-900 mb-3">Ventas del turno ({{ detailSales.length }})</h4>
        <div v-if="detailSales.length === 0" class="text-slate-400 text-sm text-center py-6">Sin ventas en este turno</div>
        <div v-else class="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div v-for="sale in detailSales" :key="sale.id" class="flex justify-between items-center px-4 py-3 hover:bg-slate-50 text-sm">
            <div>
              <p class="font-mono text-xs text-brand-700">{{ sale.ticketNumber }}</p>
              <p class="text-xs text-slate-400">{{ formatDate(sale.createdAt) }} · {{ paymentLabels[sale.paymentMethod] || sale.paymentMethod }}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold">{{ formatMoney(sale.total) }}</p>
              <p class="text-xs text-emerald-600">+{{ formatMoney(sale.profit) }}</p>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn-secondary" @click="showDetailModal = false">Cerrar</button>
      </template>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
