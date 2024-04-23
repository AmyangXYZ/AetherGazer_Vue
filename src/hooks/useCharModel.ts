// import { ref } from 'vue'
import { LoadedModels, SelectedPose } from './useStates'
import * as THREE from 'three'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import Stats from 'three/addons/libs/stats.module.js'
import * as RAPIER from '@dimforge/rapier3d'

export function useCharModel(container: HTMLElement) {
  let renderer: any, camera: any
  const stats = new Stats()
  const clock = new THREE.Clock()
  const animationHelper = new MMDAnimationHelper({ afterglow: 2.0 })
  let ikHelper: any, physicsHelper: any
  const loader = new MMDLoader()
  let model: THREE.Object3D | undefined = undefined
  let effect: OutlineEffect
  const scene = new THREE.Scene()

  const gravity = { x: 0.0, y: -1, z: 0.0 }
  const world = new RAPIER.World(gravity)

  // Create the ground
  const groundGeometry = new THREE.PlaneGeometry(10, 10)
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc })
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.y = -10
  scene.add(groundMesh)

  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
    groundMesh.position.x,
    groundMesh.position.y,
    groundMesh.position.z
  )
  const groundBody = world.createRigidBody(groundBodyDesc)
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(5, 0.1, 5)
  world.createCollider(groundColliderDesc, groundBody)

  const LoadChar = (char: string) => {
    if (model != undefined) {
      scene.remove(model)
      scene.remove(ikHelper)
      scene.remove(physicsHelper)
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
        mesh.position.y = -5
        model = mesh
        LoadedModels[char] = model

        LoadPose(SelectedPose.value)
        scene.add(model!)

        animationHelper.add(model, {
          // animation: mmd.animation,
          physics: false // disable Ammojs-based physics
        })

        // rapier3D based physics
        const mmd = m.mesh.geometry.userData.MMD
        for (const rb of mmd.rigidBodies) {
          console.log(rb)
          const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(rb.position[0], rb.position[1], rb.position[2])
            .setRotation({
              w: 1,
              x: rb.rotation[0],
              y: rb.rotation[1],
              z: rb.rotation[2]
            })
          const rigidBody = world.createRigidBody(rigidBodyDesc)
          const colliderDesc = RAPIER.ColliderDesc.ball(rb.width)
          world.createCollider(colliderDesc, rigidBody)

          // rb.userData.rigidBody = rigidBody
        }
      })
    } else {
      model = LoadedModels[char]
      scene.add(model!)
    }
  }

  const LoadPose = (pose: string) => {
    loader.loadVPD(`/poses/${pose}.vpd`, false, (vpd: any) => {
      animationHelper.pose(model, vpd)
    })
  }

  const initScene = () => {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio * 2)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)
    renderer.shadowMap.enabled = true

    effect = new OutlineEffect(renderer)

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 100)
    camera.position.set(-2, 3, 15)
    camera.lookAt(new THREE.Vector3(0, 0, 0))

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambientLight)

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4)
    directionalLight.position.set(-2, 7, 18)
    directionalLight.castShadow = true
    directionalLight.shadow.bias = -0.001
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    stats.dom.style.position = 'fixed'
    stats.dom.style.left = '16px'
    stats.dom.style.bottom = '16px'
    stats.dom.style.top = ''
    container.appendChild(stats.dom)
  }

  const initEventHandlers = () => {
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.mouseButtons = {
      LEFT: undefined,
      RIGHT: THREE.MOUSE.ROTATE
    }

    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    window.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.button == 0) {
        isDragging = true
        previousMousePosition = { x: event.clientX, y: event.clientY }
      }
    })
    window.addEventListener('mouseup', () => {
      isDragging = false
    })
    window.addEventListener('mousemove', (event: MouseEvent) => {
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

  // rapier3D debug lines
  const lineGeometry = new THREE.BufferGeometry()
  const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: false })
  const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial)
  scene.add(lineSegments)

  const animate = () => {
    requestAnimationFrame(animate)
    stats.begin()

    // Get the debug render data from the physics world
    const { vertices, colors } = world.debugRender()
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
    lineGeometry.attributes.position.needsUpdate = true

    world.step()
    effect.render(scene, camera)
    animationHelper.update(clock.getDelta())

    scene.traverse(function (object) {
      if (object.userData.rigidBody) {
        object.position.copy(object.userData.rigidBody.translation())
        object.quaternion.copy(object.userData.rigidBody.rotation())
      }
    })

    stats.end()
  }

  const main = () => {
    initScene()
    initEventHandlers()
    animate()
  }
  main()
  return { LoadChar, LoadPose }
}
