<template>
  <div class="char" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// import { useCharModel } from '@/hooks/useCharModelAmmo'
import { useCharModel } from '@/hooks/useCharModelRapier'

const container = ref()

onMounted(() => {
  useCharModel(container.value)
})
</script>

<style scoped>
.char {
  position: absolute;
  width: 100%;
  height: 100vh;
  z-index: 1;
}
</style>
