import { ref } from 'vue'

export const Chars = [
  'Thoth',
  'Thoth2',
  'Thoth3',
  'Bastet',
  'Hera',
  'Hades',
  'Gengchen',
  'Yingzhao'
]
export const Motions = ['Miku', 'Zyy', 'Stand', 'iKun1', 'iKun2']

export const FPS = ref(0)
export const SelectedChar = ref('Thoth')
export const SelectedAnimation = ref('Stand')
export const ShowRigidBodies = ref(false)
export const ShowFPS = ref(true)
