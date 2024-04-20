<template>
  <div class="char-list">
    <el-card v-for="(char, i) in charList" :key="i">
      <el-button @click="SelectedChar = char">{{ char }}</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { SelectedChar } from '@/hooks/useStates'
const charList = ['Thoth', 'Thoth2', 'Bastet', 'Hera', 'Hades', 'Gengchen', 'Yingzhao']
</script>

<style scoped>
.char-list {
  position: absolute;
  top: 80px;
  left: 16px;
  width: 200px;
  z-index: 999;
  .el-card {
    margin-top: 20px;
  }
}
</style>
