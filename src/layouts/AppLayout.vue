<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useStoreStore } from '@/stores/store'
import { APP_NAME, APP_TAGLINE } from '@/constants/brand'

const auth = useAuthStore()
const app = useAppStore()
const storeStore = useStoreStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◈', roles: ['super_admin', 'admin', 'cashier'] },
  { to: '/pos', label: 'Punto de Venta', icon: '⬡', roles: ['super_admin', 'admin', 'cashier'], highlight: true },
  { to: '/products', label: 'Productos', icon: '▣', roles: ['super_admin', 'admin', 'cashier'] },
  { to: '/categories', label: 'Categorías', icon: '◫', roles: ['super_admin', 'admin'] },
  { to: '/inventory', label: 'Inventario', icon: '▤', roles: ['super_admin', 'admin'] },
  { to: '/customers', label: 'Clientes', icon: '◎', roles: ['super_admin', 'admin', 'cashier'] },
  { to: '/suppliers', label: 'Proveedores', icon: '▥', roles: ['super_admin', 'admin'] },
  { to: '/purchases', label: 'Compras', icon: '◉', roles: ['super_admin', 'admin'] },
  { to: '/cash', label: 'Caja', icon: '◆', roles: ['super_admin', 'admin', 'cashier'] },
  { to: '/reports', label: 'Reportes', icon: '▲', roles: ['super_admin', 'admin', 'cashier'] },
  { to: '/stores', label: 'Tiendas', icon: '▦', roles: ['super_admin'] },
  { to: '/users', label: 'Usuarios', icon: '●', roles: ['super_admin', 'admin'] },
  { to: '/settings', label: 'Configuración', icon: '⚙', roles: ['super_admin', 'admin'] },
]

const filteredNav = computed(() =>
  navItems.filter((item) => auth.user && item.roles.includes(auth.user.role)),
)

const roleLabel = computed(() => {
  const r = auth.user?.role
  if (r === 'super_admin') return 'Super Admin'
  if (r === 'admin') return 'Administrador'
  return 'Cajero'
})

const activeStoreLabel = computed(() => {
  if (auth.user?.storeName) return auth.user.storeName
  if (storeStore.activeStoreId) {
    return storeStore.stores.find((s) => s.id === storeStore.activeStoreId)?.name ?? 'Tienda seleccionada'
  }
  return auth.isSuperAdmin ? 'Todas las tiendas' : null
})

const needsStoreSelection = computed(() =>
  auth.isSuperAdmin && !storeStore.activeStoreId && route.path !== '/stores',
)

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

async function loadStoreData() {
  const hasStore = auth.user?.storeId || storeStore.activeStoreId
  if (!hasStore && auth.isSuperAdmin) return
  try {
    await app.fetchSettings()
    await app.fetchCashSession()
  } catch {
    /* store not selected yet */
  }
}

function onStoreChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  storeStore.setActiveStore(val ? Number(val) : null)
  loadStoreData()
}

function handleLogout() {
  sidebarOpen.value = false
  auth.logout()
  router.push('/login')
}

onMounted(async () => {
  if (auth.isSuperAdmin) {
    await storeStore.fetchStores()
  }
  await loadStoreData()
})

watch(() => storeStore.activeStoreId, loadStoreData)
</script>

<template>
  <div class="min-h-screen flex bg-surface">
    <aside class="hidden lg:flex lg:flex-col w-[260px] h-screen sticky top-0 bg-sidebar text-white shrink-0">
      <div class="p-6 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-900/30">
            V
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight">{{ APP_NAME }}</h1>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest">{{ APP_TAGLINE }}</p>
          </div>
        </div>
        <p v-if="activeStoreLabel" class="text-xs text-emerald-400 mt-3 truncate">{{ activeStoreLabel }}</p>
        <p v-else-if="app.settings?.businessName" class="text-xs text-slate-500 mt-3 truncate">{{ app.settings.businessName }}</p>

        <div v-if="auth.isSuperAdmin" class="mt-3">
          <label class="text-[10px] text-slate-500 uppercase tracking-wide">Tienda activa</label>
          <select
            class="w-full mt-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white px-2 py-1.5"
            :value="storeStore.activeStoreId ?? ''"
            @change="onStoreChange"
          >
            <option value="">— Todas (consolidado) —</option>
            <option v-for="s in storeStore.stores" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </div>

      <nav class="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">
        <RouterLink
          v-for="item in filteredNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
          :class="isActive(item.to)
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
            : item.highlight
              ? 'text-emerald-300 hover:bg-white/5'
              : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span class="w-5 text-center text-xs opacity-70">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="shrink-0 p-4 border-t border-white/10">
        <div class="flex items-center gap-3 mb-3 px-2">
          <div class="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center text-xs font-bold text-emerald-300">
            {{ auth.user?.name?.charAt(0) }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-slate-500">{{ roleLabel }}</p>
          </div>
        </div>
        <div v-if="app.cashSession" class="flex items-center gap-2 text-xs text-emerald-400 mb-3 px-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Caja abierta
        </div>
        <RouterLink
          to="/account"
          class="block w-full text-sm text-slate-500 hover:text-white transition-colors py-2 px-2 rounded-lg hover:bg-white/5 mb-1"
        >
          Mi cuenta
        </RouterLink>
        <button
          class="w-full text-sm text-slate-500 hover:text-white transition-colors py-2 px-2 rounded-lg hover:bg-white/5"
          @click="handleLogout"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>

    <Teleport to="body">
      <div v-if="sidebarOpen" class="fixed inset-0 z-50 lg:hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="sidebarOpen = false" />
        <aside class="relative flex flex-col w-[280px] max-w-[85vw] h-full bg-sidebar text-white shadow-2xl">
          <div class="p-5 border-b border-white/10 flex justify-between items-center shrink-0">
            <div>
              <span class="font-bold text-lg">{{ APP_NAME }}</span>
              <p v-if="activeStoreLabel" class="text-xs text-emerald-400 mt-1 truncate">{{ activeStoreLabel }}</p>
            </div>
            <button class="text-slate-400 hover:text-white text-2xl leading-none p-1" @click="sidebarOpen = false">&times;</button>
          </div>

          <div v-if="auth.isSuperAdmin" class="px-4 py-3 border-b border-white/10 shrink-0">
            <label class="text-[10px] text-slate-500 uppercase tracking-wide">Tienda activa</label>
            <select
              class="w-full mt-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white px-2 py-2"
              :value="storeStore.activeStoreId ?? ''"
              @change="onStoreChange"
            >
              <option value="">— Todas (consolidado) —</option>
              <option v-for="s in storeStore.stores" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <nav class="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">
            <RouterLink
              v-for="item in filteredNav"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              :class="isActive(item.to)
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="sidebarOpen = false"
            >
              <span class="w-5 text-center text-xs">{{ item.icon }}</span>{{ item.label }}
            </RouterLink>
          </nav>

          <div class="shrink-0 p-4 border-t border-white/10">
            <div class="flex items-center gap-3 mb-3 px-2">
              <div class="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center text-xs font-bold text-emerald-300">
                {{ auth.user?.name?.charAt(0) }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ auth.user?.name }}</p>
                <p class="text-xs text-slate-500">{{ roleLabel }}</p>
              </div>
            </div>
            <div v-if="app.cashSession" class="flex items-center gap-2 text-xs text-emerald-400 mb-3 px-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Caja abierta
            </div>
            <RouterLink
              to="/account"
              class="block w-full text-sm text-slate-400 hover:text-white transition-colors py-2.5 px-2 rounded-lg hover:bg-white/5 mb-1"
              @click="sidebarOpen = false"
            >
              Mi cuenta
            </RouterLink>
            <button
              class="w-full text-sm text-red-300 hover:text-white transition-colors py-2.5 px-2 rounded-lg hover:bg-red-500/20 border border-red-500/30"
              @click="handleLogout"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
      </div>
    </Teleport>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
        <button class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100" @click="sidebarOpen = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <span class="font-bold text-slate-900">{{ APP_NAME }}</span>
        <span v-if="app.cashSession" class="badge-success text-[10px]">Caja</span>
        <span v-else class="w-10" />
      </header>

      <div v-if="needsStoreSelection" class="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
        Selecciona una tienda en el menú lateral para operar en una sucursal específica
      </div>

      <main class="flex-1 p-4 lg:p-8 overflow-auto pb-24 lg:pb-8">
        <RouterView />
      </main>

      <nav class="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200/80 flex justify-around py-2 z-30 safe-bottom">
        <RouterLink to="/" class="flex flex-col items-center text-[10px] px-3 py-1 rounded-xl" :class="route.path === '/' ? 'text-brand-600 font-semibold' : 'text-slate-400'">
          <span class="text-base mb-0.5">◈</span> Inicio
        </RouterLink>
        <RouterLink to="/pos" class="flex flex-col items-center text-[10px] px-3 py-1 rounded-xl" :class="route.path === '/pos' ? 'text-brand-600 font-semibold' : 'text-slate-400'">
          <span class="text-base mb-0.5">⬡</span> Venta
        </RouterLink>
        <RouterLink to="/reports" class="flex flex-col items-center text-[10px] px-3 py-1 rounded-xl" :class="route.path === '/reports' ? 'text-brand-600 font-semibold' : 'text-slate-400'">
          <span class="text-base mb-0.5">▲</span> Reportes
        </RouterLink>
        <RouterLink to="/cash" class="flex flex-col items-center text-[10px] px-3 py-1 rounded-xl" :class="route.path === '/cash' ? 'text-brand-600 font-semibold' : 'text-slate-400'">
          <span class="text-base mb-0.5">◆</span> Caja
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
