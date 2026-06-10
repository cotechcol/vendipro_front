<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { formatMoney, formatDate } from '@/utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const auth = useAuthStore()
const tab = ref<'sales' | 'products' | 'profitability'>('sales')
const from = ref(getWeekAgo())
const to = ref(today())
const loading = ref(false)

const salesReport = ref<{ sales: SaleRow[]; summary: Summary } | null>(null)
const productsReport = ref<{ products: ProductRow[]; summary: ProductSummary } | null>(null)
const profitability = ref<{ revenue: number; cost: number; profit: number; margin: number; salesCount: number } | null>(null)
const dailySales = ref<{ date: string; revenue: number; profit: number; count: number }[]>([])

interface SaleRow { id: number; ticketNumber: string; total: number; profit: number; createdAt: string; user?: { name: string } }
interface Summary { count: number; revenue: number; profit: number; tax: number }
interface ProductRow { name: string; category: string; quantity: number; revenue: number; cost: number; profit: number; margin: number }
interface ProductSummary { totalProducts: number; totalUnits: number; revenue: number; profit: number }

function today() { return new Date().toISOString().slice(0, 10) }
function getWeekAgo() {
  const d = new Date(); d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

const tabs = computed(() => {
  const all = [
    { id: 'sales' as const, label: 'Ventas', icon: '◈' },
    { id: 'products' as const, label: 'Por producto', icon: '▣' },
    { id: 'profitability' as const, label: 'Rentabilidad', icon: '▲' },
  ]
  if (!auth.isAdmin) return all.filter((t) => t.id === 'sales' || t.id === 'products')
  return all
})

const dailyChart = computed(() => ({
  labels: dailySales.value.map((d) => d.date.slice(5)),
  datasets: [
    {
      label: 'Ingresos',
      data: dailySales.value.map((d) => d.revenue),
      borderColor: '#059669',
      backgroundColor: 'rgba(5,150,105,0.1)',
      fill: true,
      tension: 0.4,
    },
    {
      label: 'Ganancias',
      data: dailySales.value.map((d) => d.profit),
      borderColor: '#f59e0b',
      backgroundColor: 'transparent',
      tension: 0.4,
    },
  ],
}))

const productChart = computed(() => {
  if (!productsReport.value?.products.length) return null
  const top = productsReport.value.products.slice(0, 8)
  return {
    labels: top.map((p) => p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name),
    datasets: [{
      label: 'Ingresos',
      data: top.map((p) => p.revenue),
      backgroundColor: '#059669',
      borderRadius: 6,
    }],
  }
})

const moneyTooltip = {
  callbacks: {
    label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
      `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y ?? 0)}`,
  },
}

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const }, tooltip: moneyTooltip },
}
const barOpts = {
  ...chartOpts,
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      ticks: { callback: (v: string | number) => formatMoney(Number(v)) },
    },
    x: { grid: { display: false } },
  },
}

async function loadTab() {
  loading.value = true
  const params = { from: from.value, to: to.value }
  try {
    if (tab.value === 'sales') {
      const [salesRes, dailyRes] = await Promise.all([
        api.get('/reports/sales', { params }),
        api.get('/reports/daily-sales', { params }),
      ])
      salesReport.value = salesRes.data
      dailySales.value = dailyRes.data
    } else if (tab.value === 'products') {
      const { data } = await api.get('/reports/products', { params })
      productsReport.value = data
    } else if (tab.value === 'profitability') {
      const { data } = await api.get('/reports/profitability', { params })
      profitability.value = data
    }
  } finally {
    loading.value = false
  }
}

function exportCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

function exportSales() {
  if (!salesReport.value) return
  const rows = [['Ticket', 'Fecha', 'Total', 'Ganancia', 'Cajero']]
  for (const s of salesReport.value.sales) {
    rows.push([s.ticketNumber, s.createdAt, String(s.total), String(s.profit), s.user?.name || ''])
  }
  exportCsv(rows, `ventas-${from.value}-${to.value}.csv`)
}

function exportProducts() {
  if (!productsReport.value) return
  const rows = [['Producto', 'Categoría', 'Unidades', 'Ingresos', 'Costo', 'Ganancia', 'Margen%']]
  for (const p of productsReport.value.products) {
    rows.push([p.name, p.category, String(p.quantity), String(p.revenue), String(p.cost), String(p.profit), String(p.margin)])
  }
  exportCsv(rows, `productos-${from.value}-${to.value}.csv`)
}

watch(tab, loadTab)
onMounted(loadTab)
</script>

<template>
  <div>
    <PageHeader title="Reportes" subtitle="Análisis de ventas y rentabilidad">
      <template #actions>
        <div class="flex items-center gap-2 flex-wrap">
          <input v-model="from" type="date" class="input !w-auto !py-2" />
          <span class="text-slate-400">—</span>
          <input v-model="to" type="date" class="input !w-auto !py-2" />
          <button class="btn-primary !py-2" :disabled="loading" @click="loadTab">
            {{ loading ? '...' : 'Consultar' }}
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- Tabs -->
    <div class="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit mb-6 overflow-x-auto">
      <button
        v-for="t in tabs"
        :key="t.id"
        :class="['flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all', tab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700']"
        @click="tab = t.id"
      >
        <span class="text-xs opacity-60">{{ t.icon }}</span>
        {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20 text-slate-400">Cargando reporte...</div>

    <!-- SALES TAB -->
    <template v-else-if="tab === 'sales' && salesReport">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Transacciones" :value="salesReport.summary.count" icon="🧾" color="brand" />
        <StatCard title="Ingresos" :value="formatMoney(salesReport.summary.revenue)" icon="💵" color="blue" />
        <StatCard title="Ganancias" :value="formatMoney(salesReport.summary.profit)" icon="📈" color="amber" />
        <StatCard title="IVA" :value="formatMoney(salesReport.summary.tax)" icon="🏛" color="purple" />
      </div>

      <div v-if="dailySales.length" class="card mb-6">
        <div class="card-header flex justify-between items-center">
          <h3 class="font-semibold">Tendencia de ventas</h3>
        </div>
        <div class="card-body h-72">
          <Line :data="dailyChart" :options="chartOpts" />
        </div>
      </div>

      <div class="card">
        <div class="card-header flex justify-between items-center">
          <h3 class="font-semibold">Detalle de ventas</h3>
          <button class="btn-ghost text-sm !text-brand-600" @click="exportSales">↓ Exportar CSV</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="text-left px-6 py-3 font-medium">Ticket</th>
                <th class="text-left px-6 py-3 font-medium">Fecha</th>
                <th class="text-left px-6 py-3 font-medium hidden sm:table-cell">Cajero</th>
                <th class="text-right px-6 py-3 font-medium">Total</th>
                <th class="text-right px-6 py-3 font-medium">Ganancia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="s in salesReport.sales" :key="s.id" class="hover:bg-slate-50/50">
                <td class="px-6 py-3 font-mono text-xs text-brand-700">{{ s.ticketNumber }}</td>
                <td class="px-6 py-3 text-slate-500">{{ formatDate(s.createdAt) }}</td>
                <td class="px-6 py-3 hidden sm:table-cell">{{ s.user?.name || '—' }}</td>
                <td class="px-6 py-3 text-right font-semibold">{{ formatMoney(Number(s.total)) }}</td>
                <td class="px-6 py-3 text-right text-emerald-600">{{ formatMoney(Number(s.profit)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- PRODUCTS TAB -->
    <template v-else-if="tab === 'products' && productsReport">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Productos vendidos" :value="productsReport.summary.totalProducts" icon="▣" color="brand" />
        <StatCard title="Unidades" :value="productsReport.summary.totalUnits" icon="📦" color="blue" />
        <StatCard title="Ingresos" :value="formatMoney(productsReport.summary.revenue)" icon="💵" color="amber" />
        <StatCard title="Ganancias" :value="formatMoney(productsReport.summary.profit)" icon="📈" color="purple" />
      </div>

      <div v-if="productChart" class="card mb-6">
        <div class="card-header"><h3 class="font-semibold">Top productos por ingresos</h3></div>
        <div class="card-body h-72"><Bar :data="productChart" :options="barOpts" /></div>
      </div>

      <div class="card">
        <div class="card-header flex justify-between items-center">
          <h3 class="font-semibold">Ventas por producto</h3>
          <button class="btn-ghost text-sm !text-brand-600" @click="exportProducts">↓ Exportar CSV</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="text-left px-6 py-3 font-medium">#</th>
                <th class="text-left px-6 py-3 font-medium">Producto</th>
                <th class="text-left px-6 py-3 font-medium hidden md:table-cell">Categoría</th>
                <th class="text-right px-6 py-3 font-medium">Uds</th>
                <th class="text-right px-6 py-3 font-medium">Ingresos</th>
                <th class="text-right px-6 py-3 font-medium hidden sm:table-cell">Costo</th>
                <th class="text-right px-6 py-3 font-medium">Ganancia</th>
                <th class="text-right px-6 py-3 font-medium">Margen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="productsReport.products.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">Sin ventas en el periodo seleccionado</td>
              </tr>
              <tr v-for="(p, i) in productsReport.products" :key="i" class="hover:bg-slate-50/50">
                <td class="px-6 py-3 text-slate-400">{{ i + 1 }}</td>
                <td class="px-6 py-3 font-medium">{{ p.name }}</td>
                <td class="px-6 py-3 text-slate-500 hidden md:table-cell">{{ p.category }}</td>
                <td class="px-6 py-3 text-right font-semibold">{{ p.quantity }}</td>
                <td class="px-6 py-3 text-right">{{ formatMoney(p.revenue) }}</td>
                <td class="px-6 py-3 text-right text-slate-400 hidden sm:table-cell">{{ formatMoney(p.cost) }}</td>
                <td class="px-6 py-3 text-right text-emerald-600 font-medium">{{ formatMoney(p.profit) }}</td>
                <td class="px-6 py-3 text-right">
                  <span :class="['badge', p.margin >= 30 ? 'badge-success' : p.margin >= 15 ? 'badge-warning' : 'badge-danger']">
                    {{ p.margin }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- PROFITABILITY TAB -->
    <template v-else-if="tab === 'profitability' && profitability">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Ingresos" :value="formatMoney(profitability.revenue)" icon="💵" color="brand" />
        <StatCard title="Costos" :value="formatMoney(profitability.cost)" icon="📉" color="red" />
        <StatCard title="Ganancia neta" :value="formatMoney(profitability.profit)" icon="📈" color="amber" />
        <StatCard title="Margen" :value="profitability.margin + '%'" icon="◆" color="purple" trend="Sobre ingresos totales" />
      </div>
      <div class="card p-8">
        <div class="max-w-lg mx-auto">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-slate-500">Rentabilidad del periodo</span>
            <span class="font-bold text-emerald-600">{{ profitability.margin }}%</span>
          </div>
          <div class="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" :style="{ width: Math.min(profitability.margin, 100) + '%' }" />
          </div>
          <p class="text-xs text-slate-400 mt-3 text-center">{{ profitability.salesCount }} ventas en el periodo</p>
        </div>
      </div>
    </template>
  </div>
</template>
