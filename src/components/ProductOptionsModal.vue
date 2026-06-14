<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import type { Product } from '@/types'

const props = defineProps<{
  show: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [selectedOptionIds: number[], label: string]
}>()

const flavorSelections = ref<number[]>([])
const containerSelection = ref<number | null>(null)

const flavorGroup = computed(() =>
  props.product?.optionGroups?.find((g) => g.kind === 'flavor'),
)

const containerGroup = computed(() =>
  props.product?.optionGroups?.find((g) => g.kind === 'container'),
)

const scoopCount = computed(() => props.product?.scoopCount ?? 1)

const canConfirm = computed(() => {
  const flavorsOk = flavorSelections.value.filter(Boolean).length === scoopCount.value
  const containerOk = containerSelection.value != null
  return flavorsOk && containerOk
})

function reset() {
  flavorSelections.value = Array(scoopCount.value).fill(0)
  containerSelection.value = null
}

watch(() => props.show, (visible) => {
  if (visible) reset()
})

function selectFlavor(scoopIndex: number, optionId: number) {
  flavorSelections.value[scoopIndex] = optionId
}

function buildLabel(): string {
  const labels: string[] = []
  const fg = flavorGroup.value
  const cg = containerGroup.value

  if (fg) {
    const flavorNames = flavorSelections.value
      .map((id) => fg.options.find((o) => o.id === id)?.name)
      .filter(Boolean)
    if (flavorNames.length) labels.push(flavorNames.join(' + '))
  }

  if (cg && containerSelection.value) {
    const containerName = cg.options.find((o) => o.id === containerSelection.value)?.name
    if (containerName) labels.push(containerName)
  }

  return labels.join(', ')
}

function confirm() {
  if (!canConfirm.value) return
  const ids = [
    ...flavorSelections.value.filter(Boolean),
    containerSelection.value!,
  ]
  emit('confirm', ids, buildLabel())
}
</script>

<template>
  <AppModal
    :show="show && !!product"
    :title="product?.name ?? 'Opciones'"
    size="md"
    @close="emit('close')"
  >
    <div v-if="product" class="space-y-5">
      <p class="text-sm text-slate-500">
        Elige {{ scoopCount }} sabor{{ scoopCount > 1 ? 'es' : '' }} y el envase. El precio no cambia.
      </p>

      <div v-if="flavorGroup" class="space-y-3">
        <h4 class="font-medium text-sm">{{ flavorGroup.name }}</h4>
        <div v-for="(_, idx) in scoopCount" :key="idx" class="space-y-1">
          <p class="text-xs text-slate-500">Bola {{ idx + 1 }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in flavorGroup.options"
              :key="`${idx}-${opt.id}`"
              type="button"
              class="px-3 py-2 rounded-lg border text-sm transition-colors"
              :class="flavorSelections[idx] === opt.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white border-slate-200 hover:border-primary-400'"
              @click="selectFlavor(idx, opt.id)"
            >
              {{ opt.name }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="containerGroup" class="space-y-2">
        <h4 class="font-medium text-sm">{{ containerGroup.name }}</h4>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in containerGroup.options"
            :key="opt.id"
            type="button"
            class="px-3 py-2 rounded-lg border text-sm transition-colors"
            :class="containerSelection === opt.id
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white border-slate-200 hover:border-primary-400'"
            @click="containerSelection = opt.id"
          >
            {{ opt.name }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="px-4 py-2 text-slate-600" @click="emit('close')">Cancelar</button>
      <button
        class="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
        :disabled="!canConfirm"
        @click="confirm"
      >
        Agregar al carrito
      </button>
    </template>
  </AppModal>
</template>
