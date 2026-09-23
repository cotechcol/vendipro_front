<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import api from '@/api/client'

const props = defineProps<{
  productId: number
  imageUrl?: string | null
  hasImage?: boolean
  alt?: string
  /** Clases del contenedor */
  class?: string
  /** Clases de la imagen */
  imgClass?: string
}>()

const resolvedUrl = ref<string | null>(props.imageUrl || null)
const loading = ref(false)
let fetchedForId = 0

async function ensureUrl() {
  if (resolvedUrl.value) return
  if (!props.hasImage && !props.imageUrl) return
  if (fetchedForId === props.productId && loading.value) return

  loading.value = true
  fetchedForId = props.productId
  try {
    const { data } = await api.get<{ imageUrl: string }>(
      `/products/${props.productId}/image-url`,
      { skipLoading: true },
    )
    if (fetchedForId === props.productId) {
      resolvedUrl.value = data.imageUrl
    }
  } catch {
    // Sin imagen o storage no disponible
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.productId, props.imageUrl, props.hasImage] as const,
  () => {
    if (props.imageUrl) {
      resolvedUrl.value = props.imageUrl
      return
    }
    resolvedUrl.value = null
    fetchedForId = 0
    if (props.hasImage) void ensureUrl()
  },
)

onMounted(() => {
  if (props.imageUrl) resolvedUrl.value = props.imageUrl
  else if (props.hasImage) void ensureUrl()
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
      @error="resolvedUrl = null"
    />
    <span v-else-if="loading" class="text-slate-300 text-sm animate-pulse">…</span>
    <span v-else class="text-slate-300 text-2xl leading-none">📦</span>
  </div>
</template>
