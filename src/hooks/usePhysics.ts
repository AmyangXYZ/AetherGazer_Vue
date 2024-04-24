import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'

export class RMPhysics {
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

  showHelper() {
    this.helperEnabled = true
  }
  hideHelper() {
    this.helperEnabled = false
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
    // this.mesh.visible = false

    this.createRigidBodies()
    this.addConstraints()
  }

  private createRigidBodies() {
    this.bodies = this.mesh.geometry.userData.MMD.rigidBodies.map((param: any) => {
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
      this.world.createCollider(colliderDesc, rigidBody)

      return rigidBody
    })
  }

  private addConstraints() {
    this.mesh.geometry.userData.MMD.constraints.forEach((param: any) => {
      const bodyA = this.bodies[param.rigidBodyIndex1]
      const bodyB = this.bodies[param.rigidBodyIndex2]
      const constraintPosition = new THREE.Vector3(...param.position)
      const constraintRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...param.rotation)
      )
      const constraintMatrix = new THREE.Matrix4()
      constraintMatrix.compose(constraintPosition, constraintRotation, new THREE.Vector3(1, 1, 1))

      const posA = bodyA.translation()
      const rotA = bodyA.rotation()
      const bodyAPosition = new THREE.Vector3(posA.x, posA.y, posA.z)
      const bodyAQuaternion = new THREE.Quaternion(rotA.x, rotA.y, rotA.z, rotA.w)
      const bodyAMatrix = new THREE.Matrix4()
      bodyAMatrix.compose(bodyAPosition, bodyAQuaternion, new THREE.Vector3(1, 1, 1))

      const posB = bodyB.translation()
      const rotB = bodyB.rotation()
      const bodyBPosition = new THREE.Vector3(posB.x, posB.y, posB.z)
      const bodyBQuaternion = new THREE.Quaternion(rotB.x, rotB.y, rotB.z, rotB.w)
      const bodyBMatrix = new THREE.Matrix4()
      bodyBMatrix.compose(bodyBPosition, bodyBQuaternion, new THREE.Vector3(1, 1, 1))

      const inverseBodyAMatrix = new THREE.Matrix4().copy(bodyAMatrix).invert()
      const inverseBodyBMatrix = new THREE.Matrix4().copy(bodyBMatrix).invert()

      const constraintMatrixA = new THREE.Matrix4().multiplyMatrices(
        inverseBodyAMatrix,
        constraintMatrix
      )
      const constraintMatrixB = new THREE.Matrix4().multiplyMatrices(
        inverseBodyBMatrix,
        constraintMatrix
      )

      const anchorA = new THREE.Vector3()
      const anchorB = new THREE.Vector3()
      constraintMatrixA.decompose(anchorA, new THREE.Quaternion(), new THREE.Vector3())
      constraintMatrixB.decompose(anchorB, new THREE.Quaternion(), new THREE.Vector3())

      const axes = [
        { x: 1, y: 0, z: 0 }, // X-axis
        { x: 0, y: 1, z: 0 }, // Y-axis
        { x: 0, y: 0, z: 1 } // Z-axis
      ]
      const linearMasks = [RAPIER.JointAxesMask.X, RAPIER.JointAxesMask.Y, RAPIER.JointAxesMask.Z]
      const angularMasks = [
        RAPIER.JointAxesMask.AngX,
        RAPIER.JointAxesMask.AngY,
        RAPIER.JointAxesMask.AngZ
      ]
      for (let i = 0; i < 3; i++) {
        const jointLinear = RAPIER.JointData.generic(anchorA, anchorB, axes[i], linearMasks[i])
        jointLinear.limitsEnabled = true
        jointLinear.limits = [param.translationLimitation1[i], param.translationLimitation2[i]]
        if (param.springRotation[i] != 0) {
          jointLinear.stiffness = param.springPosition[i]
        }
        this.world.createImpulseJoint(jointLinear, bodyA, bodyB, true)
      }

      for (let i = 0; i < 3; i++) {
        const jointAngular = RAPIER.JointData.generic(anchorA, anchorB, axes[i], angularMasks[i])
        jointAngular.limitsEnabled = true
        jointAngular.limits = [param.rotationLimitation1[i], param.rotationLimitation2[i]]
        if (param.springRotation[i] != 0) {
          jointAngular.stiffness = param.springRotation[i]
        }
        this.world.createImpulseJoint(jointAngular, bodyA, bodyB, true)
      }
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
