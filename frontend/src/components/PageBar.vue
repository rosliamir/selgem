<template>
  <!-- A page's own controls (search, filters, period) are shown in the shared header, next to the page title. -->
  <Teleport v-if="on" to="#hdr-tools"><slot /></Teleport>
</template>
<script setup>
import { ref, onMounted } from 'vue'
const on = ref(false)
onMounted(() => { on.value = true })
</script>
