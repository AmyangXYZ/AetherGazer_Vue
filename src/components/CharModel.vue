<template>
  <div class="char" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCharModel } from '@/hooks/useCharModel'
const container = ref()
onMounted(() => {
  useCharModel(container.value)
})
</script>

<style scoped>
.char {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 600px;
  z-index: 999;
  height: 800px;
}
</style>
