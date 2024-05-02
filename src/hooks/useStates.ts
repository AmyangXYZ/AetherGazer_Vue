import { ref } from 'vue'

export const Chars = [
  'Thoth',
  'Thoth2',
  'Bastet',
  'Hades',
  'Gengchen',
  'Yingzhao',
  'Lingguang',
  'Sekhmet',
  'Jin-ei',
  'Hera'
]
export const Motions = ['Miku', 'Zyy', 'Stand', 'iKun1', 'iKun2', 'Run']

export const FPS = ref(0)
export const SelectedChar = ref('Thoth')
export const SelectedAnimation = ref('Stand')
export const PhysicsEnabled = ref(true)
export const ShowRigidBodies = ref(false)
export const ShowFPS = ref(true)
export const OpenAI_API_KEY = ref('')
