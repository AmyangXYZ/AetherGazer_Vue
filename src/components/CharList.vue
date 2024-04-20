<template>
  <div class="char-list">
    <el-card v-for="(char, i) in charList" :key="i">
      <el-button @click="SelectedChar = char">{{ char }}</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { SelectedChar } from '@/hooks/useStates'
import { User, Search } from '@element-plus/icons-vue'

const charList = ['Thoth', 'Hades']
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
