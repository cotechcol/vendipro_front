<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import api from '@/api/client'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { formatMoney } from '@/utils/format'
import type { DashboardData } from '@/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const topProducts = computed(() => data.value?.topProducts ?? [])

const chartData = computed(() => {
  if (!topProducts.value.length) return null
  return {
    labels: topProducts.value.map((p) => p.name),
    datasets: [{
      label: 'Unidades vendidas',
      data: topProducts.value.map((p) => Number(p.quantity) || 0),
      backgroundColor: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
      borderRadius: 8,
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
}

async function loadDashboard() {
  loading.value = true
  error.value = null
  try {
    const { data: res } = await api.get<DashboardData>('/reports/dashboard')
    data.value = {
      ...res,
      topProducts: Array.isArray(res.topProducts) ? res.topProducts : [],
    }
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    error.value = msg || 'No se pudo cargar el dashboard'
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div>
    <PageHeader title="Dashboard" subtitle="Resumen de ventas del día" />

    <div v-if="loading" class="flex justify-center py-20 text-slate-400">Cargando...</div>

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p class="text-red-800 font-medium">{{ error }}</p>
      <button class="mt-4 btn-secondary" @click="loadDashboard">Reintentar</button>
    </div>

    <template v-else-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Ventas hoy" :value="data.totalSales" icon="🛒" color="brand" />
        <StatCard title="Ingresos" :value="formatMoney(data.revenue)" icon="💵" color="blue" />
        <StatCard title="Ganancias" :value="formatMoney(data.profit)" icon="📈" color="amber" />
        <StatCard title="Stock bajo" :value="data.lowStockCount" icon="⚠️" color="red" trend="Productos por reponer" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-900">Productos más vendidos hoy</h3>
          </div>
          <div class="card-body">
            <div v-if="chartData" class="h-64">
              <Bar :data="chartData" :options="chartOptions" />
            </div>
            <div v-else class="text-center text-slate-400 py-12">Sin ventas registradas hoy</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-900">Detalle top ventas</h3>
          </div>
          <div class="card-body p-0">
            <div v-if="topProducts.length === 0" class="text-slate-400 text-sm text-center py-12">Sin datos</div>
            <div v-else class="divide-y divide-slate-100">
              <div v-for="(p, i) in topProducts" :key="i" class="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50">
                <div class="flex items-center gap-3">
                  <span class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{{ i + 1 }}</span>
                  <span class="font-medium text-sm">{{ p.name }}</span>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-emerald-600">{{ formatMoney(Number(p.revenue)) }}</p>
                  <p class="text-xs text-slate-400">{{ p.quantity }} uds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
