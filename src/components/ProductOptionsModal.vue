<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import type { Product, ProductOption } from '@/types'
import { formatMoney } from '@/utils/format'
import {
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
  confirm: [selectedOptionIds: number[], label: string, unitPrice: number, portionScoopCount?: number]
}>()

const containerSelection = ref<number | null>(null)
const addonSelections = ref<number[]>([])
const selectedScoopCount = ref(1)

const isComposite = computed(() => props.product?.productType === 'composite')
const isSimple = computed(() => props.product?.productType === 'simple')
const isPortion = computed(() => props.product?.productType === 'portion')
const isAddonOnly = computed(() => isComposite.value || isSimple.value)

const containerGroup = computed(() =>
  props.product?.optionGroups?.find((g) => g.kind === 'container'),
)

const addonGroup = computed(() =>
  props.product?.optionGroups?.find((g) => g.kind === 'addon'),
)

const maxScoopCount = computed(() => props.product?.scoopCount ?? 1)
const variableScoops = computed(() => props.product?.variableScoops ?? false)

const activeScoopCount = computed(() =>
  variableScoops.value ? selectedScoopCount.value : maxScoopCount.value,
)

const scoopPriceOptions = computed(() => {
  if (!variableScoops.value || !props.product?.scoopPrices?.length) return []
  return props.product.scoopPrices.slice(0, maxScoopCount.value).map((price, idx) => ({
    count: idx + 1,
    price: Number(price),
  }))
})

const unitPrice = computed(() => {
  if (!props.product) return 0
  if (isAddonOnly.value) {
    return calculateItemUnitPrice(props.product, addonSelections.value)
  }
  const ids = containerSelection.value ? [containerSelection.value] : []
  return calculateItemUnitPrice(props.product, ids, activeScoopCount.value)
})

function canSelectContainer(opt: ProductOption): boolean {
  return optionHasStock(opt)
}

function canSelectAddon(opt: ProductOption): boolean {
  return optionHasStock(opt)
}

function containerStockLabel(opt: ProductOption): string {
  if (!opt.ingredientProductId) return ''
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

function selectScoopCount(count: number) {
  selectedScoopCount.value = count
  containerSelection.value = null
}

const canConfirm = computed(() => {
  if (isAddonOnly.value) {
    for (const id of addonSelections.value) {
      const opt = addonGroup.value?.options.find((o) => o.id === id)
      if (!opt || !canSelectAddon(opt)) return false
    }
    return true
  }

  if (containerGroup.value) {
    if (containerSelection.value == null) return false
    const containerOpt = containerGroup.value.options.find((o) => o.id === containerSelection.value)
    return !!containerOpt && canSelectContainer(containerOpt)
  }

  return true
})

function reset() {
  selectedScoopCount.value = 1
  containerSelection.value = null
  addonSelections.value = []
}

watch(() => props.show, (visible) => {
  if (visible) reset()
})

function buildLabel(): string {
  const labels: string[] = []

  if (isAddonOnly.value && addonGroup.value) {
    const addonNames = addonSelections.value
      .map((id) => addonGroup.value?.options.find((o) => o.id === id)?.name)
      .filter(Boolean)
    if (addonNames.length) labels.push(`+ ${addonNames.join(', ')}`)
    return labels.join('')
  }

  if (variableScoops.value) {
    labels.push(`${activeScoopCount.value} bola${activeScoopCount.value > 1 ? 's' : ''}`)
  }

  const cg = containerGroup.value
  if (cg && containerSelection.value) {
    const containerName = cg.options.find((o) => o.id === containerSelection.value)?.name
    if (containerName) labels.push(containerName)
  }

  return labels.join(', ')
}

function confirm() {
  if (!canConfirm.value || !props.product) return
  if (isAddonOnly.value) {
    emit('confirm', [...addonSelections.value], buildLabel(), unitPrice.value)
    return
  }
  const ids = containerSelection.value ? [containerSelection.value] : []
  const scoopCount = isPortion.value && variableScoops.value ? activeScoopCount.value : undefined
  emit('confirm', ids, buildLabel(), unitPrice.value, scoopCount)
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
      <template v-if="isAddonOnly && addonGroup">
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
        <div v-if="variableScoops && scoopPriceOptions.length" class="space-y-2">
          <h4 class="font-medium text-sm">¿Cuántas bolas?</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in scoopPriceOptions"
              :key="opt.count"
              type="button"
              class="px-4 py-2 rounded-lg border text-sm transition-colors"
              :class="selectedScoopCount === opt.count
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white border-slate-200 hover:border-primary-400'"
              @click="selectScoopCount(opt.count)"
            >
              {{ opt.count }} bola{{ opt.count > 1 ? 's' : '' }}
              <span class="block text-[10px] font-normal" :class="selectedScoopCount === opt.count ? 'text-primary-100' : 'text-slate-500'">
                {{ formatMoney(opt.price) }}
              </span>
            </button>
          </div>
        </div>

        <p v-else-if="containerGroup" class="text-sm text-slate-500">
          Elige el envase.
        </p>

        <div v-if="containerGroup" class="space-y-2">
          <h4 class="font-medium text-sm">{{ containerGroup.name }}</h4>
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
                v-if="containerStockLabel(opt)"
                class="block text-[10px] font-normal"
                :class="containerSelection === opt.id ? 'text-primary-100' : canSelectContainer(opt) ? 'text-slate-400' : 'text-red-400'"
              >
                {{ containerStockLabel(opt) }}
              </span>
            </button>
          </div>
        </div>

        <p v-if="variableScoops" class="text-base font-semibold text-slate-900 pt-2 border-t">
          Total: {{ formatMoney(unitPrice) }}
        </p>
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
