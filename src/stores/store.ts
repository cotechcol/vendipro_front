import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/client'
import type { Store } from '@/types'

export const useStoreStore = defineStore('store', () => {
  const stores = ref<Store[]>([])
  const activeStoreId = ref<number | null>(
    JSON.parse(localStorage.getItem('activeStoreId') || 'null'),
  )

  function setActiveStore(id: number | null) {
    activeStoreId.value = id
    localStorage.setItem('activeStoreId', JSON.stringify(id))
  }

  async function fetchStores() {
    const { data } = await api.get('/stores')
    stores.value = data
    return data as Store[]
  }

  function getActiveStoreName() {
    if (!activeStoreId.value) return null
    return stores.value.find((s) => s.id === activeStoreId.value)?.name ?? null
  }

  return { stores, activeStoreId, setActiveStore, fetchStores, getActiveStoreName }
})
