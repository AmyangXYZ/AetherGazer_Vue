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
  ShadowGenerator
} from '@babylonjs/core'

import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin'
import havokPhysics from '@babylonjs/havok'

import { VmdLoader, MmdRuntime, MmdPhysics } from 'babylon-mmd'
import { SelectedChar } from './useStates'
//

export async function useScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, {}, true)
  const scene = new Scene(engine)

  const camera = new ArcRotateCamera('ArcRotateCamera', 0, 0, 45, new Vector3(0, 10, 0), scene)
  camera.setPosition(new Vector3(0, 10, -45))
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

  const promises: Promise<any>[] = []

  const vmdLoader = new VmdLoader(scene)

  promises.push(vmdLoader.loadAsync('motion', '/motions/1.vmd'))

  promises.push(
    SceneLoader.ImportMeshAsync(
      undefined,
      `/chars/${SelectedChar.value}/${SelectedChar.value}.pmx`,
      undefined,
      scene,
      undefined
    )
  )

  promises.push(
    (async (): Promise<void> => {
      const havokInstance = await havokPhysics()
      const havokPlugin = new HavokPlugin(true, havokInstance)
      scene.enablePhysics(new Vector3(0, -98, 0), havokPlugin)
    })()
  )

  const [
    mmdAnimation,
    {
      meshes: [modelMesh]
    }
  ] = await Promise.all(promises)

  const mmdRuntime = new MmdRuntime(scene, new MmdPhysics(scene))
  mmdRuntime.register(scene)

  const mmdModel = mmdRuntime.createMmdModel(modelMesh as Mesh)
  mmdModel.addAnimation(mmdAnimation)
  mmdModel.setAnimation('motion')

  mmdRuntime.playAnimation()

  MeshBuilder.CreateGround(
    'Ground',
    { width: 100, height: 100, subdivisions: 2, updatable: false },
    scene
  )

  engine.runRenderLoop(() => {
    engine.resize()
    scene.render()
  })
}
