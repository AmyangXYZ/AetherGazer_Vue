import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'

export class MMDPhysics {
  scene: THREE.Scene
  world: RAPIER.World
  gravity: RAPIER.Vector3
  mesh: any // mmd model mesh, loaded by 'three/addons/loaders/MMDLoader.js'
  bodies: RAPIER.RigidBody[] = []

  helperEnabled: boolean = false
  helperLineGeometry = new THREE.BufferGeometry()
  helperLineMaterial = new THREE.LineBasicMaterial({ vertexColors: false })

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.gravity = { x: 0.0, y: -9.8, z: 0.0 }
    this.world = new RAPIER.World(this.gravity)

    // helper lines
    scene.add(new THREE.LineSegments(this.helperLineGeometry, this.helperLineMaterial))
  }

  step() {
    this.updateRigidBodies()
    this.world.step()
    // this.updateBones()

    if (this.helperEnabled) {
      const { vertices, colors } = this.world.debugRender()
      this.helperLineGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
      )
      this.helperLineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
      this.helperLineGeometry.attributes.position.needsUpdate = true
    }
  }

  showHelper() {
    this.helperEnabled = true
  }
  hideHelper() {
    this.helperEnabled = false
  }

  addGround(y: number) {
    const groundGeometry = new THREE.PlaneGeometry(10, 10)
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.position.y = y
    this.scene.add(groundMesh)

    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      groundMesh.position.x,
      groundMesh.position.y,
      groundMesh.position.z
    )
    const groundBody = this.world.createRigidBody(groundBodyDesc)
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(5, 0.1, 5)
    this.world.createCollider(groundColliderDesc, groundBody)
  }

  addMMD(mesh: THREE.Object3D) {
    this.mesh = mesh
    this.mesh.visible = false

    this.createRigidBodies()
    // this.addConstraints()
  }

  private createRigidBodies() {
    this.bodies = this.mesh.geometry.userData.MMD.rigidBodies.map((rb: any) => {
      const bone = rb.boneIndex == -1 ? new THREE.Bone() : this.mesh.skeleton.bones[rb.boneIndex]
      const bonePosition = new THREE.Vector3()
      const boneQuaternion = new THREE.Quaternion()
      bone.getWorldPosition(bonePosition)
      bone.getWorldQuaternion(boneQuaternion)

      const boneScale = new THREE.Vector3()
      bone.getWorldScale(boneScale)

      const boneMatrix = new THREE.Matrix4()
      boneMatrix.compose(bonePosition, boneQuaternion, boneScale)

      const offsetPosition = new THREE.Vector3(rb.position[0], rb.position[1], rb.position[2])
      const offsetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rb.rotation[0], rb.rotation[1], rb.rotation[2])
      )
      const offsetMatrix = new THREE.Matrix4()
      offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))

      const finalMatrix = new THREE.Matrix4()
      finalMatrix.multiplyMatrices(boneMatrix, offsetMatrix)

      const finalPosition = new THREE.Vector3()
      const finalQuaternion = new THREE.Quaternion()
      const finalScale = new THREE.Vector3()
      finalMatrix.decompose(finalPosition, finalQuaternion, finalScale)

      const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(finalPosition.x, finalPosition.y, finalPosition.z)
        .setRotation({
          x: finalQuaternion.x,
          y: finalQuaternion.y,
          z: finalQuaternion.z,
          w: finalQuaternion.w
        })

      const rigidBody = this.world.createRigidBody(rigidBodyDesc)
      rigidBody.userData = rb

      let colliderDesc: any
      switch (rb.shapeType) {
        case 0:
          colliderDesc = RAPIER.ColliderDesc.ball(rb.width)
          break
        case 1:
          colliderDesc = RAPIER.ColliderDesc.cuboid(rb.width, rb.height, rb.depth)
          break
        case 2:
          colliderDesc = RAPIER.ColliderDesc.capsule(rb.height / 2, rb.width)
          break
        default:
          console.error('Unknown shape type', rb.shapeType)
          break
      }

      colliderDesc.setMass(rb.weight).setFriction(rb.friction).setRestitution(rb.restitution)
      this.world.createCollider(colliderDesc, rigidBody)

      return rigidBody
    })
  }

  private addConstraints() {}

  private updateRigidBodies() {
    if (this.mesh !== undefined) {
      this.bodies.forEach((rb: any, index: number) => {
        const param = rb.userData
        if (param.boneIndex !== -1 && param.type === 0) {
          const bone = this.mesh.skeleton.bones[param.boneIndex]
          const rigidBody = this.bodies[index]

          const bonePosition = new THREE.Vector3()
          const boneQuaternion = new THREE.Quaternion()
          bone.getWorldPosition(bonePosition)
          bone.getWorldQuaternion(boneQuaternion)

          const boneScale = new THREE.Vector3(1, 1, 1)
          const boneMatrix = new THREE.Matrix4()
          boneMatrix.compose(bonePosition, boneQuaternion, boneScale)

          const offsetPosition = new THREE.Vector3(
            param.position[0],
            param.position[1],
            param.position[2]
          )
          const offsetQuaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(param.rotation[0], param.rotation[1], param.rotation[2])
          )
          const offsetMatrix = new THREE.Matrix4()
          offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))

          const finalMatrix = new THREE.Matrix4()
          finalMatrix.multiplyMatrices(boneMatrix, offsetMatrix)

          const finalPosition = new THREE.Vector3()
          const finalQuaternion = new THREE.Quaternion()
          finalMatrix.decompose(finalPosition, finalQuaternion, new THREE.Vector3())

          rigidBody.setNextKinematicTranslation({
            x: finalPosition.x,
            y: finalPosition.y,
            z: finalPosition.z
          })
          rigidBody.setNextKinematicRotation({
            x: finalQuaternion.x,
            y: finalQuaternion.y,
            z: finalQuaternion.z,
            w: finalQuaternion.w
          })
        }
      })
    }
  }

  // update bone from body
  private updateBones() {
    // if (this.mmd !== undefined && this.bodies.length === this.mmd.rigidBodies.length) {
    //   this.mmd.rigidBodies.forEach((rb: any, index: number) => {
    //     if (rb.boneIndex !== -1 && rb.type === 0) {
    //       const bone = this.mesh.skeleton.bones[rb.boneIndex]
    //       const rigidBody = this.bodies[index]
    //       const position = rigidBody.translation()
    //       const rotation = rigidBody.rotation()
    //       const rigidBodyMatrix = new THREE.Matrix4()
    //       const rigidBodyPosition = new THREE.Vector3(position.x, position.y, position.z)
    //       const rigidBodyQuaternion = new THREE.Quaternion(
    //         rotation.x,
    //         rotation.y,
    //         rotation.z,
    //         rotation.w
    //       )
    //       rigidBodyMatrix.compose(
    //         rigidBodyPosition,
    //         rigidBodyQuaternion,
    //         new THREE.Vector3(1, 1, 1)
    //       )
    //       const offsetMatrix = new THREE.Matrix4()
    //       const offsetPosition = new THREE.Vector3(
    //         -rb.position[0],
    //         -rb.position[1],
    //         -rb.position[2]
    //       )
    //       const offsetQuaternion = new THREE.Quaternion().setFromEuler(
    //         new THREE.Euler(-rb.rotation[0], -rb.rotation[1], -rb.rotation[2])
    //       )
    //       offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))
    //       const boneMatrix = new THREE.Matrix4()
    //       boneMatrix.multiplyMatrices(rigidBodyMatrix, offsetMatrix)
    //       const bonePosition = new THREE.Vector3()
    //       const boneQuaternion = new THREE.Quaternion()
    //       const boneScale = new THREE.Vector3()
    //       boneMatrix.decompose(bonePosition, boneQuaternion, boneScale)
    //       bone.position.copy(bonePosition)
    //       bone.quaternion.copy(boneQuaternion)
    //     }
    //   })
    //   this.mesh.skeleton.update()
    // }
  }
}
