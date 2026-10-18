import * as THREE from 'three'
import { WORLD } from './path.js'

function createSkyTexture() {
  const W = 2048
  const H = 1024
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0.0, '#071332')
  sky.addColorStop(0.14, '#0e2666')
  sky.addColorStop(0.27, '#20408f')
  sky.addColorStop(0.38, '#4a63a8')
  sky.addColorStop(0.445, '#8b7fa9')
  sky.addColorStop(0.474, '#d79b87')
  sky.addColorStop(0.492, '#f4bc85')
  sky.addColorStop(0.505, '#e7a574')
  sky.addColorStop(0.535, '#9b6548')
  sky.addColorStop(0.62, '#3a2a20')
  sky.addColorStop(0.75, '#161611')
  sky.addColorStop(1.0, '#0a0b08')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < 16; i += 1) {
    const y = H * (0.4 + Math.random() * 0.075)
    const x = Math.random() * W
    const r = 90 + Math.random() * 260
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255, 196, 142, 0.13)')
    g.addColorStop(1, 'rgba(255, 196, 142, 0)')
    ctx.fillStyle = g
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(3.4, 0.42)
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const horizon = H * 0.5
  const ridge = (base, amp, color, alpha, phase) => {
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 8) {
      const t = (x / W) * Math.PI * 2
      const y =
        base -
        (Math.sin(t * 3 + phase) * amp +
          Math.sin(t * 7 + phase * 1.7) * amp * 0.42 +
          Math.sin(t * 15 + phase * 2.6) * amp * 0.16)
      if (x === 0) ctx.lineTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.globalAlpha = alpha
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ridge(horizon - 6, 24, '#9a86a4', 0.5, 1.2)
  ridge(horizon + 2, 36, '#6a6288', 0.55, 3.7)
  ridge(horizon + 10, 20, '#414052', 0.75, 5.1)

  const warm = ctx.createRadialGradient(W * 0.62, horizon, 0, W * 0.62, horizon, W * 0.26)
  warm.addColorStop(0, 'rgba(255, 190, 120, 0.35)')
  warm.addColorStop(0.45, 'rgba(255, 170, 105, 0.12)')
  warm.addColorStop(1, 'rgba(255, 170, 105, 0)')
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, W, H)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}

export function createStage({ lowPower = false } = {}) {
  const canvas = document.querySelector('#view')

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  const maxDpr = lowPower ? 1.25 : 1.75
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x101018)
  scene.fog = new THREE.FogExp2(0x66402b, 0.029)

  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.08,
    420,
  )
  camera.position.set(0, WORLD.eye, 10)

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(340, 48, 32),
    new THREE.MeshBasicMaterial({
      map: createSkyTexture(),
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    }),
  )
  sky.renderOrder = -1000
  sky.frustumCulled = false
  scene.add(sky)

  const hemi = new THREE.HemisphereLight(0x8ba4e6, 0x402c1a, 1.2)
  scene.add(hemi)

  const sunDir = new THREE.Vector3(-0.64, 0.4, -0.6).normalize()
  const sun = new THREE.DirectionalLight(0xffa455, 3.5)
  sun.castShadow = true
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048)
  const shadowCam = sun.shadow.camera
  shadowCam.left = -30
  shadowCam.right = 30
  shadowCam.top = 30
  shadowCam.bottom = -30
  shadowCam.near = 1
  shadowCam.far = 170
  shadowCam.updateProjectionMatrix()
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.055
  sun.shadow.intensity = 0.82
  scene.add(sun)
  scene.add(sun.target)

  const fill = new THREE.DirectionalLight(0x6d8bce, 0.6)
  fill.position.set(18, 9, 34)
  scene.add(fill)

  const anchor = new THREE.Vector3()

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr))
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  return {
    renderer,
    scene,
    camera,
    sun,
    sunDir,
    hemi,

    followSun(target) {
      anchor.set(
        Math.round(target.x * 2) / 2,
        Math.round(target.y * 2) / 2,
        Math.round(target.z * 2) / 2,
      )
      sun.target.position.copy(anchor)
      sun.target.updateMatrixWorld()
      sun.position.copy(anchor).addScaledVector(sunDir, 58)
      sun.updateMatrixWorld()
    },

    render() {
      sky.position.copy(camera.position)
      renderer.render(scene, camera)
    },
  }
}
