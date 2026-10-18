import gsap from 'gsap'
import trackUrl from './assets/original-point.m4a'

const VOLUME = 0.38

export function createMusic() {
  const audio = new Audio(trackUrl)
  audio.loop = true
  audio.preload = 'metadata'
  audio.volume = 0

  let wanted = true
  let starting = false
  let wheelTried = false


  const gestures = ['pointerdown', 'keydown', 'touchstart']

  const removeUnlock = () => {
    gestures.forEach((type) => window.removeEventListener(type, unlock, true))
    window.removeEventListener('wheel', onWheel, true)
  }

  const fadeIn = () => {
    gsap.killTweensOf(audio)
    audio.volume = 0
    gsap.to(audio, { volume: VOLUME, duration: 2.4, ease: 'sine.out' })
  }

  const fadeOut = () => {
    gsap.killTweensOf(audio)
    gsap.to(audio, {
      volume: 0,
      duration: 0.9,
      ease: 'sine.in',
      onComplete: () => audio.pause(),
    })
  }

  const requestPlay = () => {
    if (!audio.paused) {
      removeUnlock()
      return
    }
    if (starting) return
    starting = true

    let promise
    try {
      promise = audio.play()
    } catch {
      starting = false
      return
    }
    if (!promise) {
      starting = false
      return
    }

    promise
      .then(() => {
        starting = false
        removeUnlock()
        fadeIn()
      })
      .catch(() => {
        starting = false
      })
  }

  function unlock(event) {
    if (event.target instanceof Element && event.target.closest('#music-toggle')) return
    requestPlay()
  }

  function onWheel() {
    if (wheelTried) return
    wheelTried = true
    requestPlay()
  }

  gestures.forEach((type) => window.addEventListener(type, unlock, true))
  window.addEventListener('wheel', onWheel, { capture: true, passive: true })

  requestPlay()

  return {
    get playing() {
      return wanted && !audio.paused
    },

    toggle() {
      if (wanted && !audio.paused) {
        wanted = false
        removeUnlock()
        fadeOut()
      } else {
        wanted = true
        requestPlay()
      }
    },

    element: audio,
  }
}
