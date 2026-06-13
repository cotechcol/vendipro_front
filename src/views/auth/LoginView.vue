<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/constants/brand'

const auth = useAuthStore()
const router = useRouter()
const email = ref('super@pos.local')
const password = ref('super123')
const showPassword = ref(false)
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
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="input pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
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
