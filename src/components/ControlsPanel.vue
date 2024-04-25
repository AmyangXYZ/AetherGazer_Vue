<template>
  <div class="container" :style="style" ref="container">
    <el-card class="card">
      <template #header>
        <div class="card-header">
          <el-icon
            size="16px"
            id="drag"
            @mouseenter="dragDisabled = false"
            @mouseleave="dragDisabled = true"
          >
            <Rank />
          </el-icon>
        </div>
      </template>
      Drag disabled: {{ dragDisabled }}
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Rank } from '@element-plus/icons-vue'

import { ref } from 'vue'
import { useDraggable } from '@vueuse/core'

const container = ref()
const dragDisabled = ref(true)
const { style } = useDraggable(container, {
  initialValue: { x: 40, y: 40 },
  disabled: dragDisabled
})
</script>

<style scoped>
.container {
  position: fixed;
  z-index: 2;
  width: 200px;
  height: 300px;
}
.card {
  width: 100%;
  height: 100%;
}
.card-header {
}
#drag:hover {
  cursor: pointer;
}
</style>
