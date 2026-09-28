<script setup lang="ts">
import { nextTick, ref } from 'vue'
import api from '@/api/client'
import TicketPrint from '@/components/TicketPrint.vue'
import type { Sale, Setting } from '@/types'
import { printHtmlElement } from '@/utils/printTicket'

const sale = ref<Sale | null>(null)
const settings = ref<Setting | null>(null)
const ticketRef = ref<InstanceType<typeof TicketPrint> | null>(null)

async function print(id: number) {
  const { data } = await api.get<{ sale: Sale; settings: Setting }>(`/sales/${id}/ticket`)
  sale.value = data.sale
  settings.value = data.settings
  await nextTick()
  if (!ticketRef.value?.$el) await nextTick()
  const el = ticketRef.value?.$el as HTMLElement | undefined
  if (!el) throw new Error('No se pudo preparar el recibo')
  printHtmlElement(el)
}

defineExpose({ print })
</script>

<template>
  <div class="fixed -left-[10000px] top-0 w-[80mm]" aria-hidden="true">
    <TicketPrint v-if="sale && settings" ref="ticketRef" :sale="sale" :settings="settings" />
  </div>
</template>
