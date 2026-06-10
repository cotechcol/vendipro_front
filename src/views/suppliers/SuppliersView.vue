<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import type { Supplier } from '@/types'

const suppliers = ref<Supplier[]>([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref<Supplier | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const form = ref({ name: '', email: '', phone: '', address: '', contact: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/suppliers', { params: { limit: 100 } })
    suppliers.value = data.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', email: '', phone: '', address: '', contact: '' }
  showModal.value = true
}

function openEdit(s: Supplier) {
  editing.value = s
  form.value = { name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '', contact: s.contact || '' }
  showModal.value = true
}

async function save() {
  try {
    if (editing.value) await api.patch(`/suppliers/${editing.value.id}`, form.value)
    else await api.post('/suppliers', form.value)
    showModal.value = false
    toast.value = { show: true, message: 'Proveedor guardado', type: 'success' }
    await load()
  } catch {
    toast.value = { show: true, message: 'Error al guardar', type: 'error' }
  }
}

async function remove(id: number) {
  if (!confirm('¿Eliminar proveedor?')) return
  await api.delete(`/suppliers/${id}`)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Proveedores</h2>
      <button class="bg-primary-600 text-white px-4 py-2 rounded-lg" @click="openCreate">+ Nuevo proveedor</button>
    </div>
    <div class="bg-white rounded-xl border overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr>
          <th class="text-left px-4 py-3">Nombre</th>
          <th class="text-left px-4 py-3">Contacto</th>
          <th class="text-left px-4 py-3">Teléfono</th>
          <th class="text-right px-4 py-3">Acciones</th>
        </tr></thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s.id" class="border-t hover:bg-slate-50">
            <td class="px-4 py-3 font-medium">{{ s.name }}</td>
            <td class="px-4 py-3">{{ s.contact || '-' }}</td>
            <td class="px-4 py-3">{{ s.phone || '-' }}</td>
            <td class="px-4 py-3 text-right space-x-2">
              <button class="text-primary-600 hover:underline" @click="openEdit(s)">Editar</button>
              <button class="text-red-500 hover:underline" @click="remove(s.id)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppModal :show="showModal" :title="editing ? 'Editar proveedor' : 'Nuevo proveedor'" @close="showModal = false">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Nombre</label><input v-model="form.name" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Contacto</label><input v-model="form.contact" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Teléfono</label><input v-model="form.phone" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Email</label><input v-model="form.email" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div class="sm:col-span-2"><label class="text-sm font-medium">Dirección</label><input v-model="form.address" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
      </div>
      <template #footer>
        <button class="px-4 py-2" @click="showModal = false">Cancelar</button>
        <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="save">Guardar</button>
      </template>
    </AppModal>
    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
