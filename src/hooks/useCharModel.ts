import { watch } from 'vue'
import { ShowSkin, ShowSkeleton, ShowRigidBodies } from './useStates'
import * as THREE from 'three'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import Stats from 'three/addons/libs/stats.module.js'
import { RMPhysics } from './physics'

export function useCharModel(container: HTMLElement) {
  let renderer: any, camera: any
  const stats = new Stats()
  const clock = new THREE.Clock()
  const animationHelper = new MMDAnimationHelper({ afterglow: 2 })

  const loader = new MMDLoader()
  const LoadedModels: { [name: string]: THREE.Object3D | undefined } = {}

  let model: THREE.Object3D | undefined = undefined
  let effect: OutlineEffect
  const scene = new THREE.Scene()

  const physics = new RMPhysics(scene)
  physics.addGround(50, -12)

  const LoadChar = (char: string) => {
    if (model != undefined) {
      scene.remove(model)
      if (animationHelper.objects.get(model) != undefined) {
        animationHelper.remove(model)
      }
    }

    const mmdFile = `/chars/${char}/${char}.pmx`
    const vmdFiles = ['/motions/1.vmd']

    if (LoadedModels[char] == undefined) {
      loader.loadWithAnimation(mmdFile, vmdFiles, (m: any) => {
        const mesh = m.mesh
        mesh.castShadow = true // Enable casting shadows
        mesh.receiveShadow = true // Enable receiving shadows
        mesh.position.y = -12
        model = mesh
        LoadedModels[char] = model

        // LoadPose(SelectedPose.value)
        scene.add(model!)
        model!.visible = ShowSkin.value
        animationHelper.add(model, {
          // animation: m.animation,
          physics: false // disable Ammojs-based physics
        })

        physics.addMMD(model!)
      })
    } else {
      model = LoadedModels[char]
      scene.add(model!)
      model!.visible = ShowSkin.value
    }
  }

  const LoadPose = (pose: string) => {
    loader.loadVPD(`/poses/${pose}.vpd`, false, (vpd: any) => {
      animationHelper.pose(model, vpd)
    })
  }

  const initScene = () => {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)
    renderer.shadowMap.enabled = true

    effect = new OutlineEffect(renderer)

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 100)
    camera.position.set(0, 10, 20)
    camera.lookAt(new THREE.Vector3(0, 0, 0))

    // Ambient light
    const ambientLight = new THREE.AmbientLight(16777215, 1)
    scene.add(ambientLight)

    // Directional light
    const directionalLight = new THREE.DirectionalLight(16777215, 1.4)
    directionalLight.position.set(-2, 7, 18)
    directionalLight.castShadow = true
    directionalLight.shadow.bias = -0.001
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    stats.dom.style.position = 'fixed'
    stats.dom.style.right = '16px'
    stats.dom.style.left = ''
    stats.dom.style.top = '16px'
    container.appendChild(stats.dom)
  }

  const setEventHandlers = () => {
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.mouseButtons = {
      LEFT: undefined,
      RIGHT: THREE.MOUSE.ROTATE
    }

    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    container.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.button == 0) {
        isDragging = true
        previousMousePosition = { x: event.clientX, y: event.clientY }
      }
    })
    container.addEventListener('mouseup', () => {
      isDragging = false
    })
    container.addEventListener('mousemove', (event: MouseEvent) => {
      if (!isDragging) return
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      }

      if (model) {
        model.rotation.y += deltaMove.x * 0.01
      }

      previousMousePosition = { x: event.clientX, y: event.clientY }
    })

    const resizeHandler = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', resizeHandler)
  }
  const setWatchers = () => {
    watch(ShowSkin, () => {
      if (model != undefined) {
        model.visible = ShowSkin.value
      }
    })

    let skeletonHelper: THREE.SkeletonHelper | undefined = undefined
    watch(ShowSkeleton, () => {
      if (model != undefined) {
        if (ShowSkeleton.value) {
          skeletonHelper = new THREE.SkeletonHelper(model)
          scene.add(skeletonHelper)
        } else {
          scene.remove(skeletonHelper!)
          skeletonHelper = undefined
        }
      }
    })

    watch(
      ShowRigidBodies,
      () => {
        if (ShowRigidBodies.value) {
          physics.showHelper()
        } else {
          physics.hideHelper()
        }
      },
      { immediate: true }
    )
  }

  const animate = () => {
    requestAnimationFrame(animate)
    stats.begin()

    effect.render(scene, camera)
    animationHelper.update(clock.getDelta())

    physics.step()

    stats.end()
  }

  // main
  initScene()
  setEventHandlers()
  // LoadChar(SelectedChar.value)
  setWatchers()
  animate()

  return { LoadChar, LoadPose }
}
