<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/client'
import { useAppStore } from '@/stores/app'
import Toast from '@/components/Toast.vue'

const app = useAppStore()
const form = ref({ businessName: '', address: '', phone: '', taxRate: 0.19, currency: 'COP' })
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const saving = ref(false)

onMounted(async () => {
  const settings = await app.fetchSettings()
  if (settings) {
    form.value = {
      businessName: settings.businessName,
      address: settings.address || '',
      phone: settings.phone || '',
      taxRate: Number(settings.taxRate),
      currency: settings.currency,
    }
  }
})

async function save() {
  saving.value = true
  try {
    await api.patch('/settings', form.value)
    await app.fetchSettings()
    toast.value = { show: true, message: 'Configuración guardada', type: 'success' }
  } catch {
    toast.value = { show: true, message: 'Error al guardar', type: 'error' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h2 class="text-2xl font-bold mb-6">Configuración</h2>
    <div class="bg-white rounded-xl border p-6 space-y-4">
      <div><label class="text-sm font-medium">Nombre del negocio</label><input v-model="form.businessName" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
      <div><label class="text-sm font-medium">Dirección</label><input v-model="form.address" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
      <div><label class="text-sm font-medium">Teléfono</label><input v-model="form.phone" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
      <div><label class="text-sm font-medium">IVA (%)</label><input v-model.number="form.taxRate" type="number" step="0.01" min="0" max="1" class="w-full mt-1 px-3 py-2 border rounded-lg" />
        <p class="text-xs text-slate-400 mt-1">Ej: 0.19 = 19% (IVA Colombia). Precios con IVA incluido.</p>
      </div>
      <div><label class="text-sm font-medium">Moneda</label><input v-model="form.currency" class="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
      <button :disabled="saving" class="bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50" @click="save">
        {{ saving ? 'Guardando...' : 'Guardar configuración' }}
      </button>
    </div>
    <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
