import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const isAdmin = computed(() =>
    user.value?.role === 'admin' || user.value?.role === 'super_admin',
  )
  const isStoreAdmin = computed(() => user.value?.role === 'admin')

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })
      token.value = data.accessToken
      user.value = data.user
      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.user.storeId) {
        localStorage.setItem('activeStoreId', JSON.stringify(data.user.storeId))
      }
      return data
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('activeStoreId')
  }

  async function fetchProfile() {
    const { data } = await api.get('/auth/me')
    user.value = data
    localStorage.setItem('user', JSON.stringify(data))
  }

  return {
    user, token, loading,
    isAuthenticated, isSuperAdmin, isAdmin, isStoreAdmin,
    login, logout, fetchProfile,
  }
})
