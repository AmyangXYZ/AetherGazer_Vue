<template>
  <div v-if="OpenAI_API_KEY.length > 10">
    <el-card class="response" v-show="response != null">{{ response }} </el-card>
    <el-input
      class="prompt-bar"
      autofocus
      v-model="prompt"
      :suffix-icon="Top"
      @keyup.enter="send"
    />
  </div>
</template>

<script setup lang="ts">
import { Top } from '@element-plus/icons-vue'
import { useOpenAI } from '@/hooks/useOpenAI'
import { OpenAI_API_KEY } from '@/hooks/useStates'

const { prompt, send, response } = useOpenAI()
</script>

<style scoped>
.response {
  z-index: 2;
  position: absolute;
  top: 20%;
  left: 58%;
  max-width: 280px;
  max-height: 40%;
  overflow: auto;
  padding-top: 6px;
  padding-bottom: 6px;
  padding-right: 6px;
  padding-left: -1px;
  background-color: rgba(0, 0, 0, 0.8);
  font-size: 1rem;
}
.prompt-bar {
  z-index: 2;
  position: absolute;
  bottom: 15%;
  left: 40%;
  width: 20%;
  background-color: rgba(0, 0, 0, 0.8);
  font-size: 1rem;
}
</style>
