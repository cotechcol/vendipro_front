<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/client'
import PageHeader from '@/components/PageHeader.vue'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import type { Store } from '@/types'

const stores = ref<Store[]>([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref<Store | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const form = ref({ name: '', code: '', address: '', phone: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/stores')
    stores.value = data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', code: '', address: '', phone: '' }
  showModal.value = true
}

function openEdit(s: Store) {
  editing.value = s
  form.value = { name: s.name, code: s.code, address: s.address || '', phone: s.phone || '' }
  showModal.value = true
}

async function save() {
  try {
    if (editing.value) {
      await api.patch(`/stores/${editing.value.id}`, {
        name: form.value.name,
        address: form.value.address,
        phone: form.value.phone,
      })
    } else {
      await api.post('/stores', form.value)
    }
    showModal.value = false
    toast.value = { show: true, message: 'Tienda guardada', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

async function deactivate(id: number) {
  if (!confirm('¿Desactivar esta tienda?')) return
  await api.patch(`/stores/${id}/deactivate`)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Tiendas" subtitle="Gestión de sucursales del sistema">
      <template #actions>
        <button class="btn-primary" @click="openCreate">+ Nueva tienda</button>
      </template>
    </PageHeader>

    <div class="card overflow-hidden">
      <div v-if="loading" class="p-12 text-center text-slate-400">Cargando...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="text-left px-6 py-3 font-medium">Nombre</th>
            <th class="text-left px-6 py-3 font-medium">Código</th>
            <th class="text-left px-6 py-3 font-medium hidden md:table-cell">Dirección</th>
            <th class="text-left px-6 py-3 font-medium hidden sm:table-cell">Teléfono</th>
            <th class="text-center px-6 py-3 font-medium">Estado</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="stores.length === 0">
            <td colspan="6" class="px-6 py-12 text-center text-slate-400">No hay tiendas registradas</td>
          </tr>
          <tr v-for="s in stores" :key="s.id" class="hover:bg-slate-50/80">
            <td class="px-6 py-4 font-medium">{{ s.name }}</td>
            <td class="px-6 py-4 font-mono text-xs text-brand-700">{{ s.code }}</td>
            <td class="px-6 py-4 text-slate-500 hidden md:table-cell">{{ s.address || '—' }}</td>
            <td class="px-6 py-4 text-slate-500 hidden sm:table-cell">{{ s.phone || '—' }}</td>
            <td class="px-6 py-4 text-center">
              <span :class="s.active ? 'badge-success' : 'badge-neutral'">
                {{ s.active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button class="text-brand-600 text-xs font-medium hover:underline" @click="openEdit(s)">Editar</button>
              <button v-if="s.active" class="text-red-500 text-xs font-medium hover:underline" @click="deactivate(s.id)">Desactivar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal :show="showModal" :title="editing ? 'Editar tienda' : 'Nueva tienda'" @close="showModal = false">
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-slate-700">Nombre</label>
          <input v-model="form.name" class="input mt-1.5" />
        </div>
        <div v-if="!editing">
          <label class="text-sm font-medium text-slate-700">Código único</label>
          <input v-model="form.code" class="input mt-1.5" placeholder="ej: bogota-norte" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Dirección</label>
          <input v-model="form.address" class="input mt-1.5" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Teléfono</label>
          <input v-model="form.phone" class="input mt-1.5" />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showModal = false">Cancelar</button>
        <button class="btn-primary" @click="save">Guardar</button>
      </template>
    </AppModal>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
