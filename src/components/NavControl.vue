<template>
  <div class="nav-control">
    <el-row :gutter="20">
      <el-col :span="12">
        <RouterLink to="/">
          <el-button size="large" :icon="ArrowLeft" circle />
        </RouterLink>
      </el-col>
      <el-col :span="12">
        <RouterLink to="/">
          <el-button size="large" :icon="House" circle />
        </RouterLink>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, House } from '@element-plus/icons-vue'
</script>

<style scoped>
.nav-control {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 100px;
  z-index: 999;
}
</style>
