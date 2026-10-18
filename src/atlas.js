import * as THREE from 'three'

const SIZE = 1024

export const ATLAS = {
  leaf: { x: 0.012, y: 0.507, w: 0.476, h: 0.476 },
  stalk: { x: 0.512, y: 0.507, w: 0.476, h: 0.476 },
  cluster: { x: 0.012, y: 0.017, w: 0.476, h: 0.476 },
  grass: { x: 0.512, y: 0.017, w: 0.476, h: 0.476 },
}

export function createAtlas() {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, SIZE, SIZE)
  withRegion(ctx, ATLAS.stalk, drawStalkSkin)
  withRegion(ctx, ATLAS.leaf, drawLeafSprite)
  withRegion(ctx, ATLAS.cluster, drawClusterSprite)
  withRegion(ctx, ATLAS.grass, drawGrassSprite)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

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

function rectPx(rect) {
  return {
    x: rect.x * SIZE,
    y: (1 - rect.y - rect.h) * SIZE,
    w: rect.w * SIZE,
    h: rect.h * SIZE,
  }
}

function withRegion(ctx, rect, draw) {
  const r = rectPx(rect)
  ctx.save()
  ctx.beginPath()
  ctx.rect(r.x, r.y, r.w, r.h)
  ctx.clip()
  ctx.translate(r.x, r.y)
  draw(ctx, r.w, r.h)
  ctx.restore()
}

function bladePath(ctx, x0, y0, x1, y1, width) {
  const mx = (x0 + x1) * 0.5
  const my = (y0 + y1) * 0.5
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const bulge = width * 0.55

  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(mx + nx * bulge, my + ny * bulge, x1, y1)
  ctx.quadraticCurveTo(mx - nx * bulge, my - ny * bulge, x0, y0)
  ctx.closePath()
}

function paintBlade(ctx, x0, y0, angle, length, width, base, tip, veins = 0) {
  const x1 = x0 + Math.cos(angle) * length
  const y1 = y0 + Math.sin(angle) * length
  bladePath(ctx, x0, y0, x1, y1, width)

  const fill = ctx.createLinearGradient(x0, y0, x1, y1)
  fill.addColorStop(0, base)
  fill.addColorStop(0.55, tip)
  fill.addColorStop(1, tip)
  ctx.fillStyle = fill
  ctx.fill()

  if (veins > 0) {
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = 'rgba(24, 40, 14, 0.32)'
    ctx.lineWidth = 1.2
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    for (let i = 1; i < veins; i += 1) {
      const t = i / veins
      const px = x0 + Math.cos(angle) * length * t
      const py = y0 + Math.sin(angle) * length * t
      const spread = Math.sin(Math.PI * t) * width * 0.55
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + nx * spread, py + ny * spread)
      ctx.moveTo(px, py)
      ctx.lineTo(px - nx * spread, py - ny * spread)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(30, 48, 16, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.restore()
  }
}

function drawStalkSkin(ctx, w, h) {
  const body = ctx.createLinearGradient(0, 0, w, 0)
  body.addColorStop(0.0, '#16291b')
  body.addColorStop(0.14, '#33512c')
  body.addColorStop(0.36, '#5e803a')
  body.addColorStop(0.5, '#7f9a44')
  body.addColorStop(0.68, '#4f6f31')
  body.addColorStop(0.88, '#28401f')
  body.addColorStop(1.0, '#122317')
  ctx.fillStyle = body
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.clip()
  for (let i = 0; i < 110; i += 1) {
    const x = Math.random() * w
    const streak = 30 + Math.random() * 220
    const y = Math.random() * (h - streak)
    const light = Math.random() > 0.46
    ctx.fillStyle = light
      ? `rgba(226, 238, 160, ${0.02 + Math.random() * 0.06})`
      : `rgba(10, 22, 10, ${0.03 + Math.random() * 0.08})`
    ctx.fillRect(x, y, 1 + Math.random() * 2.4, streak)
  }

  const length = ctx.createLinearGradient(0, 0, 0, h)
  length.addColorStop(0.0, 'rgba(0, 0, 0, 0.46)')
  length.addColorStop(0.35, 'rgba(0, 0, 0, 0.08)')
  length.addColorStop(0.72, 'rgba(230, 236, 160, 0.1)')
  length.addColorStop(1.0, 'rgba(255, 214, 140, 0.2)')
  ctx.fillStyle = length
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  const nodes = 10
  for (let i = 1; i <= nodes; i += 1) {
    const y = (i / (nodes + 1)) * h
    ctx.fillStyle = 'rgba(8, 18, 8, 0.55)'
    ctx.fillRect(0, y - 2, w, 4)
    ctx.fillStyle = 'rgba(206, 222, 144, 0.4)'
    ctx.fillRect(0, y + 2, w, 2)
    ctx.fillStyle = 'rgba(130, 148, 74, 0.16)'
    ctx.fillRect(0, y - 12, w, 9)
  }
}

function drawLeafSprite(ctx, w, h) {
  const cx = w * 0.5
  const stemY = h * 0.95
  const tipY = h * 0.05
  const tipX = cx + w * 0.055

  bladePath(ctx, cx, stemY, tipX, tipY, w * 0.86)

  const fill = ctx.createLinearGradient(0, stemY, 0, tipY)
  fill.addColorStop(0, '#2b3f17')
  fill.addColorStop(0.35, '#55742c')
  fill.addColorStop(0.72, '#7d9a3e')
  fill.addColorStop(1, '#a9bd5a')
  ctx.fillStyle = fill
  ctx.fill()

  ctx.save()
  ctx.clip()

  ctx.strokeStyle = 'rgba(20, 36, 12, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, stemY)
  ctx.quadraticCurveTo(cx, h * 0.5, tipX, tipY)
  ctx.stroke()

  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(22, 40, 14, 0.3)'
  const veins = 18
  for (let i = 1; i < veins; i += 1) {
    const t = i / veins
    const y = stemY + (tipY - stemY) * t
    const spread = Math.sin(Math.PI * Math.pow(t, 0.6)) * w * 0.47
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(cx - spread, y - h * 0.085)
    ctx.moveTo(cx, y)
    ctx.lineTo(cx + spread, y - h * 0.085)
    ctx.stroke()
  }

  const sheen = ctx.createLinearGradient(0, 0, w, 0)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0)')
  sheen.addColorStop(0.55, 'rgba(255, 226, 160, 0.2)')
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h)

  ctx.restore()
}

function drawClusterSprite(ctx, w, h) {
  const rng = mulberry32(913)
  const roots = [
    [w * 0.5, h * 0.1],
    [w * 0.22, h * 0.26],
    [w * 0.8, h * 0.3],
  ]

  ctx.strokeStyle = '#433817'
  ctx.lineWidth = 3.5
  roots.forEach(([rx, ry], i) => {
    ctx.beginPath()
    ctx.moveTo(w * 0.5, 0)
    ctx.quadraticCurveTo(rx, ry * 0.35, rx, ry)
    ctx.stroke()
    if (i === 0) return
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(rx, ry)
    ctx.lineTo(rx + (i === 1 ? -1 : 1) * w * 0.12, ry + h * 0.22)
    ctx.stroke()
    ctx.lineWidth = 3.5
  })

  roots.forEach(([rootX, rootY], rootIndex) => {
    const count = rootIndex === 0 ? 24 : 14
    for (let i = 0; i < count; i += 1) {
      const angle =
        0.12 + (i / (count - 1)) * (Math.PI - 0.24) + (rng() - 0.5) * 0.34
      const len = h * (0.2 + Math.pow(rng(), 0.7) * 0.58)
      const width = w * (0.02 + rng() * 0.026)
      const base = rng() > 0.6 ? '#2d4318' : '#3d5620'
      const tip = rng() > 0.55 ? '#b9c25e' : '#8fa848'
      paintBlade(
        ctx,
        rootX + (rng() - 0.5) * w * 0.16,
        rootY + (rng() - 0.5) * h * 0.16,
        angle,
        len,
        width,
        base,
        tip,
        rng() > 0.6 ? 6 : 0,
      )
    }
  })

  for (let i = 0; i < 6; i += 1) {
    paintBlade(
      ctx,
      w * (0.3 + rng() * 0.4),
      h * (0.4 + rng() * 0.2),
      -Math.PI * 0.5 + (rng() - 0.5) * 1.5,
      h * (0.2 + rng() * 0.2),
      w * (0.022 + rng() * 0.018),
      '#30471a',
      '#a3b655',
      0,
    )
  }
}

function drawGrassSprite(ctx, w, h) {
  const rng = mulberry32(2157)
  const rootX = w * 0.5
  const rootY = h * 0.97

  ctx.strokeStyle = '#3a441c'
  ctx.lineWidth = 3
  for (let i = 0; i < 26; i += 1) {
    const t = i / 25
    const angle = -Math.PI + 0.22 + t * (Math.PI - 0.44) + (rng() - 0.5) * 0.24
    const len = h * (0.24 + rng() * 0.68)
    const width = w * (0.011 + rng() * 0.022)
    const base = i % 3 === 0 ? '#3c4a1e' : '#4b5a24'
    const tip = i % 4 === 0 ? '#9fae58' : '#7d913e'
    paintBlade(ctx, rootX + (rng() - 0.5) * w * 0.2, rootY, angle, len, width, base, tip, 0)
  }

  for (let i = 0; i < 3; i += 1) {
    const x = rootX + (Math.random() - 0.5) * w * 0.4
    const top = rootY - h * (0.45 + Math.random() * 0.4)
    ctx.strokeStyle = 'rgba(122, 126, 66, 0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, rootY)
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 26, (rootY + top) * 0.5, x, top)
    ctx.stroke()
    ctx.fillStyle = 'rgba(178, 170, 104, 0.85)'
    for (let k = 0; k < 5; k += 1) {
      ctx.beginPath()
      ctx.ellipse(x + (k - 2) * 3.2, top + 8 + Math.abs(k - 2) * 2.5, 2.4, 6, 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
