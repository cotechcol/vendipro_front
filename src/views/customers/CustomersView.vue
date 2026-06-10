<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import type { Customer } from '@/types'

const customers = ref<Customer[]>([])
const loading = ref(true)
const search = ref('')
const showModal = ref(false)
const editing = ref<Customer | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const form = ref({ name: '', email: '', phone: '', address: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/customers', { params: { limit: 100, search: search.value || undefined } })
    customers.value = data.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', email: '', phone: '', address: '' }
  showModal.value = true
}

function openEdit(c: Customer) {
  editing.value = c
  form.value = { name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' }
  showModal.value = true
}

async function save() {
  try {
    if (editing.value) {
      await api.patch(`/customers/${editing.value.id}`, form.value)
    } else {
      await api.post('/customers', form.value)
    }
    showModal.value = false
    toast.value = { show: true, message: 'Cliente guardado', type: 'success' }
    await load()
  } catch {
    toast.value = { show: true, message: 'Error al guardar', type: 'error' }
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between gap-4 mb-6">
      <h2 class="text-2xl font-bold">Clientes</h2>
      <button class="bg-primary-600 text-white px-4 py-2 rounded-lg" @click="openCreate">+ Nuevo cliente</button>
    </div>
    <input v-model="search" placeholder="Buscar..." class="w-full sm:w-64 px-4 py-2 border rounded-lg mb-4" @keyup.enter="load" />
    <div class="bg-white rounded-xl border overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr>
          <th class="text-left px-4 py-3">Nombre</th>
          <th class="text-left px-4 py-3">Teléfono</th>
          <th class="text-left px-4 py-3">Email</th>
          <th class="text-right px-4 py-3">Acciones</th>
        </tr></thead>
        <tbody>
          <tr v-for="c in customers" :key="c.id" class="border-t hover:bg-slate-50">
            <td class="px-4 py-3 font-medium">{{ c.name }}</td>
            <td class="px-4 py-3">{{ c.phone || '-' }}</td>
            <td class="px-4 py-3">{{ c.email || '-' }}</td>
            <td class="px-4 py-3 text-right"><button class="text-primary-600 hover:underline" @click="openEdit(c)">Editar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppModal :show="showModal" :title="editing ? 'Editar cliente' : 'Nuevo cliente'" @close="showModal = false">
      <div class="space-y-4">
        <div><label class="text-sm font-medium">Nombre</label><input v-model="form.name" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Teléfono</label><input v-model="form.phone" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Email</label><input v-model="form.email" type="email" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Dirección</label><input v-model="form.address" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
      </div>
      <template #footer>
        <button class="px-4 py-2" @click="showModal = false">Cancelar</button>
        <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="save">Guardar</button>
      </template>
    </AppModal>
    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
