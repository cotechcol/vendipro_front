<script setup lang="ts">
defineProps<{ show: boolean; title: string; size?: 'sm' | 'md' | 'lg' }>()
defineEmits<{ close: [] }>()

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div
          :class="[
            'relative bg-white rounded-xl shadow-xl w-full flex flex-col max-h-[calc(100dvh-2rem)]',
            widths[size || 'md'],
          ]"
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h3 class="text-lg font-semibold">{{ title }}</h3>
            <button class="text-slate-400 hover:text-slate-600 text-xl leading-none" @click="$emit('close')">&times;</button>
          </div>
          <div class="p-6 overflow-y-auto flex-1 min-h-0">
            <slot />
          </div>
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0 bg-white rounded-b-xl">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
