<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import type { Product, ProductOption } from '@/types'
import { formatMoney } from '@/utils/format'
import {
  canSelectFlavorOption,
  optionHasStock,
  optionAvailableUnits,
  calculateItemUnitPrice,
} from '@/utils/product-options'

const props = defineProps<{
  show: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [selectedOptionIds: number[], label: string, unitPrice: number]
}>()

const flavorSelections = ref<number[]>([])
const containerSelection = ref<number | null>(null)
const addonSelections = ref<number[]>([])

const isComposite = computed(() => props.product?.productType === 'composite')

const flavorGroup = computed(() =>
  props.product?.optionGroups?.find((g) => g.kind === 'flavor'),
)

const containerGroup = computed(() =>
  props.product?.optionGroups?.find((g) => g.kind === 'container'),
)

const addonGroup = computed(() =>
  props.product?.optionGroups?.find((g) => g.kind === 'addon'),
)

const scoopCount = computed(() => props.product?.scoopCount ?? 1)

const unitPrice = computed(() => {
  if (!props.product) return 0
  const ids = isComposite.value
    ? addonSelections.value
    : [...flavorSelections.value.filter(Boolean), ...(containerSelection.value ? [containerSelection.value] : [])]
  return calculateItemUnitPrice(props.product, ids)
})

function canSelectFlavor(scoopIndex: number, opt: ProductOption): boolean {
  return canSelectFlavorOption(opt, scoopIndex, flavorSelections.value)
}

function canSelectContainer(opt: ProductOption): boolean {
  return optionHasStock(opt)
}

function canSelectAddon(opt: ProductOption): boolean {
  return optionHasStock(opt)
}

function containerStockLabel(opt: ProductOption): string {
  const units = optionAvailableUnits(opt)
  if (units <= 0) return 'Sin stock'
  const ing = opt.ingredient
  if (ing?.stockUnit === 'g' || ing?.stockUnit === 'ml') {
    return `${units} disp.`
  }
  return `${units} uds`
}

function selectContainer(opt: ProductOption) {
  if (!canSelectContainer(opt)) return
  containerSelection.value = opt.id
}

function toggleAddon(opt: ProductOption) {
  if (!canSelectAddon(opt)) return
  const idx = addonSelections.value.indexOf(opt.id)
  if (idx >= 0) {
    addonSelections.value.splice(idx, 1)
  } else {
    addonSelections.value.push(opt.id)
  }
}

const canConfirm = computed(() => {
  if (isComposite.value) {
    for (const id of addonSelections.value) {
      const opt = addonGroup.value?.options.find((o) => o.id === id)
      if (!opt || !canSelectAddon(opt)) return false
    }
    return true
  }

  if (flavorSelections.value.filter(Boolean).length !== scoopCount.value) return false
  if (containerSelection.value == null) return false

  for (let i = 0; i < scoopCount.value; i++) {
    const id = flavorSelections.value[i]
    const opt = flavorGroup.value?.options.find((o) => o.id === id)
    if (!id || !opt || !canSelectFlavor(i, opt)) return false
  }

  const containerOpt = containerGroup.value?.options.find((o) => o.id === containerSelection.value)
  return !!containerOpt && canSelectContainer(containerOpt)
})

function reset() {
  flavorSelections.value = Array(scoopCount.value).fill(0)
  containerSelection.value = null
  addonSelections.value = []
}

watch(() => props.show, (visible) => {
  if (visible) reset()
})

watch(flavorSelections, () => {
  if (containerSelection.value == null) return
  const opt = containerGroup.value?.options.find((o) => o.id === containerSelection.value)
  if (opt && !canSelectContainer(opt)) containerSelection.value = null
}, { deep: true })

function selectFlavor(scoopIndex: number, opt: ProductOption) {
  if (!canSelectFlavor(scoopIndex, opt)) return
  flavorSelections.value[scoopIndex] = opt.id
}

function buildLabel(): string {
  const labels: string[] = []

  if (isComposite.value && addonGroup.value) {
    const addonNames = addonSelections.value
      .map((id) => addonGroup.value?.options.find((o) => o.id === id)?.name)
      .filter(Boolean)
    if (addonNames.length) labels.push(`+ ${addonNames.join(', ')}`)
    return labels.join('')
  }

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
  if (!canConfirm.value || !props.product) return
  const ids = isComposite.value
    ? [...addonSelections.value]
    : [...flavorSelections.value.filter(Boolean), containerSelection.value!]
  emit('confirm', ids, buildLabel(), unitPrice.value)
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
      <template v-if="isComposite && addonGroup">
        <p class="text-sm text-slate-500">
          Precio base: {{ formatMoney(Number(product.salePrice)) }}.
          Elige adicionales si el cliente los quiere.
        </p>

        <div class="space-y-2">
          <h4 class="font-medium text-sm">{{ addonGroup.name }}</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in addonGroup.options"
              :key="opt.id"
              type="button"
              :disabled="!canSelectAddon(opt)"
              class="px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :class="addonSelections.includes(opt.id)
                ? 'bg-primary-600 text-white border-primary-600'
                : canSelectAddon(opt)
                  ? 'bg-white border-slate-200 hover:border-primary-400'
                  : 'bg-slate-50 border-slate-100 text-slate-400'"
              @click="toggleAddon(opt)"
            >
              {{ opt.name }}
              <span class="block text-[10px] font-normal" :class="addonSelections.includes(opt.id) ? 'text-primary-100' : 'text-slate-500'">
                +{{ formatMoney(Number(opt.unitPrice ?? 0)) }}
              </span>
            </button>
          </div>
        </div>

        <p class="text-base font-semibold text-slate-900 pt-2 border-t">
          Total: {{ formatMoney(unitPrice) }}
        </p>
      </template>

      <template v-else>
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
                :disabled="!canSelectFlavor(idx, opt)"
                :title="canSelectFlavor(idx, opt) ? opt.name : `${opt.name} — sin stock`"
                class="px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :class="flavorSelections[idx] === opt.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : canSelectFlavor(idx, opt)
                    ? 'bg-white border-slate-200 hover:border-primary-400'
                    : 'bg-slate-50 border-slate-100 text-slate-400'"
                @click="selectFlavor(idx, opt)"
              >
                {{ opt.name }}
                <span
                  v-if="!canSelectFlavor(idx, opt)"
                  class="block text-[10px] font-normal text-red-400"
                >
                  Sin stock
                </span>
                <span
                  v-else-if="optionAvailableUnits(opt) <= 3"
                  class="block text-[10px] font-normal text-slate-400"
                >
                  {{ optionAvailableUnits(opt) }} disp.
                </span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="containerGroup" class="space-y-2">
          <h4 class="font-medium text-sm">{{ containerGroup.name }}</h4>
          <p class="text-xs text-slate-500">Solo se muestran envases con stock disponible.</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in containerGroup.options"
              :key="opt.id"
              type="button"
              :disabled="!canSelectContainer(opt)"
              :title="canSelectContainer(opt) ? `${opt.name} (${containerStockLabel(opt)})` : `${opt.name} — sin stock`"
              class="px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :class="containerSelection === opt.id
                ? 'bg-primary-600 text-white border-primary-600'
                : canSelectContainer(opt)
                  ? 'bg-white border-slate-200 hover:border-primary-400'
                  : 'bg-slate-50 border-slate-100 text-slate-400'"
              @click="selectContainer(opt)"
            >
              {{ opt.name }}
              <span
                class="block text-[10px] font-normal"
                :class="containerSelection === opt.id ? 'text-primary-100' : canSelectContainer(opt) ? 'text-slate-400' : 'text-red-400'"
              >
                {{ containerStockLabel(opt) }}
              </span>
            </button>
          </div>
        </div>
      </template>
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
