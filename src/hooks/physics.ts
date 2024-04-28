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
      const offsetPosition = new THREE.Vector3(...param.position)
      const offsetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...param.rotation)
      )
      // save to rb params
      param.offsetMatrix = new THREE.Matrix4()
      param.offsetMatrix.compose(offsetPosition, offsetQuaternion, new THREE.Vector3(1, 1, 1))
      param.offsetMatrixInverse = param.offsetMatrix.clone().invert()

      const bone =
        param.boneIndex == -1 ? new THREE.Bone() : this.mesh.skeleton.bones[param.boneIndex]
      const { position, quaternion } = this.tranformFromBone(bone, param.offsetMatrix)

      let rigidBodyDesc: RAPIER.RigidBodyDesc
      // if (param.type == 0) {
      //   rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      // } else {
      //   rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      // }
      // console.log(param.name.slice(2))
      if (param.name[0] != 'l') {
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
        .setLinearDamping(this._convertParameter(param.positionDamping))
        .setAngularDamping(this._convertParameter(param.rotationDamping))

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

      this.bodies.push(rigidBody)
    }
  }

  private addConstraints() {
    for (const param of this.mesh.geometry.userData.MMD.constraints) {
      if (param.name[0] == 'l') {
        param.position[0] += this.mesh.position.x
        param.position[1] += this.mesh.position.y
        param.position[2] += this.mesh.position.z

        const bodyA = this.bodies[param.rigidBodyIndex1]
        const bodyB = this.bodies[param.rigidBodyIndex2]
        const mA = this.getAnchor(bodyA, param)
        const anchorA = mA.position
        const mB = this.getAnchor(bodyB, param)
        const anchorB = mB.position

        const axes = [
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 0, y: 0, z: 1 }
        ]
        const masksLinear = RAPIER.JointAxesMask.X | RAPIER.JointAxesMask.Y | RAPIER.JointAxesMask.Z
        const masksAngular =
          RAPIER.JointAxesMask.AngX | RAPIER.JointAxesMask.AngY | RAPIER.JointAxesMask.AngZ

        const joint = RAPIER.JointData.spring(param.translationLimit2[0], 0, 0.1, anchorA, anchorB)
        this.world.createImpulseJoint(joint, bodyA, bodyB, true)
      }
    }
  }

  private _convertParameter(parameter: number): number {
    const timeStep = 1 / 60
    return (1 - (1 - parameter) ** timeStep) / timeStep
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

  private getAnchor(
    rigidBody: RAPIER.RigidBody,
    param: any
  ): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
    const rbPos = rigidBody.translation()
    const rbRot = rigidBody.rotation()
    const rigidBodyMatrix = new THREE.Matrix4()
    const rigidBodyPosition = new THREE.Vector3(rbPos.x, rbPos.y, rbPos.z)
    const rigidBodyQuaternion = new THREE.Quaternion(rbRot.x, rbRot.y, rbRot.z, rbRot.w)
    rigidBodyMatrix.compose(rigidBodyPosition, rigidBodyQuaternion, new THREE.Vector3(1, 1, 1))

    const jointPosition = new THREE.Vector3(...param.position)
    const jointQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...param.rotation))
    // save to rb params
    const jointMatrix = new THREE.Matrix4()
    jointMatrix.compose(jointPosition, jointQuaternion, new THREE.Vector3(1, 1, 1))

    const matrix = new THREE.Matrix4()
    matrix.multiplyMatrices(rigidBodyMatrix.invert(), jointMatrix)

    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    matrix.decompose(position, quaternion, new THREE.Vector3())

    return { position, quaternion }
  }
}
