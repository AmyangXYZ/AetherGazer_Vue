<template>
  <div class="char" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
// import { useCharModel } from '@/hooks/useCharModelAmmo'
import { useCharModel } from '@/hooks/useCharModelRapier'
import { SelectedChar, SelectedPose } from '@/hooks/useStates'

const container = ref()

onMounted(() => {
  const { LoadChar, LoadPose } = useCharModel(container.value)
  LoadChar(SelectedChar.value)

  watch(SelectedChar, () => {
    LoadChar(SelectedChar.value)
  })
  watch(SelectedPose, () => {
    LoadPose(SelectedPose.value)
  })
})
</script>

<style scoped>
.char {
  position: absolute;
  width: 100%;
  height: 100vh;
  z-index: 999;
}
</style>
