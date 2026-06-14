<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useLoadingStore } from '@/stores/loading'

const { visible, message } = storeToRefs(useLoadingStore())
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 max-w-xs mx-4 pointer-events-auto">
        <div class="w-11 h-11 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p class="text-sm font-semibold text-slate-800 text-center">{{ message }}</p>
        <p class="text-xs text-slate-400 text-center">No cierres ni pulses de nuevo</p>
      </div>
    </div>
  </Teleport>
</template>
