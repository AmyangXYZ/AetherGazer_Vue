<template>
  <div class="navbar">
    <el-row :gutter="20">
      <el-col :span="2">
        <RouterLink to="/chars">
          <el-button size="large" :icon="User" circle />
        </RouterLink>
      </el-col>
      <el-col :span="2"> <el-button size="large" :icon="Search" circle /></el-col>
      <el-col :span="2"> <el-button size="large" :icon="Search" circle /></el-col>
      <el-col :span="2"> <el-button size="large" :icon="Search" circle /></el-col>
      <el-col :span="2"> <el-button size="large" :icon="Search" circle /></el-col>
      <el-col :span="9" align="center"> <el-button :icon="Search" circle size="large" /></el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { User, Search } from '@element-plus/icons-vue'
</script>

<style scoped>
.navbar {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 40%;
  z-index: 999;
}
</style>
