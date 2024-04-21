// import { ref } from 'vue'
import * as THREE from 'three'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { BrightnessContrastShader } from 'three/examples/jsm/shaders/BrightnessContrastShader'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
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
  renderer.toneMappingExposure = 1

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    1,
    100
  )
  camera.position.set(-2, 3, 15)
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffeeff, 2)
  scene.add(ambientLight)

  // Directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
  directionalLight.position.set(-2, 7, 18)
  directionalLight.castShadow = true
  directionalLight.shadow.bias = -0.001
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
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

  const outlinePass = new OutlinePass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    scene,
    camera
  )
  outlinePass.edgeStrength = 2
  outlinePass.edgeGlow = 1
  outlinePass.edgeThickness = 1
  outlinePass.pulsePeriod = 0
  outlinePass.usePatternTexture = false // patter texture for an object mesh
  outlinePass.visibleEdgeColor.set('#000000') // set basic edge color
  // outlinePass.hiddenEdgeColor.set('#000000') // set edge color when it hidden by other objects
  composer.addPass(outlinePass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1,
    1,
    1
  )
  bloomPass.threshold = 0.2 // Adjust the luminance threshold for bloom
  bloomPass.strength = 0.06 // Increase the bloom strength
  bloomPass.radius = 25 // Increase the bloom radius
  composer.addPass(bloomPass)

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
    if (model != undefined) {
      outlinePass.selectedObjects = [model]
    }
    animationHelper.update(clock.getDelta())
    stats.end()
  }

  let model: THREE.Object3D | undefined = undefined
  const loader = new MMDLoader()
  const LoadChar = (char: string) => {
    if (model != undefined) {
      scene.remove(model)
    }

    const mmdFile = `/chars/${char}/${char}.pmx`
    const vmdFiles = ['/motions/roll.vmd']

    if (LoadedModels[char] == undefined) {
      loader.loadWithAnimation(mmdFile, vmdFiles, (mmd: any) => {
        const mesh = mmd.mesh
        mesh.castShadow = true // Enable casting shadows
        mesh.receiveShadow = true // Enable receiving shadows
        mesh.position.y = -15
        model = mesh
        LoadedModels[char] = model
        LoadPose('1')

        scene.add(model!)

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

  const LoadPose = (pose: string) => {
    loader.loadVPD(`/poses/${pose}.vpd`, false, function (vpd: any) {
      animationHelper.pose(model, vpd)
    })
  }
  animate()
  return { LoadChar, LoadPose }
}
