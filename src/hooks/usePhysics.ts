import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'

export class MMDPhysics {
  scene: THREE.Scene
  world: RAPIER.World
  gravity: RAPIER.Vector3
  model: any // mmd model mesh
  mmd: any // mmd parameters
  bodies: RAPIER.RigidBody[] = []

  helperEnabled: boolean = false
  helperLineGeometry = new THREE.BufferGeometry()
  helperLineMaterial = new THREE.LineBasicMaterial({ vertexColors: false })

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.gravity = { x: 0.0, y: -2, z: 0.0 }
    this.world = new RAPIER.World(this.gravity)

    // helper lines
    scene.add(new THREE.LineSegments(this.helperLineGeometry, this.helperLineMaterial))
  }

  step() {
    // this.updateRigidBodies()
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
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 })
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

  addMMD(MMD: any) {
    this.model = MMD
    this.model.visible = false
    this.mmd = MMD.geometry.userData.MMD

    this.createRigidBodies()
    // this.addConstraints()
  }

  private createRigidBodies() {
    this.bodies = this.mmd.rigidBodies.map((rb: any) => {
      console.log(rb)
      const bone = rb.boneIndex == -1 ? new THREE.Bone() : this.model.skeleton.bones[rb.boneIndex]
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

      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(finalPosition.x, finalPosition.y, finalPosition.z)
        .setRotation({
          x: finalQuaternion.x,
          y: finalQuaternion.y,
          z: finalQuaternion.z,
          w: finalQuaternion.w
        })

      const rigidBody = this.world.createRigidBody(rigidBodyDesc)

      let colliderDesc: any
      switch (rb.shapeType) {
        case 0:
          colliderDesc = RAPIER.ColliderDesc.ball(rb.width)
          break
        case 1:
          colliderDesc = RAPIER.ColliderDesc.cuboid(rb.width, rb.height, rb.depth)
          break
        case 2:
          colliderDesc = RAPIER.ColliderDesc.capsule(rb.width, rb.height)
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

  private addConstraints() {
    this.mmd.constraints.forEach((constraint: any) => {
      const bodyA = this.bodies[constraint.rigidBodyIndex1]
      const bodyB = this.bodies[constraint.rigidBodyIndex2]

      const anchor1 = new THREE.Vector3(...constraint.position)
      const anchor2 = new THREE.Vector3(...constraint.position)
      const axis = new THREE.Vector3(1, 0, 0) // Assuming the X-axis as the joint axis

      const translationMask =
        RAPIER.JointAxesMask.X | RAPIER.JointAxesMask.Y | RAPIER.JointAxesMask.Z

      const rotationMask =
        RAPIER.JointAxesMask.AngX | RAPIER.JointAxesMask.AngY | RAPIER.JointAxesMask.AngZ

      const params = RAPIER.JointData.generic(
        { x: anchor1.x, y: anchor1.y, z: anchor1.z },
        { x: anchor2.x, y: anchor2.y, z: anchor2.z },
        { x: axis.x, y: axis.y, z: axis.z },
        translationMask | rotationMask
      )

      this.world.createImpulseJoint(params, bodyA, bodyB, true)
    })
  }

  private updateRigidBodies() {
    if (this.model !== undefined) {
      this.mmd.rigidBodies.forEach((rb: any, index: number) => {
        if (rb.boneIndex !== -1 && rb.type === 0) {
          const bone = this.model.skeleton.bones[rb.boneIndex]
          const rigidBody = this.bodies[index]

          // Get the world position and quaternion of the bone
          const position = new THREE.Vector3()
          const quaternion = new THREE.Quaternion()
          bone.getWorldPosition(position)
          bone.getWorldQuaternion(quaternion)

          // Update the rigid body's position and rotation
          rigidBody.setTranslation({ x: position.x, y: position.y, z: position.z }, true)
          rigidBody.setRotation(
            { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
            true
          )
        }
      })
    }
  }

  // update bone from body
  private updateBones() {
    if (this.mmd !== undefined) {
      this.mmd.rigidBodies.forEach((rb: any, index: number) => {
        if (rb.boneIndex !== -1 && rb.type === 0) {
          const bone = this.model.skeleton.bones[rb.boneIndex]
          const rigidBody = this.bodies[index]

          // Get the position and rotation from the rigid body
          const position = rigidBody.translation()
          const rotation = rigidBody.rotation()

          // Update the bone's position and quaternion
          bone.position.set(position.x, position.y, position.z)
          bone.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
        }
      })

      // Update the world matrices of the bones
      this.model.skeleton.update()
    }
  }
}
