<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  icon?: string
  trend?: string
  color?: 'brand' | 'blue' | 'amber' | 'red' | 'purple'
}>()

const colors = {
  brand: 'from-emerald-500 to-teal-600',
  blue: 'from-blue-500 to-indigo-600',
  amber: 'from-amber-500 to-orange-600',
  red: 'from-red-500 to-rose-600',
  purple: 'from-purple-500 to-violet-600',
}
const bgColors = {
  brand: 'bg-emerald-50',
  blue: 'bg-blue-50',
  amber: 'bg-amber-50',
  red: 'bg-red-50',
  purple: 'bg-purple-50',
}
</script>

<template>
  <div class="card p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div class="relative z-10">
        <p class="text-sm font-medium text-slate-500">{{ title }}</p>
        <p class="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{{ value }}</p>
        <p v-if="trend" class="text-xs text-slate-400 mt-1">{{ trend }}</p>
      </div>
      <div
        :class="['w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-sm', bgColors[color || 'brand']]"
      >
        {{ icon }}
      </div>
    </div>
    <div
      :class="['absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br', colors[color || 'brand']]"
    />
  </div>
</template>
