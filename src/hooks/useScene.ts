import {
  Engine,
  ArcRotateCamera,
  Scene,
  SceneLoader,
  Vector3,
  StandardMaterial,
  Mesh,
  MeshBuilder,
  Color3,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  PhysicsShapeType,
  PhysicsAggregate,
  PhysicsViewer,
  AbstractMesh
} from '@babylonjs/core'
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin'
import havokPhysics from '@babylonjs/havok'
import { VmdLoader, MmdRuntime, MmdPhysics, MmdAnimation, MmdModel } from 'babylon-mmd'

import { watch } from 'vue'
import { FPS, SelectedAnimation, SelectedChar, ShowRigidBodies } from './useStates'

export async function useScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, {}, true)
  const scene = new Scene(engine)

  const havokInstance = await havokPhysics()
  const havokPlugin = new HavokPlugin(true, havokInstance)
  scene.enablePhysics(new Vector3(0, -98, 0), havokPlugin)

  let physicsViewer: PhysicsViewer | undefined

  const showPhysicsHelper = () => {
    if (physicsViewer != undefined) {
      physicsViewer.dispose()
    }
    physicsViewer = new PhysicsViewer(scene)
    const m = mmdModel as any // bypass access-private check
    for (const body of m._physicsModel._bodies) {
      if (body != undefined) {
        physicsViewer.showBody(body)
      }
    }
  }

  const camera = new ArcRotateCamera('ArcRotateCamera', 0, 0, 45, new Vector3(0, 12, 0), scene)
  camera.setPosition(new Vector3(0, 22, -25))
  camera.attachControl(canvas, false)
  camera.inertia = 0.8
  camera.speed = 10

  const hemisphericLight = new HemisphericLight('HemisphericLight', new Vector3(0, 1, 0), scene)
  hemisphericLight.intensity = 0.4
  hemisphericLight.specular = new Color3(0, 0, 0)
  hemisphericLight.groundColor = new Color3(1, 1, 1)

  const directionalLight = new DirectionalLight('DirectionalLight', new Vector3(0.5, -1, 1), scene)
  directionalLight.intensity = 0.8

  const shadowGenerator = new ShadowGenerator(1024, directionalLight, true)
  shadowGenerator.usePercentageCloserFiltering = true
  shadowGenerator.forceBackFacesOnly = true
  shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM
  shadowGenerator.frustumEdgeFalloff = 0.1

  const groundMaterial = new StandardMaterial('GroundMaterial', scene)
  groundMaterial.diffuseColor = new Color3(0.1, 0.1, 0.1)
  const ground = MeshBuilder.CreateGround(
    'Ground',
    { width: 50, height: 50, subdivisions: 2, updatable: false },
    scene
  )
  ground.material = groundMaterial
  ground.receiveShadows = true
  new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene)

  const mmdRuntime = new MmdRuntime(scene, new MmdPhysics(scene))

  // const mmdRuntime = new MmdRuntime(scene)
  mmdRuntime.register(scene)

  const vmdLoader = new VmdLoader(scene)
  let modelMesh: AbstractMesh, mmdModel: MmdModel, motion: MmdAnimation

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
      shadowGenerator.addShadowCaster(mesh)
      return mesh
    })
    mmdModel = mmdRuntime.createMmdModel(modelMesh as Mesh)
    if (ShowRigidBodies.value) {
      showPhysicsHelper()
    }
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

  await loadMesh()
  loadMotion()

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

  engine.runRenderLoop(() => {
    FPS.value = Math.round(engine.getFps())
    engine.resize()
    scene.render()
  })
}
