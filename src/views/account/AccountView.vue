<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import Toast from '@/components/Toast.vue'

const auth = useAuthStore()
const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const saving = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

async function save() {
  if (form.value.newPassword !== form.value.confirmPassword) {
    toast.value = { show: true, message: 'Las contraseñas nuevas no coinciden', type: 'error' }
    return
  }
  if (form.value.newPassword.length < 6) {
    toast.value = { show: true, message: 'La nueva contraseña debe tener al menos 6 caracteres', type: 'error' }
    return
  }

  saving.value = true
  try {
    await api.patch('/auth/change-password', {
      currentPassword: form.value.currentPassword,
      newPassword: form.value.newPassword,
    })
    form.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    toast.value = { show: true, message: 'Contraseña actualizada correctamente', type: 'success' }
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    toast.value = {
      show: true,
      message: Array.isArray(msg) ? msg.join(', ') : (msg || 'Error al cambiar la contraseña'),
      type: 'error',
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-lg">
    <PageHeader title="Mi cuenta" subtitle="Actualiza tu contraseña de acceso" />

    <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
          {{ auth.user?.name?.charAt(0) }}
        </div>
        <div>
          <p class="font-semibold text-slate-900">{{ auth.user?.name }}</p>
          <p class="text-sm text-slate-500">{{ auth.user?.email }}</p>
        </div>
      </div>

      <div>
        <label class="text-sm font-medium text-slate-700">Contraseña actual</label>
        <div class="relative mt-1">
          <input
            v-model="form.currentPassword"
            :type="showCurrent ? 'text' : 'password'"
            autocomplete="current-password"
            class="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm px-2"
            @click="showCurrent = !showCurrent"
          >
            {{ showCurrent ? 'Ocultar' : 'Ver' }}
          </button>
        </div>
      </div>

      <div>
        <label class="text-sm font-medium text-slate-700">Nueva contraseña</label>
        <div class="relative mt-1">
          <input
            v-model="form.newPassword"
            :type="showNew ? 'text' : 'password'"
            autocomplete="new-password"
            class="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm px-2"
            @click="showNew = !showNew"
          >
            {{ showNew ? 'Ocultar' : 'Ver' }}
          </button>
        </div>
        <p class="text-xs text-slate-400 mt-1">Mínimo 6 caracteres</p>
      </div>

      <div>
        <label class="text-sm font-medium text-slate-700">Confirmar nueva contraseña</label>
        <div class="relative mt-1">
          <input
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            class="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm px-2"
            @click="showConfirm = !showConfirm"
          >
            {{ showConfirm ? 'Ocultar' : 'Ver' }}
          </button>
        </div>
      </div>

      <button
        :disabled="saving || !form.currentPassword || !form.newPassword || !form.confirmPassword"
        class="w-full sm:w-auto bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
        @click="save"
      >
        {{ saving ? 'Guardando...' : 'Cambiar contraseña' }}
      </button>
    </div>

    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
