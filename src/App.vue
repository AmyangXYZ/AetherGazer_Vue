<script setup lang="ts">
import OpenAI from './components/OpenAI.vue'
import ControlsPanel from './components/ControlsPanel.vue'
import MainScene from './components/MainScene.vue'
</script>

<template>
  <main>
    <ControlsPanel />
    <MainScene />
    <OpenAI />
  </main>
</template>

<style scoped></style>
