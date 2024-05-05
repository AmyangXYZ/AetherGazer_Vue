import {
  Engine,
  ArcRotateCamera,
  Scene,
  SceneLoader,
  Vector3,
  Mesh,
  MeshBuilder,
  Color3,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  PhysicsShapeType,
  PhysicsAggregate,
  PhysicsViewer,
  AbstractMesh,
  Texture,
  BackgroundMaterial,
  SkeletonViewer,
  PointerDragBehavior
} from '@babylonjs/core'
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin'
import havokPhysics from '@babylonjs/havok'
import {
  VmdLoader,
  MmdRuntime,
  MmdPhysics,
  MmdAnimation,
  MmdModel,
  MmdPlayerControl,
  PmxLoader
} from 'babylon-mmd'

import { watch } from 'vue'
import { FPS, PhysicsEnabled, SelectedAnimation, SelectedChar, ShowRigidBodies } from './useStates'
import { SdefInjector } from 'babylon-mmd/esm/Loader/sdefInjector'

export async function useScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, {}, true)
  SdefInjector.OverrideEngineCreateEffect(engine)
  const pmxLoader = SceneLoader.GetPluginForExtension('.pmx') as PmxLoader
  pmxLoader.loggingEnabled = true

  const scene = new Scene(engine)
  let shadowGenerator: ShadowGenerator

  const havokInstance = await havokPhysics()
  const havokPlugin = new HavokPlugin(true, havokInstance)
  scene.enablePhysics(new Vector3(0, -98, 0), havokPlugin)
  let physicsViewer: PhysicsViewer | undefined

  const showPhysicsHelper = () => {
    if (physicsViewer != undefined) {
      physicsViewer.dispose()
    }
    physicsViewer = new PhysicsViewer(scene)
    for (const node of modelMesh.getChildTransformNodes(true)) {
      if (node.physicsBody) physicsViewer.showBody(node.physicsBody)
    }
  }

  const initScene = () => {
    const camera = new ArcRotateCamera('ArcRotateCamera', 0, 0, 45, new Vector3(0, 12, 0), scene)
    camera.setPosition(new Vector3(0, 22, -25))
    camera.attachControl(canvas, false)
    camera.inertia = 0.8
    camera.speed = 10

    const hemisphericLight = new HemisphericLight('HemisphericLight', new Vector3(0, 1, 0), scene)
    hemisphericLight.intensity = 0.4
    hemisphericLight.specular = new Color3(0, 0, 0)
    hemisphericLight.groundColor = new Color3(1, 1, 1)

    const directionalLight = new DirectionalLight(
      'DirectionalLight',
      new Vector3(8, -15, 10),
      scene
    )
    directionalLight.intensity = 0.8

    shadowGenerator = new ShadowGenerator(1024, directionalLight, true)
    shadowGenerator.usePercentageCloserFiltering = true
    shadowGenerator.forceBackFacesOnly = true
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM
    shadowGenerator.frustumEdgeFalloff = 0.1

    // Create and tweak the background material.
    const backgroundMaterial = new BackgroundMaterial('backgroundMaterial', scene)
    backgroundMaterial.diffuseTexture = new Texture('/backgroundGround.png', scene)
    backgroundMaterial.diffuseTexture.hasAlpha = true
    backgroundMaterial.opacityFresnel = false
    backgroundMaterial.shadowLevel = 0.4
    backgroundMaterial.useRGBColor = false
    backgroundMaterial.primaryColor = Color3.Magenta()
    const ground = MeshBuilder.CreateGround('Ground', {
      width: 64,
      height: 64,
      subdivisions: 2,
      updatable: false
    })
    ground.material = backgroundMaterial
    ground.receiveShadows = true
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene)
  }

  const pointerDragBehavior = new PointerDragBehavior({
    dragAxis: new Vector3(0.01, 0, 0) // Rotate around the X-axis
  })
  pointerDragBehavior.onDragStartObservable.add(() => {
    if (scene.activeCamera) {
      scene.activeCamera.detachControl(canvas)
    }
  })
  pointerDragBehavior.onDragObservable.add((event) => {
    modelMesh.rotation.y -= event.dragDistance * 1.25
  })
  pointerDragBehavior.onDragEndObservable.add(() => {
    if (scene.activeCamera) {
      scene.activeCamera.attachControl(canvas, true)
    }
  })

  const vmdLoader = new VmdLoader(scene)
  let mmdRuntime: MmdRuntime,
    modelMesh: AbstractMesh,
    mmdModel: MmdModel,
    motion: MmdAnimation,
    control: MmdPlayerControl

  const initMMD = async () => {
    let physics: MmdPhysics | undefined = undefined
    if (PhysicsEnabled.value) {
      physics = new MmdPhysics(scene)
      physics.angularLimitClampThreshold = (30 * Math.PI) / 180
    }
    mmdRuntime = new MmdRuntime(scene, physics)

    mmdRuntime.register(scene)

    await loadMesh()
    loadMotion()
    control = new MmdPlayerControl(scene, mmdRuntime, undefined)
    control.autoHidePlayerControl = true
    mmdRuntime.onPauseAnimationObservable.add(() => {
      if (mmdRuntime.currentTime == mmdRuntime.animationDuration) {
        mmdRuntime.seekAnimation(0, true)
        mmdRuntime.playAnimation()
      }
    })
  }

  const loadMesh = async () => {
    modelMesh = await SceneLoader.ImportMeshAsync(
      undefined,
      `/chars/${SelectedChar.value}/`,
      `${SelectedChar.value}.pmx`,
      scene
    ).then((result) => {
      const mesh = result.meshes[0]
      for (const m of mesh.metadata.meshes) {
        m.receiveShadows = true
      }
      const skeletonViewer = new SkeletonViewer(result.skeletons[0], modelMesh, scene, false)
      skeletonViewer.isEnabled = true
      skeletonViewer.color = new Color3(1, 0, 0)
      shadowGenerator.addShadowCaster(mesh)
      return mesh
    })

    if (ShowRigidBodies.value) {
      showPhysicsHelper()
    }
    modelMesh.addBehavior(pointerDragBehavior)
    mmdModel = mmdRuntime.createMmdModel(modelMesh as Mesh)
  }

  const loadMotion = async () => {
    motion = await vmdLoader.loadAsync(
      `${SelectedAnimation.value}`,
      `/motions/${SelectedAnimation.value}.vmd`
    )
    mmdModel.addAnimation(motion)
    mmdModel.setAnimation(`${SelectedAnimation.value}`)
    mmdRuntime.playAnimation()
  }

  watch(SelectedChar, async () => {
    if (mmdModel != undefined) {
      mmdRuntime.destroyMmdModel(mmdModel)
      mmdModel.dispose()
      modelMesh.dispose()
      if (physicsViewer != undefined) {
        physicsViewer.dispose()
        physicsViewer = undefined
      }
    }
    await loadMesh()
    loadMotion()
  })

  watch(SelectedAnimation, async () => {
    if (mmdModel != undefined) {
      let exist = false
      for (const v of mmdModel.runtimeAnimations) {
        if (v.animation != undefined && v.animation.name == SelectedAnimation.value) {
          exist = true
          break
        }
      }
      if (!exist) {
        loadMotion()
      } else {
        mmdModel.setAnimation(`${SelectedAnimation.value}`)
        mmdRuntime.seekAnimation(0, true)
        mmdRuntime.playAnimation()
      }
    }
  })

  watch(ShowRigidBodies, () => {
    if (ShowRigidBodies.value) {
      showPhysicsHelper()
    } else {
      if (physicsViewer != undefined) {
        physicsViewer.dispose()
        physicsViewer = undefined
      }
    }
  })

  watch(PhysicsEnabled, () => {
    if (mmdRuntime != undefined) {
      mmdRuntime.dispose(scene)
      modelMesh.dispose()
      mmdModel.dispose()
      control.dispose()
    }
    initMMD()
  })

  initScene()
  initMMD()

  engine.runRenderLoop(() => {
    FPS.value = Math.round(engine.getFps())
    engine.resize()
    scene.render()
  })
}
