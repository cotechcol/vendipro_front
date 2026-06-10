<script setup lang="ts">
defineProps<{ message: string; type?: 'success' | 'error' | 'info' }>()
defineEmits<{ close: [] }>()

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[60] animate-[slideIn_0.3s_ease]">
      <div :class="['px-4 py-3 rounded-lg border shadow-lg flex items-center gap-3 min-w-[280px]', styles[type || 'info']]">
        <span class="flex-1 text-sm">{{ message }}</span>
        <button class="opacity-60 hover:opacity-100" @click="$emit('close')">&times;</button>
      </div>
    </div>
  </Teleport>
</template>

<style>
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
