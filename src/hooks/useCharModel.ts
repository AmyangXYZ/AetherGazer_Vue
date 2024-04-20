// import { ref } from 'vue'
import * as THREE from 'three'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { BrightnessContrastShader } from 'three/examples/jsm/shaders/BrightnessContrastShader'

import Stats from 'three/addons/libs/stats.module.js'
import { LoadedModels } from './useStates'

export function useCharModel(container: HTMLElement) {
  const scene = new THREE.Scene()

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio * 2)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ReinhardToneMapping
  renderer.toneMappingExposure = 1.2

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  )
  camera.position.set(0, 3, 15)
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  const ambient = new THREE.AmbientLight(0xffffff, 2)
  scene.add(ambient)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
  directionalLight.position.set(-1, -1, 1).normalize()
  scene.add(directionalLight)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 1
  controls.maxDistance = 100

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
  brightnessContrastPass.uniforms.contrast.value = 0 // Adjust contrast
  composer.addPass(brightnessContrastPass)

  const stats = new Stats()
  stats.dom.style.position = 'fixed'
  stats.dom.style.left = '16px'
  stats.dom.style.bottom = '16px'
  stats.dom.style.top = ''
  container.appendChild(stats.dom)

  const animationHelper = new MMDAnimationHelper({
    afterglow: 2.0
  })
  const clock = new THREE.Clock()
  const animate = () => {
    requestAnimationFrame(animate)
    stats.begin()
    composer.render()
    animationHelper.update(clock.getDelta())
    stats.end()
  }

  let model: THREE.Object3D | undefined = undefined
  const loader = new MMDLoader()
  const Load = (char: string) => {
    if (model != undefined) {
      scene.remove(model)
    }

    const mmdFile = `/chars/${char}/${char}.pmx`
    const vmdFiles = ['/motions/roll.vmd']
    const vpdFile = '/poses/2.vpd'
    if (LoadedModels[char] == undefined) {
      loader.loadWithAnimation(mmdFile, vmdFiles, (mmd: any) => {
        const mesh = mmd.mesh
        mesh.position.y = -15
        model = mesh
        LoadedModels[char] = model
        scene.add(model!)
        loader.loadVPD(vpdFile, false, function (vpd: any) {
          animationHelper.pose(model, vpd)
        })
        animationHelper.add(model, {
          // animation: mmd.animation,
          physics: true
        })

        const ikHelper = animationHelper.objects.get(model).ikSolver.createHelper()
        ikHelper.visible = false
        scene.add(ikHelper)

        const physicsHelper = animationHelper.objects.get(model).physics.createHelper()
        physicsHelper.visible = false
        scene.add(physicsHelper)
      })
    } else {
      model = LoadedModels[char]
      scene.add(model!)
    }
  }
  animate()
  return { Load }
}
