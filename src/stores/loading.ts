import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

function messageFor(url: string): string {
  if (url.includes('/sales')) return 'Procesando venta...'
  if (url.includes('/purchases')) return 'Registrando compra...'
  if (url.includes('/inventory/adjust')) return 'Ajustando inventario...'
  if (url.includes('/cash-sessions')) return 'Procesando caja...'
  if (url.includes('/auth/login')) return 'Iniciando sesión...'
  if (url.includes('/auth/change-password')) return 'Actualizando contraseña...'
  if (url.includes('/products')) return 'Guardando producto...'
  if (url.includes('/users')) return 'Guardando usuario...'
  if (url.includes('/customers')) return 'Guardando cliente...'
  if (url.includes('/suppliers')) return 'Guardando proveedor...'
  if (url.includes('/categories')) return 'Guardando categoría...'
  if (url.includes('/stores')) return 'Guardando tienda...'
  if (url.includes('/settings')) return 'Guardando configuración...'
  return 'Procesando...'
}

export const useLoadingStore = defineStore('loading', () => {
  const pending = ref(0)
  const message = ref('Procesando...')
  const visible = ref(false)
  let showTimer: ReturnType<typeof setTimeout> | null = null

  function start(url: string) {
    pending.value++
    message.value = messageFor(url)
    if (!visible.value && !showTimer) {
      showTimer = setTimeout(() => {
        if (pending.value > 0) visible.value = true
        showTimer = null
      }, 120)
    }
  }

  function stop() {
    pending.value = Math.max(0, pending.value - 1)
    if (pending.value === 0) {
      visible.value = false
      if (showTimer) {
        clearTimeout(showTimer)
        showTimer = null
      }
    }
  }

  const isBusy = computed(() => pending.value > 0)

  return { visible, message, isBusy, start, stop }
})
