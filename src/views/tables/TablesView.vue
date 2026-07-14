<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import Toast from '@/components/Toast.vue'
import { useAuthStore } from '@/stores/auth'
import type { RestaurantTable, TableOrder } from '@/types'
import { formatMoney } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()
const tables = ref<RestaurantTable[]>([])
const loading = ref(true)
const processingId = ref<number | null>(null)
const showCreate = ref(false)
const form = ref({ name: '', capacity: 4 })
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<RestaurantTable[]>('/tables')
    tables.value = data
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudieron cargar las mesas', type: 'error' }
  } finally {
    loading.value = false
  }
}

async function createTable() {
  if (!form.value.name.trim()) {
    toast.value = { show: true, message: 'Escribe el nombre de la mesa', type: 'error' }
    return
  }
  try {
    await api.post('/tables', {
      name: form.value.name.trim(),
      capacity: form.value.capacity || 4,
      sortOrder: tables.value.length,
    })
    showCreate.value = false
    form.value = { name: '', capacity: 4 }
    toast.value = { show: true, message: 'Mesa creada', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo crear la mesa', type: 'error' }
  }
}

async function openTable(table: RestaurantTable) {
  if (table.openOrder?.id) {
    router.push(`/tables/${table.openOrder.id}`)
    return
  }
  processingId.value = table.id
  try {
    const { data } = await api.post<TableOrder>(`/tables/${table.id}/open`, {})
    router.push(`/tables/${data.id}`)
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo abrir la mesa', type: 'error' }
  } finally {
    processingId.value = null
  }
}

async function deactivateTable(table: RestaurantTable) {
  if (!confirm(`¿Desactivar ${table.name}?`)) return
  processingId.value = table.id
  try {
    await api.delete(`/tables/${table.id}`)
    toast.value = { show: true, message: 'Mesa desactivada', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.value = { show: true, message: msg || 'No se pudo desactivar la mesa', type: 'error' }
  } finally {
    processingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Mesas" subtitle="Cuentas abiertas por mesa para restaurante">
      <template #actions>
        <button v-if="auth.isAdmin" class="btn-primary" @click="showCreate = true">+ Nueva mesa</button>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center text-slate-400 py-16">Cargando mesas...</div>

    <div v-else-if="tables.length === 0" class="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <p class="text-slate-500 font-medium">Aún no tienes mesas creadas</p>
      <p class="text-sm text-slate-400 mt-1">Crea tus mesas para empezar a abrir cuentas de restaurante.</p>
      <button v-if="auth.isAdmin" class="btn-primary mt-5" @click="showCreate = true">Crear primera mesa</button>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <button
        v-for="table in tables"
        :key="table.id"
        class="text-left bg-white rounded-2xl border p-5 hover:shadow-md transition-all relative overflow-hidden"
        :class="table.openOrder ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 hover:border-emerald-300'"
        :disabled="processingId === table.id"
        @click="openTable(table)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-lg font-bold text-slate-900">{{ table.name }}</p>
            <p class="text-xs text-slate-400 mt-0.5">Capacidad {{ table.capacity }}</p>
          </div>
          <span
            class="text-xs font-semibold px-2.5 py-1 rounded-full"
            :class="table.openOrder ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
          >
            {{ table.openOrder ? 'Ocupada' : 'Libre' }}
          </span>
        </div>

        <div class="mt-6">
          <template v-if="table.openOrder">
            <p class="text-2xl font-bold text-amber-700">{{ formatMoney(table.openOrder.total) }}</p>
            <p class="text-sm text-slate-500">{{ table.openOrder.itemCount }} producto{{ table.openOrder.itemCount === 1 ? '' : 's' }}</p>
          </template>
          <template v-else>
            <p class="text-2xl font-bold text-emerald-700">Disponible</p>
            <p class="text-sm text-slate-500">Toca para abrir cuenta</p>
          </template>
        </div>

        <div v-if="auth.isAdmin && !table.openOrder" class="mt-4 pt-4 border-t border-slate-100">
          <span
            class="text-xs text-red-500 hover:underline"
            @click.stop="deactivateTable(table)"
          >
            Desactivar
          </span>
        </div>
      </button>
    </div>

    <AppModal title="Nueva mesa" :show="showCreate" @close="showCreate = false">
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium">Nombre</label>
          <input v-model="form.name" placeholder="Mesa 1, Barra 2..." class="w-full mt-1 px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label class="text-sm font-medium">Capacidad</label>
          <input v-model.number="form.capacity" type="number" min="1" class="w-full mt-1 px-3 py-2 border rounded-lg" />
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 text-slate-600" @click="showCreate = false">Cancelar</button>
        <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="createTable">Crear mesa</button>
      </template>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
