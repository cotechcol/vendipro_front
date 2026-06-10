<script setup lang="ts">
import { computed } from 'vue'
import type { Sale, Setting } from '@/types'
import { formatMoney, formatDate, toNumber } from '@/utils/format'
import { APP_NAME } from '@/constants/brand'

const props = defineProps<{
  sale: Sale
  settings: Setting
  preview?: boolean
}>()

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  mixed: 'Mixto',
}

const taxPercent = computed(() => Math.round(toNumber(props.settings.taxRate) * 100))
const itemCount = computed(() => props.sale.items.reduce((s, i) => s + i.quantity, 0))
</script>

<template>
  <div :class="['ticket-receipt', preview && 'ticket-receipt--preview']">
    <!-- Encabezado -->
    <header class="ticket-header">
      <div v-if="settings.logoUrl" class="ticket-logo">
        <img :src="settings.logoUrl" alt="Logo" />
      </div>
      <h1 class="ticket-business">{{ settings.businessName }}</h1>
      <p v-if="settings.address" class="ticket-meta">{{ settings.address }}</p>
      <p v-if="settings.phone" class="ticket-meta">Tel: {{ settings.phone }}</p>
    </header>

    <div class="ticket-divider" />

    <!-- Info venta -->
    <section class="ticket-info">
      <div class="ticket-row">
        <span>Ticket</span>
        <span class="ticket-mono">{{ sale.ticketNumber }}</span>
      </div>
      <div class="ticket-row">
        <span>Fecha</span>
        <span>{{ formatDate(sale.createdAt) }}</span>
      </div>
      <div v-if="sale.user" class="ticket-row">
        <span>Cajero</span>
        <span>{{ sale.user.name }}</span>
      </div>
      <div v-if="sale.customer" class="ticket-row">
        <span>Cliente</span>
        <span>{{ sale.customer.name }}</span>
      </div>
    </section>

    <div class="ticket-divider" />

    <!-- Productos -->
    <section class="ticket-items">
      <div class="ticket-items-head">
        <span class="col-qty">Cant</span>
        <span class="col-desc">Descripción</span>
        <span class="col-total">Total</span>
      </div>
      <div v-for="item in sale.items" :key="item.id ?? item.productId" class="ticket-item">
        <span class="col-qty">{{ item.quantity }}</span>
        <div class="col-desc">
          <p class="item-name">{{ item.productName }}</p>
          <p class="item-unit">{{ formatMoney(item.unitPrice) }} c/u</p>
        </div>
        <span class="col-total">{{ formatMoney(item.subtotal) }}</span>
      </div>
    </section>

    <div class="ticket-divider" />

    <!-- Totales -->
    <section class="ticket-totals">
      <div class="ticket-row">
        <span>Artículos ({{ itemCount }})</span>
        <span>{{ sale.items.length }} producto{{ sale.items.length !== 1 ? 's' : '' }}</span>
      </div>
      <div class="ticket-row">
        <span>Subtotal</span>
        <span>{{ formatMoney(sale.subtotal) }}</span>
      </div>
      <div class="ticket-row">
        <span>IVA {{ taxPercent }}% incluido</span>
        <span>{{ formatMoney(sale.taxAmount) }}</span>
      </div>
      <div class="ticket-row ticket-total">
        <span>TOTAL</span>
        <span>{{ formatMoney(sale.total) }}</span>
      </div>
    </section>

    <div class="ticket-divider" />

    <!-- Pago -->
    <section class="ticket-payment">
      <div class="ticket-row">
        <span>Forma de pago</span>
        <span>{{ paymentLabels[sale.paymentMethod] || sale.paymentMethod }}</span>
      </div>
      <div v-if="sale.amountPaid && sale.paymentMethod !== 'card'" class="ticket-row">
        <span>Recibido</span>
        <span>{{ formatMoney(sale.amountPaid) }}</span>
      </div>
      <div v-if="sale.change && toNumber(sale.change) > 0" class="ticket-row ticket-change">
        <span>Cambio</span>
        <span>{{ formatMoney(sale.change) }}</span>
      </div>
    </section>

    <div class="ticket-divider" />

    <!-- Pie -->
    <footer class="ticket-footer">
      <p class="ticket-thanks">¡Gracias por su compra!</p>
      <p class="ticket-note">Precios incluyen IVA. Conserve este recibo.</p>
      <p class="ticket-brand">{{ APP_NAME }}</p>
    </footer>
  </div>
</template>

<style scoped>
.ticket-receipt {
  width: 100%;
  max-width: 302px;
  margin: 0 auto;
  padding: 16px 14px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: #111;
  background: #fff;
}

.ticket-receipt--preview {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px #f1f5f9;
}

.ticket-header {
  text-align: center;
}

.ticket-logo img {
  max-height: 48px;
  max-width: 120px;
  margin: 0 auto 8px;
  object-fit: contain;
}

.ticket-business {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 4px;
}

.ticket-meta {
  font-size: 10px;
  color: #444;
  margin: 1px 0;
}

.ticket-divider {
  border-top: 1px dashed #999;
  margin: 10px 0;
}

.ticket-info,
.ticket-totals,
.ticket-payment {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ticket-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.ticket-mono {
  font-weight: 700;
  letter-spacing: 0.05em;
}

.ticket-items-head,
.ticket-item {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 6px;
  align-items: start;
}

.ticket-items-head {
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 6px;
  color: #555;
}

.ticket-item {
  margin-bottom: 6px;
}

.col-qty {
  text-align: center;
  font-weight: 600;
}

.col-desc {
  min-width: 0;
}

.item-name {
  font-weight: 600;
  word-break: break-word;
}

.item-unit {
  font-size: 9px;
  color: #666;
  margin-top: 1px;
}

.col-total {
  text-align: right;
  font-weight: 600;
  white-space: nowrap;
}

.ticket-total {
  font-size: 13px;
  font-weight: 700;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #ccc;
}

.ticket-change {
  font-weight: 700;
}

.ticket-footer {
  text-align: center;
}

.ticket-thanks {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 4px;
}

.ticket-note {
  font-size: 9px;
  color: #666;
  margin-bottom: 6px;
}

.ticket-brand {
  font-size: 8px;
  color: #999;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
