<template>
  <CharModel ref="char" @click="toggleButtonGroup" />
  <div v-if="buttonGroupVisible" class="button-group" :style="buttonGroupStyle">
    <el-tooltip effect="light" content="Switch char" :hide-after="0" placement="bottom-start">
      <RouterLink to="/chars">
        <el-button :icon="Switch" size="large" circle @click="handleButtonClick('Button 1')" />
      </RouterLink>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import CharModel from './CharModel.vue'
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Switch } from '@element-plus/icons-vue'

const buttonGroupVisible = ref(false)
const buttonGroupX = ref(0)
const buttonGroupY = ref(0)
const buttonGroupStyle = computed(() => ({
  top: `${buttonGroupY.value}px`,
  left: `${buttonGroupX.value}px`
}))

const toggleButtonGroup = (event: MouseEvent) => {
  if (buttonGroupVisible.value) {
    buttonGroupVisible.value = false
  } else {
    buttonGroupVisible.value = true
    buttonGroupX.value = event.clientX
    buttonGroupY.value = event.clientY
  }
}
const char = ref()
onClickOutside(char, () => {
  buttonGroupVisible.value = false
})
const handleButtonClick = (buttonName: string) => {
  console.log(`Clicked ${buttonName}`)
  // Add your button click logic here
}
</script>

<style scoped>
.base {
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: 1000;
}
.button-group {
  position: absolute;
  z-index: 1000;
}
</style>
