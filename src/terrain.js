import * as THREE from 'three'
import { WORLD, pathX } from './path.js'

function createGroundTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#141810'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 18 + Math.random() * 90
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const moss = Math.random() > 0.36
    g.addColorStop(0, moss ? 'rgba(42, 64, 35, 0.62)' : 'rgba(48, 34, 18, 0.48)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 1100; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const l = 3 + Math.random() * 9
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.random() * Math.PI * 2)
    const warm = Math.random() > 0.7
    ctx.fillStyle = warm
      ? `rgba(${150 + Math.random() * 70 | 0}, ${100 + Math.random() * 60 | 0}, ${
        42 + Math.random() * 30 | 0
      }, ${0.1 + Math.random() * 0.3})`
      : `rgba(${70 + Math.random() * 60 | 0}, ${90 + Math.random() * 50 | 0}, ${
        38 + Math.random() * 30 | 0
      }, ${0.1 + Math.random() * 0.3})`
    ctx.fillRect(-l / 2, -0.5, l, 1 + Math.random())
    ctx.restore()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(10, 46)
  texture.anisotropy = 8
  return texture
}

function createPathTexture() {
  const w = 256
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const base = ctx.createLinearGradient(0, 0, w, 0)
  base.addColorStop(0, '#5c5245')
  base.addColorStop(0.18, '#8c7f6c')
  base.addColorStop(0.5, '#a3947e')
  base.addColorStop(0.82, '#877a67')
  base.addColorStop(1, '#574e42')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 0.4 + Math.random() * 2.4
    const light = Math.random() > 0.52
    ctx.fillStyle = light
      ? `rgba(${190 + Math.random() * 40 | 0}, ${178 + Math.random() * 36 | 0}, ${
        150 + Math.random() * 30 | 0
      }, ${0.05 + Math.random() * 0.18})`
      : `rgba(44, 36, 26, ${0.05 + Math.random() * 0.2})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 320; i += 1) {
    const x = Math.random() * w
    const y = Math.random() * h
    const l = 3 + Math.random() * 8
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.random() * Math.PI * 2)
    ctx.fillStyle = `rgba(${120 + Math.random() * 70 | 0}, ${96 + Math.random() * 50 | 0}, ${
      44 + Math.random() * 24 | 0
    }, ${0.18 + Math.random() * 0.3})`
    ctx.fillRect(-l / 2, -0.5, l, 1.2)
    ctx.restore()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

function createPathMesh() {
  const segments = 200
  const z0 = 25
  const z1 = -(WORLD.length + 80)
  const positions = []
  const uvs = []
  const indices = []

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const z = z0 + (z1 - z0) * t
    const cx = pathX(z)
    const half =
      WORLD.pathHalfWidth +
      Math.sin(z * 0.19) * 0.16 +
      Math.sin(z * 0.061 + 2.1) * 0.11

    for (let s = 0; s < 2; s += 1) {
      const side = s === 0 ? -1 : 1
      positions.push(cx + side * half, 0.018, z)
      uvs.push(s, t * 52)
    }

    if (i < segments) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    map: createPathTexture(),
    color: 0xd2c6ae,
    roughness: 0.97,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

function createShaftTexture() {
  const w = 96
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const across = ctx.createLinearGradient(0, 0, w, 0)
  across.addColorStop(0, 'rgba(255,255,255,0)')
  across.addColorStop(0.5, 'rgba(255,255,255,1)')
  across.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = across
  ctx.fillRect(0, 0, w, h)

  ctx.globalCompositeOperation = 'destination-in'
  const along = ctx.createLinearGradient(0, 0, 0, h)
  along.addColorStop(0, 'rgba(0,0,0,0)')
  along.addColorStop(0.22, 'rgba(0,0,0,0.85)')
  along.addColorStop(0.75, 'rgba(0,0,0,0.5)')
  along.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = along
  ctx.fillRect(0, 0, w, h)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 255, 255, 1)')
  g.addColorStop(0.16, 'rgba(255, 238, 196, 0.92)')
  g.addColorStop(0.36, 'rgba(255, 178, 96, 0.42)')
  g.addColorStop(0.7, 'rgba(255, 120, 52, 0.1)')
  g.addColorStop(1, 'rgba(255, 100, 40, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createDustTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createTerrain(scene, wind, sunDir) {
  const group = new THREE.Group()
  group.name = 'terrain'

  const groundSize = { w: WORLD.halfWidth * 2 + 46, l: WORLD.length + 180 }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize.w, groundSize.l, 1, 1),
    new THREE.MeshStandardMaterial({
      map: createGroundTexture(),
      color: 0x93a084,
      roughness: 1,
      metalness: 0,
    }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, 0, -(WORLD.length / 2) + 10)
  ground.receiveShadow = true
  group.add(ground)

  group.add(createPathMesh())

  const glowTexture = createGlowTexture()
  const poolGeometry = new THREE.PlaneGeometry(1, 1)
  for (let i = 0; i < 20; i += 1) {
    const z = 4 - Math.random() * (WORLD.length + 40)
    const pool = new THREE.Mesh(
      poolGeometry,
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 0xffb974,
        transparent: true,
        opacity: 0.05 + Math.random() * 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    )
    const size = 2.5 + Math.random() * 4.5
    pool.scale.set(size, size * 0.65, 1)
    pool.rotation.x = -Math.PI / 2
    pool.rotation.z = Math.random() * Math.PI
    pool.position.set(pathX(z) + (Math.random() - 0.5) * 2.2, 0.035, z)
    pool.renderOrder = 1
    group.add(pool)
  }

  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff9a45,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    }),
  )
  core.scale.setScalar(34)
  group.add(core)

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff7c34,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      fog: false,
      toneMapped: false,
    }),
  )
  halo.scale.setScalar(240)
  halo.renderOrder = 4
  group.add(halo)

  const bloom = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff8c3d,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    }),
  )
  bloom.scale.setScalar(110)
  bloom.renderOrder = 5
  group.add(bloom)

  const dustCount = 1100
  const dustPositions = new Float32Array(dustCount * 3)
  const dustDrift = new Float32Array(dustCount * 3)
  const DUST_BOX = { x: 34, y: 13, z: 52 }

  for (let i = 0; i < dustCount; i += 1) {
    dustPositions[i * 3] = (Math.random() - 0.5) * DUST_BOX.x * 2
    dustPositions[i * 3 + 1] = Math.random() * DUST_BOX.y
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * DUST_BOX.z * 2
    dustDrift[i * 3] = 0.2 + Math.random() * 0.7
    dustDrift[i * 3 + 1] = 0.05 + Math.random() * 0.22
    dustDrift[i * 3 + 2] = 0.2 + Math.random() * 0.7
  }

  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      map: createDustTexture(),
      color: 0xffd7a0,
      size: 0.065,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    }),
  )
  dust.frustumCulled = false
  group.add(dust)

  const shaftTexture = createShaftTexture()
  const shafts = []
  for (let i = 0; i < 18; i += 1) {
    const z = -6 - i * (WORLD.length / 17) - Math.random() * 7
    const height = 18 + Math.random() * 9
    const shaft = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2 + Math.random() * 6, height),
      new THREE.MeshBasicMaterial({
        map: shaftTexture,
        color: 0xffc27e,
        transparent: true,
        opacity: 0.035 + Math.random() * 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: true,
      }),
    )
    shaft.position.set(
      pathX(z) + (Math.random() - 0.5) * 18,
      height * 0.42,
      z,
    )
    shaft.rotation.y = 2.545 + (Math.random() - 0.5) * 0.6
    shaft.rotation.z = (Math.random() - 0.5) * 0.55
    shafts.push({ mesh: shaft, baseOpacity: shaft.material.opacity })
    group.add(shaft)
  }

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 64),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: 0xffce8f,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  )
  glow.position.set(pathX(-WORLD.length), 9, -WORLD.length - 26)
  group.add(glow)

  scene.add(group)

  const camPos = new THREE.Vector3()

  return {
    group,
    update(dt, elapsed, camera) {
      camera.getWorldPosition(camPos)

      core.position.copy(camPos).addScaledVector(sunDir, 95)
      halo.position.copy(camPos).addScaledVector(sunDir, 130)
      bloom.position.copy(camPos).addScaledVector(sunDir, 100)

      const strength = wind.strength
      const dirX = Math.cos(wind.uniforms.uWindAngle.value)
      const dirZ = Math.sin(wind.uniforms.uWindAngle.value)
      for (let i = 0; i < dustCount; i += 1) {
        const ix = i * 3
        dustPositions[ix] += (dirX * dustDrift[ix] * strength * 0.6 + 0.08) * dt
        dustPositions[ix + 1] -= dustDrift[ix + 1] * dt * 0.8
        dustPositions[ix + 2] += (dirZ * dustDrift[ix + 2] * strength * 0.6 + 0.05) * dt

        dustPositions[ix] += Math.sin(elapsed * 0.5 + i) * 0.0015

        const dxRel = dustPositions[ix] - camPos.x
        if (dxRel > DUST_BOX.x) dustPositions[ix] -= DUST_BOX.x * 2
        else if (dxRel < -DUST_BOX.x) dustPositions[ix] += DUST_BOX.x * 2

        const dzRel = dustPositions[ix + 2] - camPos.z
        if (dzRel > DUST_BOX.z) dustPositions[ix + 2] -= DUST_BOX.z * 2
        else if (dzRel < -DUST_BOX.z) dustPositions[ix + 2] += DUST_BOX.z * 2

        if (dustPositions[ix + 1] < 0.15) dustPositions[ix + 1] = DUST_BOX.y * (0.6 + Math.random() * 0.4)
      }
      dustGeometry.attributes.position.needsUpdate = true

      shafts.forEach((shaft, i) => {
        const shimmer = 0.75 + 0.35 * Math.sin(elapsed * 0.6 + i * 1.7) * strength
        shaft.mesh.material.opacity = shaft.baseOpacity * shimmer
      })

      glow.material.opacity = 0.16 + 0.07 * Math.sin(elapsed * 0.4)
    },
  }
}
