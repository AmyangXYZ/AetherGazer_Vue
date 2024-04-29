<template>
  <div style="height: 100vh">
    <canvas class="scene" ref="canvas"></canvas>
    <h4 v-if="ShowFPS" id="fps">FPS: {{ FPS }}</h4>
    <a href="https://github.com/AmyangXYZ/AetherGazer_Vue" target="“_blank”">
      <IconGithub id="git" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import IconGithub from './icons/IconGithub.vue'
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
.scene {
  /* position: fixed; */
  width: 100%;
  height: 100%;
  z-index: 1;
}
#fps {
  position: absolute;
  z-index: 2;
  right: 24px;
  top: 16px;
}
#git {
  position: absolute;
  z-index: 2;
  left: 24px;
  top: 16px;
  color: white;
}
</style>
