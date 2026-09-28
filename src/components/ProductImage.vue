<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import api from '@/api/client'

const props = defineProps<{
  productId: number
  imageUrl?: string | null
  /** Si es false, no intenta cargar. Si es true/undefined, intenta /image-urls */
  hasImage?: boolean | null
  alt?: string
  class?: string
  imgClass?: string
}>()

const resolvedUrl = ref<string | null>(props.imageUrl || null)
const loading = ref(false)
const failed = ref(false)
let fetchedForId = 0

type Waiter = (url: string | null) => void
const pending = new Map<number, Waiter[]>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function requestImageUrl(id: number): Promise<string | null> {
  return new Promise((resolve) => {
    const waiters = pending.get(id) ?? []
    waiters.push(resolve)
    pending.set(id, waiters)
    if (flushTimer == null) {
      flushTimer = setTimeout(() => {
        flushTimer = null
        void flushImageUrls()
      }, 50)
    }
  })
}

async function flushImageUrls() {
  const waiters = new Map(pending)
  pending.clear()
  const ids = [...waiters.keys()]
  if (!ids.length) return

  const deliver = (id: number, url: string | null) => {
    for (const waiter of waiters.get(id) ?? []) waiter(url)
  }

  try {
    const { data } = await api.post<{ urls: Record<string, string> }>(
      '/products/image-urls',
      { ids },
      { skipLoading: true },
    )
    for (const id of ids) {
      deliver(id, data?.urls?.[id] || data?.urls?.[String(id)] || null)
    }
  } catch {
    for (const id of ids) deliver(id, null)
  }
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
    const url = await requestImageUrl(props.productId)
    if (fetchedForId === props.productId && url) {
      resolvedUrl.value = url
    } else if (fetchedForId === props.productId) {
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
