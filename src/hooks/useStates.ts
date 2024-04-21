import { ref } from 'vue'
import * as THREE from 'three'
export const SelectedChar = ref('Thoth2')
export const SelectedPose = ref('2')
export const LoadedModels: { [name: string]: THREE.Object3D | undefined } = {}
