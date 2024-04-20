<template>
  <div class="char" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useCharModel } from '@/hooks/useCharModel'
import { SelectedChar } from '@/hooks/useStates'

const container = ref()

onMounted(() => {
  const { Load } = useCharModel(container.value)
  Load(SelectedChar.value)

  watch(SelectedChar, () => {
    Load(SelectedChar.value)
  })
})
</script>

<style scoped>
.char {
  position: absolute;
  top: 5%;
  width: 700px;
  height: 90vh;
  z-index: 999;
}
</style>
