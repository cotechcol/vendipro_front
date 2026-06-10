import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/client'
import type { CashSession, Setting } from '@/types'

export const useAppStore = defineStore('app', () => {
  const cashSession = ref<CashSession | null>(null)
  const settings = ref<Setting | null>(null)

  async function fetchCashSession() {
    const { data } = await api.get('/cash-sessions/current')
    cashSession.value = data
    return data
  }

  async function openCash(openingAmount: number) {
    const { data } = await api.post('/cash-sessions/open', { openingAmount })
    cashSession.value = data
    await fetchCashSession()
    return cashSession.value
  }

  async function closeCash(id: number, closingAmount: number, notes?: string) {
    const { data } = await api.post(`/cash-sessions/${id}/close`, { closingAmount, notes })
    cashSession.value = null
    return data
  }

  async function fetchSettings() {
    const { data } = await api.get('/settings')
    settings.value = data
    return data
  }

  return { cashSession, settings, fetchCashSession, openCash, closeCash, fetchSettings }
})
