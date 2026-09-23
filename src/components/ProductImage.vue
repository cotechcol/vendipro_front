<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import api from '@/api/client'

const props = defineProps<{
  productId: number
  imageUrl?: string | null
  /** Si es false, no intenta cargar. Si es true/undefined, intenta /image-url */
  hasImage?: boolean | null
  alt?: string
  class?: string
  imgClass?: string
}>()

const resolvedUrl = ref<string | null>(props.imageUrl || null)
const loading = ref(false)
const failed = ref(false)
let fetchedForId = 0

/** Cola compartida: evita N firmas en paralelo al abrir POS */
const MAX_PARALLEL = 4
let active = 0
const queue: Array<() => void> = []

function runNext() {
  while (active < MAX_PARALLEL && queue.length) {
    active++
    queue.shift()!()
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--
          runNext()
        })
    })
    runNext()
  })
}

function shouldTryFetch(): boolean {
  if (props.imageUrl) return false
  if (props.hasImage === false) return false
  if (failed.value && fetchedForId === props.productId) return false
  return true
}

async function ensureUrl() {
  if (resolvedUrl.value || !shouldTryFetch()) return
  if (fetchedForId === props.productId && loading.value) return

  loading.value = true
  fetchedForId = props.productId
  failed.value = false
  try {
    const { data } = await enqueue(() =>
      api.get<{ imageUrl: string }>(`/products/${props.productId}/image-url`, {
        skipLoading: true,
      }),
    )
    if (fetchedForId === props.productId && data?.imageUrl) {
      resolvedUrl.value = data.imageUrl
    } else {
      failed.value = true
    }
  } catch {
    if (fetchedForId === props.productId) failed.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.productId, props.imageUrl, props.hasImage] as const,
  () => {
    failed.value = false
    fetchedForId = 0
    if (props.imageUrl) {
      resolvedUrl.value = props.imageUrl
      return
    }
    resolvedUrl.value = null
    if (shouldTryFetch()) void ensureUrl()
  },
)

onMounted(() => {
  if (props.imageUrl) resolvedUrl.value = props.imageUrl
  else if (shouldTryFetch()) void ensureUrl()
})
</script>

<template>
  <div :class="['overflow-hidden flex items-center justify-center bg-slate-100', props.class]">
    <img
      v-if="resolvedUrl"
      :src="resolvedUrl"
      :alt="alt || ''"
      :class="imgClass || 'w-full h-full object-cover'"
      loading="lazy"
      @error="resolvedUrl = null; failed = true"
    />
    <span v-else-if="loading" class="text-slate-300 text-sm animate-pulse">…</span>
    <span v-else class="text-slate-300 text-2xl leading-none">📦</span>
  </div>
</template>
