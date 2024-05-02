<template>
  <div class="container" :style="style" ref="container">
    <el-card class="card">
      <template #header>
        <el-row align="middle" justify="space-between" class="button">
          <el-col :span="2">
            <el-icon
              size="14px"
              id="toggleShowControls"
              @click="showControls = !showControls"
              :class="{ rotate: showControls }"
            >
              <ArrowRightBold />
            </el-icon>
          </el-col>
          <el-col :span="20" style="text-align: center"> Controls </el-col>
          <el-col :span="2" class="button">
            <el-icon
              size="17px"
              id="drag"
              @mouseover="dragDisabled = false"
              @mouseleave="dragDisabled = true"
            >
              <Rank />
            </el-icon>
          </el-col>
        </el-row>
      </template>

      <div class="controls" v-if="showControls">
        <el-row align="middle" justify="space-between">
          <el-col :span="12" class="label"> Char: </el-col>
          <el-col :span="12" class="param">
            <el-select v-model="SelectedChar" style="width: 80px">
              <el-option v-for="item in Chars" :key="item" :label="item" :value="item" />
            </el-select>
          </el-col>
        </el-row>

        <el-row align="middle" justify="space-between">
          <el-col :span="12" class="label"> Animation: </el-col>
          <el-col :span="12" class="param">
            <el-select v-model="SelectedAnimation" style="width: 80px">
              <el-option v-for="item in Motions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-col>
        </el-row>
        <el-row align="middle" justify="space-between">
          <el-col :span="12" class="label"> Physics: </el-col>
          <el-col :span="12" class="param">
            <el-switch size="small" v-model="PhysicsEnabled" />
          </el-col>
        </el-row>
        <el-row align="middle" justify="space-between">
          <el-col :span="12" class="label"> Rigid body: </el-col>
          <el-col :span="12" class="param">
            <el-switch :disabled="!PhysicsEnabled" size="small" v-model="ShowRigidBodies" />
          </el-col>
        </el-row>
        <el-row align="middle" justify="space-between">
          <el-col :span="12" class="label"> Show FPS: </el-col>
          <el-col :span="12" class="param">
            <el-switch size="small" v-model="ShowFPS" />
          </el-col>
        </el-row>
        <el-row align="middle" justify="space-between">
          <el-col :span="12" class="label"> OpenAI api key: </el-col>
          <el-col :span="12" class="param">
            <el-input size="small" v-model="OpenAI_API_KEY" />
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {
  Chars,
  Motions,
  SelectedChar,
  SelectedAnimation,
  ShowRigidBodies,
  ShowFPS,
  PhysicsEnabled,
  OpenAI_API_KEY
} from '@/hooks/useStates'
import { ArrowRightBold, Rank } from '@element-plus/icons-vue'
import { ref } from 'vue'
import { useDraggable } from '@vueuse/core'

const container = ref()
const dragDisabled = ref(true)
const { style } = useDraggable(container, {
  initialValue: { x: 60, y: 100 },
  disabled: dragDisabled
})

const showControls = ref(true)
</script>

<style scoped>
.container {
  position: fixed;
  z-index: 2;
  width: 240px;
}

.button {
  display: flex;
  justify-content: center;
  align-items: center;
}

#drag:hover {
  cursor: pointer;
}
#toggleShowControls {
  transition: transform 0.08s ease-in-out !important;
}
#toggleShowControls.rotate {
  transform: rotate(90deg);
}

.label {
  text-align: left;
}
.param {
  text-align: center;
}
</style>
