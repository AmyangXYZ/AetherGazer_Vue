import { ref } from 'vue'
import * as THREE from 'three'
export const SelectedChar = ref('Thoth')
export const LoadedModels: { [name: string]: THREE.Object3D | undefined } = {}
