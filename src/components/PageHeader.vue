<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()

defineSlots<{ actions?: () => unknown }>()
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-2xl font-bold text-slate-900 tracking-tight">{{ title }}</h2>
      <p v-if="subtitle" class="text-sm text-slate-500 mt-1">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
