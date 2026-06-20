import axios from 'axios'
import { useLoadingStore } from '@/stores/loading'

const MUTATING_METHODS = new Set(['post', 'patch', 'put', 'delete'])

/** Backend en Vercel usa prefijo /api; normaliza URLs de producción mal configuradas */
function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api'
  if (!raw.startsWith('http')) return raw
  const base = raw.replace(/\/+$/, '')
  return base.endsWith('/api') ? base : `${base}/api`
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

function trackLoading(config: { method?: string; url?: string }, start: boolean) {
  const method = config.method?.toLowerCase()
  if (!method || !MUTATING_METHODS.has(method)) return
  const store = useLoadingStore()
  const url = config.url || ''
  if (start) store.start(url)
  else store.stop()
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  const activeStoreId = localStorage.getItem('activeStoreId')
  if (activeStoreId && activeStoreId !== 'null') {
    const parsed = JSON.parse(activeStoreId)
    if (parsed) config.headers['X-Store-Id'] = String(parsed)
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  trackLoading(config, true)
  return config
})

api.interceptors.response.use(
  (res) => {
    trackLoading(res.config, false)
    return res
  },
  (err) => {
    if (err.config) trackLoading(err.config, false)
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('activeStoreId')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default api
