<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useStoreStore } from '@/stores/store'
import AppModal from '@/components/AppModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import Toast from '@/components/Toast.vue'
import type { Store } from '@/types'

interface UserRow {
  id: number
  name: string
  email: string
  role: string
  active: boolean
  storeId?: number | null
  storeName?: string | null
}

const auth = useAuthStore()
const storeStore = useStoreStore()
const users = ref<UserRow[]>([])
const stores = ref<Store[]>([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref<UserRow | null>(null)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const form = ref({ name: '', email: '', password: '', role: 'cashier', storeId: 0 as number | undefined })

const roleOptions = computed(() => {
  if (auth.isSuperAdmin) {
    return [
      { value: 'super_admin', label: 'Super Admin' },
      { value: 'admin', label: 'Admin de tienda' },
      { value: 'cashier', label: 'Cajero' },
    ]
  }
  return [
    { value: 'admin', label: 'Admin de tienda' },
    { value: 'cashier', label: 'Cajero' },
  ]
})

function roleLabel(role: string) {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Administrador'
  return 'Cajero'
}

async function load() {
  loading.value = true
  try {
    const [usersRes, storesRes] = await Promise.all([
      api.get('/users', { params: { limit: 100 } }),
      auth.isSuperAdmin ? api.get('/stores') : Promise.resolve({ data: [] }),
    ])
    users.value = usersRes.data.data
    stores.value = storesRes.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = {
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    storeId: auth.user?.storeId ?? stores.value[0]?.id,
  }
  showModal.value = true
}

function openEdit(u: UserRow) {
  editing.value = u
  form.value = {
    name: u.name,
    email: u.email,
    password: '',
    role: u.role,
    storeId: u.storeId ?? undefined,
  }
  showModal.value = true
}

async function save() {
  try {
    const payload: Record<string, unknown> = {
      name: form.value.name,
      email: form.value.email,
      role: form.value.role,
    }
    if (form.value.password) payload.password = form.value.password
    if (form.value.role !== 'super_admin') payload.storeId = form.value.storeId

    if (editing.value) {
      await api.patch(`/users/${editing.value.id}`, payload)
    } else {
      await api.post('/users', { ...payload, password: form.value.password })
    }
    showModal.value = false
    toast.value = { show: true, message: 'Usuario guardado', type: 'success' }
    await load()
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'
    toast.value = { show: true, message: msg, type: 'error' }
  }
}

onMounted(async () => {
  if (auth.isSuperAdmin) await storeStore.fetchStores()
  await load()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Usuarios" subtitle="Gestión de accesos por tienda">
      <template #actions>
        <button class="btn-primary" @click="openCreate">+ Nuevo usuario</button>
      </template>
    </PageHeader>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="text-left px-6 py-3 font-medium">Nombre</th>
            <th class="text-left px-6 py-3 font-medium">Email</th>
            <th class="text-left px-6 py-3 font-medium">Rol</th>
            <th class="text-left px-6 py-3 font-medium hidden sm:table-cell">Tienda</th>
            <th class="text-left px-6 py-3 font-medium">Estado</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50/80">
            <td class="px-6 py-4 font-medium">{{ u.name }}</td>
            <td class="px-6 py-4">{{ u.email }}</td>
            <td class="px-6 py-4">
              <span class="badge-neutral">{{ roleLabel(u.role) }}</span>
            </td>
            <td class="px-6 py-4 text-slate-500 hidden sm:table-cell">{{ u.storeName || '—' }}</td>
            <td class="px-6 py-4">{{ u.active ? 'Activo' : 'Inactivo' }}</td>
            <td class="px-6 py-4 text-right">
              <button class="text-brand-600 text-xs font-medium hover:underline" @click="openEdit(u)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal :show="showModal" :title="editing ? 'Editar usuario' : 'Nuevo usuario'" @close="showModal = false">
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-slate-700">Nombre</label>
          <input v-model="form.name" class="input mt-1.5" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Email</label>
          <input v-model="form.email" type="email" class="input mt-1.5" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">
            Contraseña{{ editing ? ' (dejar vacío para no cambiar)' : '' }}
          </label>
          <input v-model="form.password" type="password" class="input mt-1.5" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Rol</label>
          <select v-model="form.role" class="input mt-1.5">
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div v-if="form.role !== 'super_admin'">
          <label class="text-sm font-medium text-slate-700">Tienda</label>
          <select v-model.number="form.storeId" class="input mt-1.5">
            <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
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
