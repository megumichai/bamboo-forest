import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WORLD, TRAIL, pathX, pathY } from './path.js'

gsap.registerPlugin(ScrollTrigger)

function buildCurve() {
  const zStart = TRAIL.zStart
  const zEnd = TRAIL.zEnd
  const span = zStart - zEnd
  const segments = Math.ceil(span / 10)
  const points = []

  for (let i = 0; i <= segments; i += 1) {
    const z = zStart - span * (i / segments)
    points.push(new THREE.Vector3(pathX(z), WORLD.eye + pathY(z), z))
  }

  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4)
}

export function createTravel(camera, scene) {
  const curve = buildCurve()
  const look = { x: 0, y: 0 }
  const pointer = { x: 0, y: 0 }

  let scrollTarget = 1
  let scroll = 1

  ScrollTrigger.create({
    trigger: '#scroll-space',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      scrollTarget = self.progress
    },
  })

  const onPointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onPointerMove)

  const fogDense = new THREE.Color(0x5a3828)
  const fogOpen = new THREE.Color(0x9c6a44)
  const current = new THREE.Vector3()
  const ahead = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  let lastProgress = 0
  let velocity = 0
  let fov = 60

  return {
    curve,

    get progress() {
      return THREE.MathUtils.clamp(1 - scroll, 0, 1)
    },

    get meters() {
      return THREE.MathUtils.clamp(1 - scroll, 0, 1) * WORLD.length
    },

    get velocity() {
      return velocity
    },

    update(dt, elapsed) {
      const smoothing = 1 - Math.exp(-dt * 2.6)
      scroll += (scrollTarget - scroll) * smoothing

      const u = THREE.MathUtils.clamp(1 - scroll, 0, 1)

      velocity = dt > 0 ? THREE.MathUtils.clamp((u - lastProgress) / dt, -1.5, 1.5) : 0
      lastProgress = u

      curve.getPointAt(u, current)
      curve.getTangentAt(Math.min(u, 0.9999), tangent)
      ahead.copy(current).addScaledVector(tangent, 9)

      look.x += (pointer.x - look.x) * Math.min(1, dt * 3.2)
      look.y += (pointer.y - look.y) * Math.min(1, dt * 3.2)

      const walking = Math.min(1, Math.abs(velocity) * 6)
      const bob = Math.sin(elapsed * 8.4) * 0.05 * walking
      const sway = Math.sin(elapsed * 4.1) * 0.03 * walking

      camera.position.copy(current)
      camera.position.y += bob + Math.sin(elapsed * 1.3) * 0.012
      camera.position.x += sway + look.x * 0.12
      camera.position.z += -look.y * 0.06

      camera.up.copy(up)
      camera.lookAt(
        ahead.x + look.x * 1.6,
        ahead.y + look.y * 0.9 + bob * 0.5,
        ahead.z,
      )
      camera.rotateZ(Math.sin(elapsed * 2.2) * 0.008 + look.x * 0.02)

      const opening = THREE.MathUtils.smoothstep(u, 0.78, 1)
      scene.fog.density = THREE.MathUtils.lerp(0.029, 0.016, opening)
      scene.fog.color.copy(fogDense).lerp(fogOpen, opening)

      const targetFov = THREE.MathUtils.lerp(60, 72, opening)
      fov += (targetFov - fov) * Math.min(1, dt * 1.5)
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }

      return u
    },

    dispose() {
      window.removeEventListener('pointermove', onPointerMove)
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    },
  }
}
