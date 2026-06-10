<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/constants/brand'

const auth = useAuthStore()
const router = useRouter()
const email = ref('super@pos.local')
const password = ref('super123')
const error = ref('')

async function handleLogin() {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch {
    error.value = 'Credenciales inválidas. Verifica tu email y contraseña.'
  }
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left panel -->
    <div class="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden items-center justify-center p-12">
      <div class="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-transparent to-teal-600/10" />
      <div class="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      <div class="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div class="relative z-10 max-w-md">
        <div class="flex items-center gap-4 mb-8">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-2xl font-bold shadow-xl shadow-emerald-900/40">
            V
          </div>
          <div>
            <h1 class="text-3xl font-bold text-white tracking-tight">{{ APP_NAME }}</h1>
            <p class="text-emerald-400/80 text-sm">{{ APP_TAGLINE }}</p>
          </div>
        </div>
        <p class="text-slate-400 text-lg leading-relaxed">{{ APP_DESCRIPTION }}</p>
        <div class="mt-10 grid grid-cols-2 gap-4">
          <div class="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <p class="text-2xl font-bold text-white">POS</p>
            <p class="text-xs text-slate-500 mt-1">Ventas rápidas</p>
          </div>
          <div class="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <p class="text-2xl font-bold text-white">Stock</p>
            <p class="text-xs text-slate-500 mt-1">Inventario en tiempo real</p>
          </div>
          <div class="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <p class="text-2xl font-bold text-white">Reportes</p>
            <p class="text-xs text-slate-500 mt-1">Análisis por producto</p>
          </div>
          <div class="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <p class="text-2xl font-bold text-white">Caja</p>
            <p class="text-xs text-slate-500 mt-1">Control de turnos</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right panel - form -->
    <div class="flex-1 flex items-center justify-center p-6 bg-surface">
      <div class="w-full max-w-md">
        <div class="lg:hidden flex items-center gap-3 mb-8 justify-center">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-bold text-white">V</div>
          <span class="text-xl font-bold">{{ APP_NAME }}</span>
        </div>

        <div class="card p-8">
          <h2 class="text-2xl font-bold text-slate-900">Bienvenido</h2>
          <p class="text-slate-500 mt-1 mb-8">Ingresa a tu cuenta para continuar</p>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input v-model="email" type="email" required class="input" placeholder="tu@email.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
              <input v-model="password" type="password" required class="input" placeholder="••••••••" />
            </div>
            <p v-if="error" class="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-xl">{{ error }}</p>
            <button type="submit" :disabled="auth.loading" class="btn-primary w-full py-3 text-base">
              {{ auth.loading ? 'Ingresando...' : 'Iniciar sesión' }}
            </button>
          </form>
          <p class="text-xs text-slate-400 mt-4 text-center leading-relaxed">
            Demo: super@pos.local / super123<br>
            admin@pos.local (Bogotá) · admin2@pos.local (Cali) / admin123
          </p>
        </div>
        <p class="text-center text-xs text-slate-400 mt-6">{{ APP_NAME }} &copy; {{ new Date().getFullYear() }}</p>
      </div>
    </div>
  </div>
</template>
