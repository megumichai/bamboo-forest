import * as THREE from 'three'
import gsap from 'gsap'

export function createWind({ calm = false } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: calm ? 0.16 : 0.9 },
    uTurbulence: { value: calm ? 0.12 : 0.45 },
    uWindAngle: { value: 0 },
    uSunView: { value: new THREE.Vector3(-0.64, 0.4, -0.6).normalize() },
    uBacklight: { value: 1.15 },
  }

  let enabled = false
  let gustTween = null
  let spinTween = null
  let turbulenceTween = null

  const peak = () => gsap.utils.random(0.7, 1.45)

  function scheduleGust() {
    gustTween = gsap.to(uniforms.uWind, {
      value: peak(),
      duration: gsap.utils.random(1.6, 3.4),
      ease: 'sine.inOut',
      onComplete: scheduleGust,
    })
    turbulenceTween = gsap.to(uniforms.uTurbulence, {
      value: gsap.utils.random(0.3, 0.85),
      duration: gsap.utils.random(2, 5),
      ease: 'sine.inOut',
    })
  }

  function start() {
    if (enabled) return
    enabled = true
    scheduleGust()
    spinTween = gsap.to(uniforms.uWindAngle, {
      value: gsap.utils.random(0.3, 0.5),
      duration: 16,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  }

  function stop() {
    if (!enabled) return
    enabled = false
    gustTween?.kill()
    turbulenceTween?.kill()
    spinTween?.kill()
    gsap.to(uniforms.uWind, { value: 0.05, duration: 2.2, ease: 'power2.out' })
    gsap.to(uniforms.uTurbulence, { value: 0.06, duration: 2.2, ease: 'power2.out' })
  }

  if (!calm) start()

  return {
    uniforms,
    get enabled() {
      return enabled
    },
    get strength() {
      return uniforms.uWind.value
    },
    start,
    stop,
    toggle() {
      if (enabled) stop()
      else start()
      return enabled
    },
    update(elapsed) {
      uniforms.uTime.value = elapsed
    },
  }
}
