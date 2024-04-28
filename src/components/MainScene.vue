<template>
  <canvas class="scene" ref="canvas"></canvas>
  <h4 v-if="ShowFPS" id="fps">FPS: {{ FPS }}</h4>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ShowFPS, FPS } from '@/hooks/useStates'
import { useScene } from '@/hooks/useScene'

const canvas = ref()
const loading = ref(true)

onMounted(async () => {
  await useScene(canvas.value)
  loading.value = false
})
</script>

<style scoped>
#fps {
  position: absolute;
  z-index: 2;
  right: 16px;
  top: 16px;
}
.scene {
  position: absolute;
  width: 100%;
  height: 100vh;
  z-index: 1;
}
</style>
