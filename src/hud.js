import gsap from 'gsap'
import { TRAIL, pathX } from './path.js'

const MAP = {
  width: 240,
  height: 135,
  scaleX: 5,
  scaleY: 1.9,
  focusY: 92,
  samples: 260,
}

const TRAIL_SPAN = TRAIL.zStart - TRAIL.zEnd

const CITY_BEHIND = 10

function trailX(m) {
  return MAP.width / 2 + pathX(TRAIL.zStart - m) * MAP.scaleX
}

function trailY(m) {
  return -m * MAP.scaleY
}

function buildTrail() {
  const points = []
  for (let i = 0; i <= MAP.samples; i += 1) {
    const m = TRAIL_SPAN * (i / MAP.samples)
    points.push([trailX(m), trailY(m)])
  }
  return points
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
}

function splitTitle(el) {
  const text = el.textContent
  const chars = []
  el.textContent = ''
  el.setAttribute('aria-label', text)
  for (const ch of text) {
    if (/\s/.test(ch)) {
      el.append(ch)
      continue
    }
    const span = document.createElement('span')
    span.className = 'title__char'
    span.setAttribute('aria-hidden', 'true')
    span.textContent = ch
    el.append(span)
    chars.push(span)
  }
  return chars
}

export function createHud({ music, travel }) {
  const musicToggle = document.querySelector('#music-toggle')
  const hint = document.querySelector('#hint')
  const arrow = document.querySelector('.hint__arrow')
  const mapWorld = document.querySelector('#map-world')
  const mapTrail = document.querySelector('#map-trail')
  const mapWalker = document.querySelector('#map-walker')
  const mapCity = document.querySelector('#map-city')
  const titleChars = splitTitle(document.querySelector('#title-text'))
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  mapTrail.setAttribute('d', buildTrail())

  mapCity.setAttribute(
    'transform',
    `translate(${trailX(0).toFixed(1)} ${(CITY_BEHIND * MAP.scaleY).toFixed(1)})`,
  )

  musicToggle.addEventListener('click', () => music.toggle())

  const titleReveal = gsap.timeline({ paused: true }).fromTo(
    titleChars,
    { opacity: 0, y: 26, filter: 'blur(10px)' },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: reducedMotion ? 0.01 : 1.4,
      stagger: reducedMotion ? 0 : 0.07,
      ease: 'power4.out',
    },
  )
  titleReveal.play()

  gsap.to(arrow, {
    y: -12,
    duration: 1.1,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  let lastShift = null
  let lastMusic = null
  let titleShown = true

  return {
    update() {
      const u = travel.progress

      hint.style.opacity = String(Math.max(0, 1 - u * 18))

      if (titleShown && u > 0.012) {
        titleShown = false
        titleReveal.reverse()
      } else if (!titleShown && u < 0.002) {
        titleShown = true
        titleReveal.play()
      }

      const m = u * TRAIL_SPAN

      const shift = (MAP.focusY + m * MAP.scaleY).toFixed(1)
      if (shift !== lastShift) {
        lastShift = shift
        mapWorld.setAttribute('transform', `translate(0 ${shift})`)
      }

      mapWalker.setAttribute(
        'transform',
        `translate(${trailX(m).toFixed(1)} ${MAP.focusY})`,
      )

      const playing = music.playing
      if (playing !== lastMusic) {
        lastMusic = playing
        musicToggle.textContent = playing ? '♪ 音乐 开' : '♪ 音乐 关'
        musicToggle.setAttribute('aria-pressed', String(playing))
      }
    },
  }
}
