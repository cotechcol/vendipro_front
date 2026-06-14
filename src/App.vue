<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLoadingOverlay from '@/components/AppLoadingOverlay.vue'
</script>

<template>
  <RouterView />
  <AppLoadingOverlay />
</template>
