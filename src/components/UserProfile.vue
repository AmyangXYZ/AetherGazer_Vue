<template>
  <el-row class="user" align="middle">
    <el-col :span="10">
      <el-avatar :size="42">K</el-avatar>
    </el-col>
    <el-col :span="14"> Kkkkkkyia </el-col>
  </el-row>
</template>

<script setup lang="ts"></script>

<style scoped>
.user {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 120px;
  z-index: 999;
}
</style>
