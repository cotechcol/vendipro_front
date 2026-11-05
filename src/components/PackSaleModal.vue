<script setup lang="ts">
import AppModal from '@/components/AppModal.vue'
import type { Product } from '@/types'
import { formatMoney, formatPackStock } from '@/utils/format'

const props = defineProps<{
  show: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [soldAsUnit: boolean]
}>()

function packCount(): number {
  if (!props.product) return 0
  const per = Math.max(1, Math.floor(Number(props.product.unitsPerPack) || 1))
  const total = Math.floor(Number(props.product.stock) || 0) * per
    + Math.floor(Number(props.product.looseUnits) || 0)
  return Math.floor(total / per)
}

function unitCount(): number {
  if (!props.product) return 0
  const per = Math.max(1, Math.floor(Number(props.product.unitsPerPack) || 1))
  return Math.floor(Number(props.product.stock) || 0) * per
    + Math.floor(Number(props.product.looseUnits) || 0)
}
</script>

<template>
  <AppModal :show="show" title="¿Cómo lo vendes?" size="sm" @close="emit('close')">
    <div v-if="product" class="space-y-3">
      <p class="font-semibold text-slate-900">{{ product.name }}</p>
      <p class="text-sm text-slate-500">
        {{ formatPackStock(product.stock, product.looseUnits) }}
        · {{ product.unitsPerPack }} uds por caja
      </p>
      <button
        type="button"
        class="w-full text-left border rounded-xl p-4 hover:border-primary-500 hover:bg-primary-50 disabled:opacity-50"
        :disabled="packCount() <= 0"
        @click="emit('confirm', false)"
      >
        <p class="font-semibold">Caja completa</p>
        <p class="text-primary-700 font-bold text-lg">{{ formatMoney(Number(product.salePrice)) }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ packCount() }} caja{{ packCount() === 1 ? '' : 's' }} disponible{{ packCount() === 1 ? '' : 's' }}</p>
      </button>
      <button
        type="button"
        class="w-full text-left border rounded-xl p-4 hover:border-primary-500 hover:bg-primary-50 disabled:opacity-50"
        :disabled="unitCount() <= 0"
        @click="emit('confirm', true)"
      >
        <p class="font-semibold">Por unidad</p>
        <p class="text-primary-700 font-bold text-lg">{{ formatMoney(Number(product.unitSalePrice)) }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ unitCount() }} unidad{{ unitCount() === 1 ? '' : 'es' }} disponible{{ unitCount() === 1 ? '' : 's' }}</p>
      </button>
    </div>
  </AppModal>
</template>
