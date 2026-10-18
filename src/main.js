import './style.css'
import * as THREE from 'three'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createStage } from './scene.js'
import { createWind } from './wind.js'
import { createMusic } from './music.js'
import { createAtlas } from './atlas.js'
import { createForest } from './bamboo.js'
import { createTerrain } from './terrain.js'
import { createTravel } from './travel.js'
import { createHud } from './hud.js'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
const parkAtBottom = () => window.scrollTo(0, document.documentElement.scrollHeight)
parkAtBottom()
requestAnimationFrame(parkAtBottom)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const lowPower =
  window.matchMedia('(max-width: 820px)').matches ||
  (navigator.hardwareConcurrency ?? 8) <= 4
const density = lowPower ? 0.5 : 1

function showFallback(error) {
  console.error(error)
  const fallback = document.querySelector('#fallback')
  if (fallback) fallback.hidden = false
  document.querySelector('.hud')?.classList.add('is-dead')
}

let stage
try {
  stage = createStage({ lowPower })
} catch (error) {
  showFallback(error)
}

if (stage) {
  const wind = createWind({ calm: reducedMotion })
  const music = createMusic()
  const atlas = createAtlas()
  const forest = createForest(stage.scene, wind, atlas, { density, lowPower })
  const terrain = createTerrain(stage.scene, wind, stage.sunDir)
  const travel = createTravel(stage.camera, stage.scene)
  const hud = createHud({ music, travel })

  console.info(
    `[竹林] ${forest.count} stalks · ${forest.meshes.length} slices · density ${density} · wind ${
      wind.enabled ? 'on' : 'calm'
    }`,
  )

  const clock = new THREE.Timer()
  clock.connect(document)
  const eye = new THREE.Vector3()

  stage.renderer.setAnimationLoop(() => {
    clock.update()
    const dt = Math.min(clock.getDelta(), 0.05)
    const elapsed = clock.getElapsed()

    wind.update(elapsed)
    travel.update(dt, elapsed)
    terrain.update(dt, elapsed, stage.camera)

    stage.camera.getWorldPosition(eye)
    stage.followSun(eye)
    forest.update(stage.camera, stage.sunDir)

    hud.update()
    stage.render()
  })

  window.__bamboo = {
    THREE,
    stage,
    wind,
    music,
    forest,
    terrain,
    travel,
    hud,
    info: stage.renderer.info,
  }

  window.addEventListener('load', () => ScrollTrigger.refresh())
  requestAnimationFrame(() => ScrollTrigger.refresh())
}
