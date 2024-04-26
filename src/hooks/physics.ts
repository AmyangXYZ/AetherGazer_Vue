import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'

export class RMPhysics {
  scene: THREE.Scene
  world: RAPIER.World
  gravity: RAPIER.Vector3
  mesh: any // mmd model mesh, loaded by 'three/addons/loaders/MMDLoader.js'
  bodies: RAPIER.RigidBody[] = []
  colliders: RAPIER.Collider[] = []

  helperEnabled: boolean = false
  helperLineGeometry = new THREE.BufferGeometry()
  helperLineMaterial = new THREE.LineBasicMaterial({ vertexColors: false })
  helperLineSegments: THREE.LineSegments

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.gravity = { x: 0.0, y: -9.8, z: 0.0 }
    this.world = new RAPIER.World(this.gravity)

    // physics helper lines
    this.helperLineSegments = new THREE.LineSegments(
      this.helperLineGeometry,
      this.helperLineMaterial
    )
  }

  step() {
    this.updateRigidBodies()
    this.world.step()
    this.updateBones()

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

  addGround(width: number, y: number) {
    const groundGeometry = new THREE.PlaneGeometry(width, width)
    const groundMaterial = new THREE.MeshBasicMaterial({ vertexColors: true })
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
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.1, width / 2)
    this.world.createCollider(groundColliderDesc, groundBody)
  }

  addMMD(mesh: THREE.Object3D) {
    this.mesh = mesh
    this.createRigidBodies()
    // this.addConstraints()
  }

  showHelper() {
    this.helperEnabled = true
    this.scene.add(this.helperLineSegments)
  }

  hideHelper() {
    if (this.helperEnabled) {
      this.scene.remove(this.helperLineSegments)
    }
    this.helperEnabled = false
  }

  private createRigidBodies() {
    for (const param of this.mesh.geometry.userData.MMD.rigidBodies) {
      const bone =
        param.boneIndex == -1 ? new THREE.Bone() : this.mesh.skeleton.bones[param.boneIndex]

      const bonePosition = new THREE.Vector3()
      const boneQuaternion = new THREE.Quaternion()
      const boneScale = new THREE.Vector3()
      bone.getWorldPosition(bonePosition)
      bone.getWorldQuaternion(boneQuaternion)
      bone.getWorldScale(boneScale)
      const boneMatrix = new THREE.Matrix4()
      boneMatrix.compose(bonePosition, boneQuaternion, boneScale)

      const offsetPosition = new THREE.Vector3(...param.position)
      const offsetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...param.rotation)
      )
      const offsetMatrix = new THREE.Matrix4()
      offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))

      const finalMatrix = new THREE.Matrix4()
      finalMatrix.multiplyMatrices(boneMatrix, offsetMatrix)

      const finalPosition = new THREE.Vector3()
      const finalQuaternion = new THREE.Quaternion()
      const finalScale = new THREE.Vector3()
      finalMatrix.decompose(finalPosition, finalQuaternion, finalScale)

      let rigidBodyDesc: RAPIER.RigidBodyDesc
      if (param.type == 0) {
        rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      } else {
        rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      }
      rigidBodyDesc
        .setTranslation(finalPosition.x, finalPosition.y, finalPosition.z)
        .setRotation({
          x: finalQuaternion.x,
          y: finalQuaternion.y,
          z: finalQuaternion.z,
          w: finalQuaternion.w
        })
        .setLinearDamping(param.positionDamping)
        .setAngularDamping(param.rotationDamping)

      const rigidBody = this.world.createRigidBody(rigidBodyDesc)
      rigidBody.userData = param

      let colliderDesc: any
      switch (param.shapeType) {
        case 0:
          colliderDesc = RAPIER.ColliderDesc.ball(param.width / 2)
          break
        case 1:
          colliderDesc = RAPIER.ColliderDesc.cuboid(
            param.width / 2,
            param.height / 2,
            param.depth / 2
          )
          break
        case 2:
          colliderDesc = RAPIER.ColliderDesc.capsule(param.height / 2, param.width / 2)
          break
        default:
          console.error('Unknown shape type', param.shapeType)
          break
      }

      colliderDesc
        .setMass(param.weight)
        .setFriction(param.friction)
        .setRestitution(param.restitution)

      const collider = this.world.createCollider(colliderDesc, rigidBody)

      this.bodies.push(rigidBody)
      this.colliders.push(collider)
    }
  }

  private addConstraints() {
    this.mesh.geometry.userData.MMD.constraints.forEach((param: any) => {
      const bodyA = this.bodies[param.rigidBodyIndex1]
      const bodyB = this.bodies[param.rigidBodyIndex2]
      console.log(param, bodyA.userData, bodyB.userData)

      // Extract the anchor points from the final joint transforms
      const anchorA = new THREE.Vector3()
      const anchorB = new THREE.Vector3()

      const axes = [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 }
      ]
      const masksLinear = [
        RAPIER.JointAxesMask.Y | RAPIER.JointAxesMask.Z,
        RAPIER.JointAxesMask.X | RAPIER.JointAxesMask.Z,
        RAPIER.JointAxesMask.X | RAPIER.JointAxesMask.Y
      ]
      const masksAngular = [
        RAPIER.JointAxesMask.AngX,
        RAPIER.JointAxesMask.AngY,
        RAPIER.JointAxesMask.AngZ
      ]

      for (let i = 0; i < 3; i++) {
        const joint = RAPIER.JointData.generic(anchorA, anchorB, axes[i], masksLinear[i])
        joint.stiffness = param.springPosition[i]
        joint.limitsEnabled = true
        joint.limits = [param.translationLimitation1[i], param.translationLimitation2[i]]
        this.world.createImpulseJoint(joint, bodyA, bodyB, true)
      }

      // for (let i = 0; i < 3; i++) {
      //   const joint = RAPIER.JointData.generic(anchorA, anchorB, axes[i], masksAngular[i])
      //   joint.stiffness = param.springRotation[i]
      //   joint.limitsEnabled = true
      //   joint.limits = [param.rotationLimitation1[i], param.rotationLimitation2[i]]
      //   this.world.createImpulseJoint(joint, bodyA, bodyB, true)
      // }
      // const bodyAParam = bodyA.userData
      // const bodyBParam = bodyB.userData
      // const joint = RAPIER.JointData.generic(
      //   new THREE.Vector3(...bodyAParam.position).distanceTo(
      //     new THREE.Vector3(...bodyBParam.position)
      //   ),
      //   anchorA,
      //   anchorB
      // )
      // // joint.stiffness = param.springPosition[0]
      // this.world.createImpulseJoint(joint, bodyA, bodyB, true)
    })
  }

  private updateRigidBodies() {
    if (this.mesh !== undefined) {
      this.bodies.forEach((rb: RAPIER.RigidBody) => {
        const param: any = rb.userData
        if (param.boneIndex !== -1 && param.type === 0) {
          const bone = this.mesh.skeleton.bones[param.boneIndex]

          const bonePosition = new THREE.Vector3()
          const boneQuaternion = new THREE.Quaternion()
          bone.getWorldPosition(bonePosition)
          bone.getWorldQuaternion(boneQuaternion)
          const boneMatrix = new THREE.Matrix4()
          boneMatrix.compose(bonePosition, boneQuaternion, new THREE.Vector3(1, 1, 1))

          const offsetPosition = new THREE.Vector3(...param.position)
          const offsetQuaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(...param.rotation)
          )
          const offsetMatrix = new THREE.Matrix4()
          offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))

          const finalMatrix = new THREE.Matrix4()
          finalMatrix.multiplyMatrices(boneMatrix, offsetMatrix)

          const finalPosition = new THREE.Vector3()
          const finalQuaternion = new THREE.Quaternion()
          finalMatrix.decompose(finalPosition, finalQuaternion, new THREE.Vector3())

          rb.setNextKinematicTranslation({
            x: finalPosition.x,
            y: finalPosition.y,
            z: finalPosition.z
          })
          rb.setNextKinematicRotation({
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
    if (this.mesh !== undefined) {
      for (const rb of this.bodies) {
        const param: any = rb.userData
        if (param.boneIndex != -1 && param.type == 1) {
          const position = rb.translation()
          const rotation = rb.rotation()
          const rigidBodyMatrix = new THREE.Matrix4()
          const rigidBodyPosition = new THREE.Vector3(position.x, position.y, position.z)
          const rigidBodyQuaternion = new THREE.Quaternion(
            rotation.x,
            rotation.y,
            rotation.z,
            rotation.w
          )
          rigidBodyMatrix.compose(
            rigidBodyPosition,
            rigidBodyQuaternion,
            new THREE.Vector3(1, 1, 1)
          )

          const offsetPosition = new THREE.Vector3(...param.position)
          const offsetQuaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(...param.rotation)
          )
          const offsetMatrix = new THREE.Matrix4()
          offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))
          const finalMatrix = new THREE.Matrix4()

          finalMatrix.multiplyMatrices(rigidBodyMatrix, offsetMatrix.invert())

          const finalPosition = new THREE.Vector3()
          const finalQuaternion = new THREE.Quaternion()
          finalMatrix.decompose(finalPosition, finalQuaternion, new THREE.Vector3())

          const bone = this.mesh.skeleton.bones[param.boneIndex]
          if (bone.parent != undefined) {
            bone.position.copy(bone.parent.worldToLocal(finalPosition))
          } else {
            bone.position.copy(finalPosition)
          }
        }
      }
    }
  }
}
