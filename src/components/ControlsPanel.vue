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
              size="16px"
              id="drag"
              @mouseenter="dragDisabled = false"
              @mouseleave="dragDisabled = true"
            >
              <Rank />
            </el-icon>
          </el-col>
        </el-row>
      </template>

      <div class="controls" v-if="showControls">
        <el-row align="middle">
          <el-col :span="14" class="label"> Char: </el-col>
          <el-col :span="10" class="param">
            {{ SelectedChar }}
          </el-col>
        </el-row>
        <el-row align="middle">
          <el-col :span="14" class="label"> Pose: </el-col>
          <el-col :span="10" class="param">
            {{ SelectedPose }}
          </el-col>
        </el-row>
        <el-row align="middle">
          <el-col :span="14" class="label"> Animation: </el-col>
          <el-col :span="10" class="param">
            {{ SelectedAnimation }}
          </el-col>
        </el-row>
        <el-row align="middle">
          <el-col :span="14" class="label"> View Skin: </el-col>
          <el-col :span="10" class="param">
            <el-switch size="small" v-model="ShowSkin" />
          </el-col>
        </el-row>
        <el-row align="middle">
          <el-col :span="14" class="label"> View skeleton </el-col>
          <el-col :span="10" class="param">
            <el-switch size="small" v-model="ShowSkeleton" />
          </el-col>
        </el-row>
        <el-row align="middle">
          <el-col :span="14" class="label"> View rigid bodies: </el-col>
          <el-col :span="10" class="param">
            <el-switch size="small" v-model="ShowRigidBodies" />
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {
  SelectedChar,
  SelectedPose,
  SelectedAnimation,
  ShowSkeleton,
  ShowRigidBodies,
  ShowSkin
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
