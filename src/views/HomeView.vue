<script setup lang="ts">
import HomeBase from '@/components/HomeBase.vue'
import NavBar from '@/components/NavBar.vue'
import StatsBar from '@/components/StatsBar.vue'
import ToolBar from '@/components/ToolBar.vue'
import UserProfile from '@/components/UserProfile.vue'
</script>

<template>
  <HomeBase />
  <UserProfile />
  <ToolBar v-show="false" />
  <NavBar v-show="false" />
  <StatsBar v-show="false" />
</template>
