// import { ref } from 'vue'
import * as THREE from 'three'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { BrightnessContrastShader } from 'three/examples/jsm/shaders/BrightnessContrastShader'
import Stats from 'three/addons/libs/stats.module.js'

export function useCharModel(container: HTMLElement) {
  const scene = new THREE.Scene()

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio * 2)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  THREE.ColorManagement.enabled = true
  const gridHelper = new THREE.PolarGridHelper(20, 0)
  gridHelper.position.y = -12
  scene.add(gridHelper)

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 8, 22)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  THREE.ColorManagement.enabled = true
  const ambient = new THREE.AmbientLight(0xffffff, 1.5)
  scene.add(ambient)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
  directionalLight.position.set(1, 1, 1).normalize()
  scene.add(directionalLight)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 1
  controls.maxDistance = 1000

  const loader = new MMDLoader()
  loader.load('/chars/tt.pmx', (model: any) => {
    model.position.y = -12
    scene.add(model)
  })

  const resizeHandler = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', resizeHandler)

  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const brightnessContrastPass = new ShaderPass(BrightnessContrastShader)
  brightnessContrastPass.uniforms.brightness.value = 0 // Adjust brightness
  brightnessContrastPass.uniforms.contrast.value = 0.05 // Adjust contrast
  composer.addPass(brightnessContrastPass)

  const stats = new Stats()
  stats.dom.style.position = 'fixed'
  stats.dom.style.right = '16px'
  stats.dom.style.top = '16px'
  stats.dom.style.left = ''
  container.appendChild(stats.dom)

  const animate = () => {
    requestAnimationFrame(animate)
    stats.begin()
    composer.render()
    stats.end()
  }
  animate()
}
