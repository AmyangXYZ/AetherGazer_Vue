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

    this.constraint_test()
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
    this.addConstraints()
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
      // save to rb params
      param.offsetMatrix = new THREE.Matrix4()
      param.offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))
      param.offsetMatrixInverse = param.offsetMatrix.clone().invert()
      const { position, quaternion } = this.tranformFromBone(bone, param.offsetMatrix)

      let rigidBodyDesc: RAPIER.RigidBodyDesc
      if (param.type == 0) {
        rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      } else {
        rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      }
      rigidBodyDesc
        .setTranslation(position.x, position.y, position.z)
        .setRotation({
          x: quaternion.x,
          y: quaternion.y,
          z: quaternion.z,
          w: quaternion.w
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

  private constraint_test() {
    const rb1Desc = RAPIER.RigidBodyDesc.fixed().setTranslation(-4, 0, 0)
    const rb1 = this.world.createRigidBody(rb1Desc)
    const cld1Desc = RAPIER.ColliderDesc.ball(1)
    this.world.createCollider(cld1Desc, rb1)

    const rb2Desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0)
    const rb2 = this.world.createRigidBody(rb2Desc)
    const cld2Desc = RAPIER.ColliderDesc.cuboid(1, 2, 3)
    this.world.createCollider(cld2Desc, rb2)

    const rb3Desc = RAPIER.RigidBodyDesc.fixed().setTranslation(4, 0, 0)
    const rb3 = this.world.createRigidBody(rb3Desc)
    const cld3Desc = RAPIER.ColliderDesc.ball(1)
    this.world.createCollider(cld3Desc, rb3)

    const anchor1 = new THREE.Vector3(0, 0, 0)
    const anchor2 = new THREE.Vector3(0, 2, 0)
    const anchor3 = new THREE.Vector3(0, 0, 0)

    const joint1 = RAPIER.JointData.spring(2, 0, 0.5, anchor1, anchor2)
    joint1.limitsEnabled = true
    joint1.limits = [1, 2]
    this.world.createImpulseJoint(joint1, rb1, rb2, true)

    const joint2 = RAPIER.JointData.rope(5, anchor2, anchor3)
    // this.world.createImpulseJoint(joint2, rb2, rb3, true)
  }

  private addConstraints() {
    for (const param of this.mesh.geometry.userData.MMD.constraints) {
      const bodyA = this.bodies[param.rigidBodyIndex1]
      const bodyB = this.bodies[param.rigidBodyIndex2]
      const bodyAParam: any = bodyA.userData
      const bodyBParam: any = bodyB.userData
      console.log(param, bodyAParam, bodyBParam)
      // Extract the anchor points from the final joint transforms
      const anchorA = this.getAnchor(param, bodyAParam.offsetMatrixInverse)
      const anchorB = this.getAnchor(param, bodyBParam.offsetMatrixInverse)
      console.log(anchorA, anchorB)
      const axes = [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 }
      ]
      const masksLinear =
        RAPIER.JointAxesMask.AngX | RAPIER.JointAxesMask.AngY | RAPIER.JointAxesMask.AngZ

      const masksAngular = RAPIER.JointAxesMask.X | RAPIER.JointAxesMask.Y | RAPIER.JointAxesMask.Z

      const mask =
        RAPIER.JointAxesMask.X |
        RAPIER.JointAxesMask.Y |
        RAPIER.JointAxesMask.Z |
        RAPIER.JointAxesMask.AngX |
        RAPIER.JointAxesMask.AngY |
        RAPIER.JointAxesMask.AngZ

      // for (let i = 0; i < 1; i++) {
      //   if (param.translationLimitation1[i] != 0 || param.translationLimitation2[i] != 0) {
      //     console.log(param)
      //     const joint = RAPIER.JointData.generic(anchorA, anchorB, axes[i], masksLinear[0])

      //     if (param.springPosition[i] != 0) {
      //       joint.stiffness = param.springPosition[i]
      //     }
      //     joint.limitsEnabled = true
      //     joint.limits = [-0.01, 0.01]
      //     this.world.createImpulseJoint(joint, bodyA, bodyB, true)
      //   }
      // }

      // for (let i = 0; i < 1; i++) {
      //   if (param.rotationLimitation1[i] != 0 || param.rotationLimitation2[i] != 0) {
      //     const joint = RAPIER.JointData.generic(anchorA, anchorB, axes[i], masksAngular[0])
      //     if (param.springRotation[i] != 0) {
      //       joint.stiffness = param.springRotation[i]
      //     }
      //     joint.limitsEnabled = true
      //     joint.limits = [param.rotationLimitation1[i], param.rotationLimitation2[i]]
      //     this.world.createImpulseJoint(joint, bodyA, bodyB, true)
      //   }
      // }

      // console.log(param.translationLimitation1[0], param.translationLimitation2[0])
      const joint1 = RAPIER.JointData.rope(1, anchorA, anchorB)
      // joint1.limits = [-0.1, 0.1]
      this.world.createImpulseJoint(joint1, bodyA, bodyB, true)
      // break
    }
  }

  // update body from bone
  private updateRigidBodies() {
    if (this.mesh !== undefined) {
      this.bodies.forEach((rb: RAPIER.RigidBody) => {
        const param: any = rb.userData
        if (param.boneIndex !== -1 && param.type == 0) {
          const bone = this.mesh.skeleton.bones[param.boneIndex]
          bone.updateMatrixWorld(true)
          const { position, quaternion } = this.tranformFromBone(bone, param.offsetMatrix)
          rb.setNextKinematicTranslation(position)
          rb.setNextKinematicRotation(quaternion)
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
          const { position, quaternion } = this.transformFromRigidBody(
            rb,
            param.offsetMatrixInverse
          )

          const bone = this.mesh.skeleton.bones[param.boneIndex]
          if (bone.parent != undefined) {
            bone.position.copy(bone.parent.worldToLocal(position))
          } else {
            bone.position.copy(position)
          }
          bone.quaternion.copy(quaternion)
          bone.updateMatrixWorld(true)
        }
      }
    }
  }

  private tranformFromBone(
    bone: THREE.Bone,
    offset: THREE.Matrix4
  ): {
    position: THREE.Vector3
    quaternion: THREE.Quaternion
  } {
    const bonePosition = new THREE.Vector3()
    const boneQuaternion = new THREE.Quaternion()
    bone.getWorldPosition(bonePosition)
    bone.getWorldQuaternion(boneQuaternion)
    const boneMatrix = new THREE.Matrix4()
    boneMatrix.compose(bonePosition, boneQuaternion, new THREE.Vector3(1, 1, 1))

    const matrix = new THREE.Matrix4()
    matrix.multiplyMatrices(boneMatrix, offset)

    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    matrix.decompose(position, quaternion, new THREE.Vector3())

    return { position, quaternion }
  }

  private transformFromRigidBody(
    rigidBody: RAPIER.RigidBody,
    offset: THREE.Matrix4
  ): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
    const rbPos = rigidBody.translation()
    const rbRot = rigidBody.rotation()
    const rigidBodyMatrix = new THREE.Matrix4()
    const rigidBodyPosition = new THREE.Vector3(rbPos.x, rbPos.y, rbPos.z)
    const rigidBodyQuaternion = new THREE.Quaternion(rbRot.x, rbRot.y, rbRot.z, rbRot.w)
    rigidBodyMatrix.compose(rigidBodyPosition, rigidBodyQuaternion, new THREE.Vector3(1, 1, 1))

    const matrix = new THREE.Matrix4()
    matrix.multiplyMatrices(rigidBodyMatrix, offset)

    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    matrix.decompose(position, quaternion, new THREE.Vector3())

    return { position, quaternion }
  }

  private getAnchor(joint: any, body: any): THREE.Vector3 {
    const anchor = new THREE.Vector3(...joint.position)
    anchor.sub(new THREE.Vector3(...body.position))
    const inverseRotation = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(...body.rotation))
      .invert()
    anchor.applyQuaternion(inverseRotation)
    console.log(anchor)
    return anchor
  }
}
