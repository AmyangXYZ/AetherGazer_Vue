<template>
  <canvas class="scene" ref="canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useScene } from '@/hooks/useScene'

const canvas = ref()

onMounted(async () => {
  await useScene(canvas.value)
})
</script>

<style scoped>
.scene {
  position: absolute;
  width: 100%;
  height: 100vh;
  z-index: 1;
}
</style>
