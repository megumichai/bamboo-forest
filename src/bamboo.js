import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ATLAS } from './atlas.js'
import { WORLD, pathX, pathDistance } from './path.js'

const UP = new THREE.Vector3(0, 1, 0)

function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WIND_VERTEX_PARS = `
uniform float uTime;
uniform float uWind;
uniform float uTurbulence;
uniform float uWindAngle;

attribute float aBend;
attribute float aFlutter;
attribute float aPhase;
attribute float aFlex;
attribute float aDelay;
attribute vec3 aWindDir;
`

const WIND_VERTEX_BODY = `
vec3 transformed = vec3( position );

float ca = cos( uWindAngle );
float sa = sin( uWindAngle );
vec3 swayDir = vec3(
  aWindDir.x * ca - aWindDir.z * sa,
  aWindDir.y,
  aWindDir.x * sa + aWindDir.z * ca
);

float wt = uTime - aDelay;

float s = sin( wt + aPhase ) * 0.55
        + sin( wt * 2.17 + aPhase * 1.7 ) * 0.3
        + sin( wt * 0.41 + aPhase * 0.35 ) * 0.5;

float gust = uTurbulence * sin( wt * 1.7 + aBend * 2.4 + aPhase ) * 0.35;

float amount = ( s + gust ) * aBend * aFlex * uWind;

float flutter = aFlutter * aFlex * uWind
  * ( sin( wt * 6.3 + aPhase * 2.1 + aBend * 4.0 ) * 0.45
    + sin( wt * 11.0 + aPhase * 0.7 ) * 0.2 );

transformed += swayDir * ( amount + flutter );
transformed.y -= abs( amount ) * 0.05;
`

function patchWind(material, wind, key) {
  const uniforms = wind.uniforms
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uWind = uniforms.uWind
    shader.uniforms.uTurbulence = uniforms.uTurbulence
    shader.uniforms.uWindAngle = uniforms.uWindAngle
    shader.uniforms.uSunView = uniforms.uSunView
    shader.uniforms.uBacklight = uniforms.uBacklight

    shader.vertexShader = WIND_VERTEX_PARS + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      WIND_VERTEX_BODY,
    )

    if (shader.fragmentShader.includes('#include <lights_fragment_end>')) {
      shader.fragmentShader = `
uniform vec3 uSunView;
uniform float uBacklight;
` + shader.fragmentShader

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 sunView = normalize( uSunView );
          float towardSun = clamp( dot( normalize( -vViewPosition ), sunView ), 0.0, 1.0 );
          float through = pow( clamp( -dot( normal, sunView ), 0.0, 1.0 ), 1.35 );
          reflectedLight.directDiffuse +=
            diffuseColor.rgb * vec3( 1.0, 0.46, 0.16 ) * through * towardSun * uBacklight;
        }`,
      )
    }
  }
  material.customProgramCacheKey = () => key
  return material
}

function remapUV(geometry, rect, flipV) {
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    uv.setXY(i, rect.x + u * rect.w, rect.y + (flipV ? 1 - v : v) * rect.h)
  }
  uv.needsUpdate = true
}

function attachBend(geometry, bend, flutter) {
  geometry.setAttribute('aBend', new THREE.BufferAttribute(bend, 1))
  geometry.setAttribute('aFlutter', new THREE.BufferAttribute(flutter, 1))
}

function buildStalk({ seed, height, radius }) {
  const rng = mulberry32(seed)
  const parts = []

  const segs = Math.max(7, Math.round(height * 1.15))
  const cane = new THREE.CylinderGeometry(
    radius * 0.55,
    radius,
    height,
    8,
    segs,
    true,
  )
  cane.translate(0, height / 2, 0)
  remapUV(cane, ATLAS.stalk, true)

  const caneCount = cane.attributes.position.count
  const caneBend = new Float32Array(caneCount)
  const caneFlutter = new Float32Array(caneCount)
  for (let i = 0; i < caneCount; i += 1) {
    const h = Math.max(0, cane.attributes.position.getY(i) / height)
    caneBend[i] = Math.pow(h, 1.9)
  }
  attachBend(cane, caneBend, caneFlutter)
  parts.push(cane)

  const sprays = 2 + Math.floor(rng() * 2)
  for (let s = 0; s < sprays; s += 1) {
    const attachT = 0.58 + (s / Math.max(1, sprays - 1)) * 0.36 + (rng() - 0.5) * 0.05
    const attachY = attachT * height
    const baseBend = Math.pow(attachT, 1.9)
    const size = height * (0.14 + rng() * 0.05)
    const sprayAngle = rng() * Math.PI * 2

    for (let c = 0; c < 2; c += 1) {
      const card = new THREE.PlaneGeometry(size, size * 0.85, 1, 1)
      remapUV(card, ATLAS.cluster, false)
      card.rotateY(c * (Math.PI / 2) + sprayAngle)
      card.rotateX((rng() - 0.5) * 0.4)

      const count = card.attributes.position.count
      const bend = new Float32Array(count)
      const flutter = new Float32Array(count)
      for (let v = 0; v < count; v += 1) {
        bend[v] = baseBend + 0.1
        flutter[v] = 0.5 + rng() * 0.15
      }
      attachBend(card, bend, flutter)

      card.translate(
        Math.cos(sprayAngle) * radius * 1.2,
        attachY - 0.34 * size,
        Math.sin(sprayAngle) * radius * 1.2,
      )
      parts.push(card)
    }
  }

  const fans = 5 + Math.floor(rng() * 3)
  for (let f = 0; f < fans; f += 1) {
    const attachT = 0.4 + rng() * 0.57
    const attachY = attachT * height
    const baseBend = Math.pow(attachT, 1.9)
    const azimuth = rng() * Math.PI * 2
    const fanRadius = radius * 0.9
    const perFan = 4 + Math.floor(rng() * 3)

    for (let l = 0; l < perFan; l += 1) {
      const angle = azimuth + (rng() - 0.5) * 1.7
      const bladeLength = height * (0.032 + rng() * 0.03)
      const bladeWidth = bladeLength * (0.13 + rng() * 0.07)

      const leaf = new THREE.PlaneGeometry(bladeWidth, bladeLength, 1, 3)
      leaf.translate(0, bladeLength / 2, 0)
      remapUV(leaf, ATLAS.leaf, false)

      const lc = leaf.attributes.position.count
      const bend = new Float32Array(lc)
      const flutter = new Float32Array(lc)
      for (let i = 0; i < lc; i += 1) {
        const t = Math.max(0, Math.min(1, leaf.attributes.position.getY(i) / bladeLength))
        bend[i] = baseBend + 0.42 * t
        flutter[i] = 0.5 * Math.pow(t, 1.4)
      }
      attachBend(leaf, bend, flutter)

      const droop = 0.35 - attachT * 0.82 + (rng() - 0.5) * 0.6
      const dir = new THREE.Vector3(
        Math.cos(angle) * 0.95,
        droop,
        Math.sin(angle) * 0.95,
      ).normalize()
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir)
      const roll = new THREE.Quaternion().setFromAxisAngle(dir, rng() * Math.PI * 2)
      leaf.applyQuaternion(roll.multiply(quat))

      leaf.translate(
        Math.cos(angle) * fanRadius,
        attachY + (rng() - 0.5) * 0.35,
        Math.sin(angle) * fanRadius,
      )
      parts.push(leaf)
    }
  }

  const geometry = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  geometry.computeBoundingSphere()
  return geometry
}

function buildCanopyCluster() {
  const rng = mulberry32(4041)
  const parts = []

  for (let i = 0; i < 3; i += 1) {
    const w = 1.25 + rng() * 0.55
    const h = 1.05 + rng() * 0.35
    const card = new THREE.PlaneGeometry(w, h, 1, 1)
    remapUV(card, ATLAS.cluster, false)
    card.rotateY((i / 3) * Math.PI + (rng() - 0.5) * 0.4)
    card.rotateX((rng() - 0.5) * 0.55)
    card.rotateZ((rng() - 0.5) * 0.35)

    const count = card.attributes.position.count
    const bend = new Float32Array(count)
    const flutter = new Float32Array(count)
    for (let v = 0; v < count; v += 1) {
      const t = card.attributes.position.getY(v) / h + 0.5
      bend[v] = 0.62 + t * 0.3
      flutter[v] = 0.35 + t * 0.3
    }
    attachBend(card, bend, flutter)
    parts.push(card)
  }

  const geometry = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  geometry.computeBoundingSphere()
  return geometry
}

function buildGrassClump() {
  const parts = []
  const H = 0.62

  for (let i = 0; i < 3; i += 1) {
    const card = new THREE.PlaneGeometry(0.9, H, 1, 1)
    remapUV(card, ATLAS.grass, false)
    card.translate(0, H / 2, 0)
    card.rotateY((i / 3) * Math.PI + 0.3)

    const count = card.attributes.position.count
    const bend = new Float32Array(count)
    const flutter = new Float32Array(count)
    for (let v = 0; v < count; v += 1) {
      const t = Math.max(0, Math.min(1, card.attributes.position.getY(v) / H))
      bend[v] = Math.pow(t, 1.35)
      flutter[v] = 0.12 * Math.pow(t, 1.3)
    }
    attachBend(card, bend, flutter)
    parts.push(card)
  }

  const geometry = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  geometry.computeBoundingSphere()
  return geometry
}

const VARIANTS = [
  { height: 8.6, radius: 0.034, color: 0x9db884 },
  { height: 10.4, radius: 0.039, color: 0x8fab75 },
  { height: 12.3, radius: 0.045, color: 0xa9c18a },
  { height: 14.1, radius: 0.052, color: 0x87a26d },
]

const CHUNK = 40
const GROVE_TOP = 18
const CULL_DISTANCE = 112
const SHADOW_DISTANCE = 48

function chunkIndex(z) {
  return Math.max(0, Math.floor((GROVE_TOP - z) / CHUNK))
}

function scatterSpots(density) {
  const rng = mulberry32(20240816)
  const spots = []

  const push = (x, z) => {
    if (Math.abs(x) > WORLD.halfWidth) return
    if (z > GROVE_TOP || z < -(WORLD.length + 6)) return
    if (pathDistance(x, z) < WORLD.clearance) return
    spots.push({ x, z })
  }

  const nearClumps = Math.round(600 * density)
  for (let c = 0; c < nearClumps; c += 1) {
    const cz = GROVE_TOP - 2 - rng() * (WORLD.length + 20)
    const side = rng() < 0.5 ? -1 : 1
    const off = 2.0 + Math.pow(rng(), 1.5) * 9.6
    const cx = pathX(cz) + side * off
    const n = 4 + Math.floor(rng() * 7)
    const spread = 0.35 + rng() * 2.15
    for (let i = 0; i < n; i += 1) {
      const a = rng() * Math.PI * 2
      const r = 0.3 + rng() * spread
      push(cx + Math.cos(a) * r, cz + Math.sin(a) * r)
    }
  }

  const midClumps = Math.round(420 * density)
  for (let c = 0; c < midClumps; c += 1) {
    const cz = GROVE_TOP - 2 - rng() * (WORLD.length + 20)
    const side = rng() < 0.5 ? -1 : 1
    const cx = pathX(cz) + side * (10 + rng() * 18)
    const n = 3 + Math.floor(rng() * 5)
    const spread = 0.5 + rng() * 3.1
    for (let i = 0; i < n; i += 1) {
      const a = rng() * Math.PI * 2
      const r = 0.4 + rng() * spread
      push(cx + Math.cos(a) * r, cz + Math.sin(a) * r)
    }
  }

  const singles = Math.round(1010 * density)
  for (let i = 0; i < singles; i += 1) {
    push((rng() - 0.5) * 2 * WORLD.halfWidth, GROVE_TOP - rng() * (WORLD.length + 20))
  }

  return spots
}

function scatterCanopy(density, spots) {
  const rng = mulberry32(3141)
  const items = []

  const pick = () => spots[Math.floor(rng() * spots.length)]

  const high = Math.round(1290 * density)
  for (let i = 0; i < high; i += 1) {
    const anchor = pick()
    items.push({
      x: anchor.x + (rng() - 0.5) * 5.2,
      y: 6.0 + rng() * 6.6,
      z: anchor.z + (rng() - 0.5) * 5.2,
      theta: rng() * Math.PI * 2,
      scale: 0.95 + rng() * 0.85,
      phase: rng() * Math.PI * 2,
      flex: 0.18 + rng() * 0.28,
      color: canopyColor(rng),
    })
  }

  const low = Math.round(750 * density)
  for (let i = 0; i < low; i += 1) {
    const anchor = pick()
    items.push({
      x: anchor.x + (rng() - 0.5) * 3.8,
      y: 2.1 + rng() * 3.9,
      z: anchor.z + (rng() - 0.5) * 3.8,
      theta: rng() * Math.PI * 2,
      scale: 0.7 + rng() * 0.7,
      phase: rng() * Math.PI * 2,
      flex: 0.22 + rng() * 0.26,
      color: canopyColor(rng),
    })
  }

  const bushes = Math.round(545 * density)
  for (let i = 0; i < bushes; i += 1) {
    const z = GROVE_TOP - 2 - rng() * (WORLD.length + 20)
    const side = rng() < 0.5 ? -1 : 1
    items.push({
      x: pathX(z) + side * (1.8 + Math.pow(rng(), 1.4) * 7.5),
      y: 0.55 + rng() * 1.6,
      z,
      theta: rng() * Math.PI * 2,
      scale: 0.5 + rng() * 0.45,
      phase: rng() * Math.PI * 2,
      flex: 0.16 + rng() * 0.2,
      color: canopyColor(rng),
    })
  }

  const scrub = Math.round(1130 * density)
  for (let i = 0; i < scrub; i += 1) {
    const z = GROVE_TOP - 2 - rng() * (WORLD.length + 20)
    const side = rng() < 0.5 ? -1 : 1
    items.push({
      x: pathX(z) + side * (6.5 + rng() * 23),
      y: 0.45 + rng() * 1.35,
      z,
      theta: rng() * Math.PI * 2,
      scale: 0.65 + rng() * 0.85,
      phase: rng() * Math.PI * 2,
      flex: 0.14 + rng() * 0.18,
      color: canopyColor(rng),
    })
  }

  return items
}

function canopyColor(rng) {
  return new THREE.Color().setHSL(
    0.11 + rng() * 0.075,
    0.4 + rng() * 0.25,
    0.44 + rng() * 0.22,
  )
}

function scatterGroundCover(density) {
  const rng = mulberry32(805)
  const items = []
  const count = Math.round(2120 * density)

  for (let i = 0; i < count; i += 1) {
    const z = GROVE_TOP - 2 - rng() * (WORLD.length + 20)
    const side = rng() < 0.5 ? -1 : 1
    const off = WORLD.pathHalfWidth + 0.18 + Math.pow(rng(), 1.35) * 11
    items.push({
      x: pathX(z) + side * off,
      y: 0,
      z,
      theta: rng() * Math.PI * 2,
      scale: 0.38 + rng() * 0.62,
      phase: rng() * Math.PI * 2,
      flex: 0.07 + rng() * 0.14,
      color: new THREE.Color().setHSL(
        0.16 + rng() * 0.08,
        0.34 + rng() * 0.2,
        0.34 + rng() * 0.2,
      ),
    })
  }

  return items
}

const tempMatrix = new THREE.Matrix4()
const tempPos = new THREE.Vector3()
const tempScale = new THREE.Vector3()
const localWind = new THREE.Vector3()

function instanceByChunk({
  items,
  geometry,
  material,
  group,
  meshes,
  name,
  castShadow,
  receiveShadow,
  depthMaterial,
  colorOf,
}) {
  const buckets = new Map()
  items.forEach((item) => {
    const key = chunkIndex(item.z)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(item)
  })

  buckets.forEach((list, key) => {
    const geom = geometry.clone()
    const windDir = new Float32Array(list.length * 3)
    const phase = new Float32Array(list.length)
    const flex = new Float32Array(list.length)
    const delay = new Float32Array(list.length)

    list.forEach((item, i) => {
      const quaternion =
        item.quaternion ?? new THREE.Quaternion().setFromAxisAngle(UP, item.theta)
      tempPos.set(item.x, item.y, item.z)
      tempScale.setScalar(item.scale)
      tempMatrix.compose(tempPos, quaternion, tempScale)

      localWind
        .set(WORLD.wind.x, 0, WORLD.wind.z)
        .normalize()
        .applyAxisAngle(UP, -item.theta)

      windDir[i * 3] = localWind.x
      windDir[i * 3 + 1] = localWind.y
      windDir[i * 3 + 2] = localWind.z
      phase[i] = item.phase
      flex[i] = item.flex
      delay[i] = (item.x * WORLD.gust.x + item.z * WORLD.gust.z) * 0.045

      item.matrix = tempMatrix.clone()
    })

    geom.setAttribute('aWindDir', new THREE.InstancedBufferAttribute(windDir, 3))
    geom.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    geom.setAttribute('aFlex', new THREE.InstancedBufferAttribute(flex, 1))
    geom.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delay, 1))

    const mesh = new THREE.InstancedMesh(geom, material, list.length)
    list.forEach((item, i) => mesh.setMatrixAt(i, item.matrix))
    mesh.instanceMatrix.needsUpdate = true

    if (colorOf) {
      const color = new THREE.Color()
      list.forEach((item, i) => {
        colorOf(item, color)
        mesh.setColorAt(i, color)
      })
      mesh.instanceColor.needsUpdate = true
    }

    mesh.castShadow = castShadow
    mesh.receiveShadow = receiveShadow
    if (depthMaterial) mesh.customDepthMaterial = depthMaterial
    mesh.name = `${name}-${key}`

    mesh.computeBoundingSphere()
    mesh.boundingSphere.radius += 2.5

    mesh.userData.chunkZ = GROVE_TOP - (Number(key) + 0.5) * CHUNK
    mesh.userData.canCast = castShadow

    group.add(mesh)
    meshes.push(mesh)
  })
}

export function createForest(
  scene,
  wind,
  atlasTexture,
  { density = 1, lowPower = false } = {},
) {
  const group = new THREE.Group()
  group.name = 'bamboo'

  const rng = mulberry32(9182)
  const spots = scatterSpots(density)

  const bases = VARIANTS.map((variant, index) =>
    buildStalk({
      seed: 1000 + index * 37,
      height: variant.height,
      radius: variant.radius,
    }),
  )

  const materials = VARIANTS.map(() =>
    patchWind(
      new THREE.MeshStandardMaterial({
        map: atlasTexture,
        color: 0xffffff,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.78,
        metalness: 0,
      }),
      wind,
      'bamboo-wind-standard',
    ),
  )
  materials.forEach((material) => {
    material.shadowSide = THREE.DoubleSide
  })

  const depthMaterials = VARIANTS.map(() =>
    patchWind(
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: atlasTexture,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
      }),
      wind,
      'bamboo-wind-depth',
    ),
  )

  const canopyMaterial = patchWind(
    new THREE.MeshStandardMaterial({
      map: atlasTexture,
      color: 0xffffff,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0,
    }),
    wind,
    'bamboo-wind-standard',
  )
  canopyMaterial.shadowSide = THREE.DoubleSide

  const canopyDepthMaterial = patchWind(
    new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: atlasTexture,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
    }),
    wind,
    'bamboo-wind-depth',
  )

  const grassMaterial = patchWind(
    new THREE.MeshStandardMaterial({
      map: atlasTexture,
      color: 0xffffff,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
    }),
    wind,
    'bamboo-wind-standard',
  )

  const meshes = []

  const stalkItems = VARIANTS.map(() => [])
  spots.forEach((spot, i) => {
    const variantIndex = i % VARIANTS.length
    const theta = rng() * Math.PI * 2

    const inward = Math.sign(pathX(spot.z) - spot.x) || 1
    const leanAngle = rng() * rng() * 0.28
    const leanAxis = new THREE.Vector3((rng() - 0.5) * 0.24, 0, 1).normalize()
    const quaternion = new THREE.Quaternion()
      .setFromAxisAngle(leanAxis, -inward * leanAngle)
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          (rng() - 0.5) * 0.07,
        ),
      )
      .multiply(new THREE.Quaternion().setFromAxisAngle(UP, theta))

    const color = new THREE.Color(VARIANTS[variantIndex].color)
    color.offsetHSL(
      (rng() - 0.5) * 0.04,
      (rng() - 0.5) * 0.16,
      (rng() - 0.5) * 0.16,
    )

    stalkItems[variantIndex].push({
      x: spot.x,
      z: spot.z,
      y: -0.06 - rng() * 0.12,
      theta,
      quaternion,
      scale: 0.84 + rng() * 0.5,
      phase: rng() * Math.PI * 2,
      flex: 0.22 + rng() * 0.34,
      color,
    })
  })

  VARIANTS.forEach((variant, index) => {
    instanceByChunk({
      items: stalkItems[index],
      geometry: bases[index],
      material: materials[index],
      group,
      meshes,
      name: `bamboo-${index}`,
      castShadow: true,
      receiveShadow: true,
      depthMaterial: depthMaterials[index],
      colorOf: (item, color) => color.copy(item.color),
    })
  })

  const canopyGeometry = buildCanopyCluster()
  instanceByChunk({
    items: scatterCanopy(density, spots),
    geometry: canopyGeometry,
    material: canopyMaterial,
    group,
    meshes,
    name: 'canopy',
    castShadow: true,
    receiveShadow: true,
    depthMaterial: canopyDepthMaterial,
    colorOf: (item, color) => color.copy(item.color),
  })

  const grassGeometry = buildGrassClump()
  instanceByChunk({
    items: scatterGroundCover(lowPower ? density * 0.6 : density),
    geometry: grassGeometry,
    material: grassMaterial,
    group,
    meshes,
    name: 'ground-cover',
    castShadow: false,
    receiveShadow: true,
    depthMaterial: null,
    colorOf: (item, color) => color.copy(item.color),
  })

  scene.add(group)

  const inverse = new THREE.Quaternion()

  return {
    group,
    meshes,
    count: spots.length,

    update(camera, sunDir) {
      inverse.copy(camera.quaternion).invert()
      wind.uniforms.uSunView.value.copy(sunDir).applyQuaternion(inverse)

      const camZ = camera.position.z
      for (let i = 0; i < meshes.length; i += 1) {
        const mesh = meshes[i]
        const distance = Math.abs(mesh.userData.chunkZ - camZ) - CHUNK * 0.5
        mesh.visible = distance < CULL_DISTANCE
        mesh.castShadow = mesh.userData.canCast && distance < SHADOW_DISTANCE
      }
    },
  }
}
