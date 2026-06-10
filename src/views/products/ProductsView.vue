<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import AppModal from '@/components/AppModal.vue'
import Toast from '@/components/Toast.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { Product, Category } from '@/types'

import { formatMoney } from '@/utils/format'

const auth = useAuthStore()
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const search = ref('')
const categoryFilter = ref<number | ''>('')
const showModal = ref(false)
const editing = ref<Product | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const form = ref({
  sku: '', name: '', description: '', salePrice: 0, costPrice: 0,
  stock: 0, minStock: 5, categoryId: undefined as number | undefined,
})

const filtered = computed(() => {
  let list = products.value
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }
  if (categoryFilter.value) list = list.filter((p) => p.categoryId === categoryFilter.value)
  return list
})

async function load() {
  loading.value = true
  try {
    const [prodRes, catRes] = await Promise.all([
      api.get('/products', { params: { limit: 100 } }),
      api.get('/categories/active'),
    ])
    products.value = prodRes.data.data
    categories.value = catRes.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { sku: '', name: '', description: '', salePrice: 0, costPrice: 0, stock: 0, minStock: 5, categoryId: undefined }
  showModal.value = true
}

function openEdit(p: Product) {
  editing.value = p
  form.value = {
    sku: p.sku, name: p.name, description: p.description || '',
    salePrice: Number(p.salePrice), costPrice: Number(p.costPrice),
    stock: p.stock, minStock: p.minStock, categoryId: p.categoryId,
  }
  showModal.value = true
}

async function save() {
  try {
    if (editing.value) {
      await api.patch(`/products/${editing.value.id}`, form.value)
    } else {
      await api.post('/products', form.value)
    }
    showModal.value = false
    toast.value = { show: true, message: 'Producto guardado', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

async function remove(id: number) {
  if (!confirm('¿Eliminar producto?')) return
  await api.delete(`/products/${id}`)
  toast.value = { show: true, message: 'Producto eliminado', type: 'success' }
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Productos" subtitle="Catálogo de productos del negocio">
      <template #actions>
        <button v-if="auth.isAdmin" class="btn-primary" @click="openCreate">+ Nuevo producto</button>
      </template>
    </PageHeader>
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <input v-model="search" placeholder="Buscar por nombre o SKU..." class="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
      <select v-model="categoryFilter" class="px-4 py-2 border border-slate-300 rounded-lg">
        <option value="">Todas las categorías</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-4 py-3">SKU</th>
              <th class="text-left px-4 py-3">Nombre</th>
              <th class="text-left px-4 py-3">Categoría</th>
              <th class="text-right px-4 py-3">Precio</th>
              <th class="text-right px-4 py-3">Costo</th>
              <th class="text-right px-4 py-3">Stock</th>
              <th v-if="auth.isAdmin" class="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="7" class="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
            <tr v-else-if="filtered.length === 0"><td colspan="7" class="px-4 py-8 text-center text-slate-400">Sin productos</td></tr>
            <tr v-for="p in filtered" :key="p.id" class="border-t border-slate-100 hover:bg-slate-50">
              <td class="px-4 py-3 font-mono text-xs">{{ p.sku }}</td>
              <td class="px-4 py-3 font-medium">{{ p.name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ p.category?.name || '-' }}</td>
              <td class="px-4 py-3 text-right">{{ formatMoney(Number(p.salePrice)) }}</td>
              <td class="px-4 py-3 text-right text-slate-500">{{ formatMoney(Number(p.costPrice)) }}</td>
              <td class="px-4 py-3 text-right" :class="p.stock <= p.minStock ? 'text-red-600 font-semibold' : ''">{{ p.stock }}</td>
              <td v-if="auth.isAdmin" class="px-4 py-3 text-right space-x-2">
                <button class="text-primary-600 hover:underline" @click="openEdit(p)">Editar</button>
                <button class="text-red-500 hover:underline" @click="remove(p.id)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" :title="editing ? 'Editar producto' : 'Nuevo producto'" @close="showModal = false">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">SKU</label><input v-model="form.sku" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Nombre</label><input v-model="form.name" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div class="sm:col-span-2"><label class="text-sm font-medium">Descripción</label><input v-model="form.description" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Precio venta</label><input v-model.number="form.salePrice" type="number" step="0.01" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Precio costo</label><input v-model.number="form.costPrice" type="number" step="0.01" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div v-if="!editing"><label class="text-sm font-medium">Stock inicial</label><input v-model.number="form.stock" type="number" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Stock mínimo</label><input v-model.number="form.minStock" type="number" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        <div><label class="text-sm font-medium">Categoría</label>
          <select v-model="form.categoryId" class="w-full mt-1 px-3 py-2 border rounded-lg">
            <option :value="undefined">Sin categoría</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 text-slate-600" @click="showModal = false">Cancelar</button>
        <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="save">Guardar</button>
      </template>
    </AppModal>
    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
