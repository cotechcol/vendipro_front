<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/client'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import type { Category } from '@/types'

const categories = ref<Category[]>([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref<Category | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const form = ref({ name: '', description: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/categories', { params: { limit: 100 } })
    categories.value = data.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', description: '' }
  showModal.value = true
}

function openEdit(c: Category) {
  editing.value = c
  form.value = { name: c.name, description: c.description || '' }
  showModal.value = true
}

async function save() {
  try {
    if (editing.value) {
      await api.patch(`/categories/${editing.value.id}`, form.value)
    } else {
      await api.post('/categories', form.value)
    }
    showModal.value = false
    toast.value = { show: true, message: 'Categoría guardada', type: 'success' }
    await load()
  } catch {
    toast.value = { show: true, message: 'Error al guardar', type: 'error' }
  }
}

async function remove(id: number) {
  if (!confirm('¿Eliminar categoría?')) return
  await api.delete(`/categories/${id}`)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Categorías</h2>
      <button class="bg-primary-600 text-white px-4 py-2 rounded-lg" @click="openCreate">+ Nueva categoría</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="loading" class="col-span-full text-center text-slate-400 py-8">Cargando...</div>
      <div v-for="c in categories" :key="c.id" class="bg-white rounded-xl border border-slate-200 p-5">
        <h3 class="font-semibold text-lg">{{ c.name }}</h3>
        <p class="text-sm text-slate-500 mt-1">{{ c.description || 'Sin descripción' }}</p>
        <div class="mt-4 flex gap-2">
          <button class="text-primary-600 text-sm hover:underline" @click="openEdit(c)">Editar</button>
          <button class="text-red-500 text-sm hover:underline" @click="remove(c.id)">Eliminar</button>
        </div>
      </div>
    </div>
    <AppModal :show="showModal" :title="editing ? 'Editar categoría' : 'Nueva categoría'" @close="showModal = false">
      <div class="space-y-4">
        <div><label class="text-sm font-medium">Nombre</label><input v-model="form.name" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Descripción</label><input v-model="form.description" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
      </div>
      <template #footer>
        <button class="px-4 py-2" @click="showModal = false">Cancelar</button>
        <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="save">Guardar</button>
      </template>
    </AppModal>
    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
