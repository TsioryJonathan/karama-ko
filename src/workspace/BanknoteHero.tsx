import { useEffect, useRef } from 'react'
import { compute } from '../engine/compute'
import { formatAr, formatPercent } from '../lib/format'
import { GuillocheField } from '../components/GuillocheField'
import { ArrowIcon } from './tools'

/** The story follows one real payslip: 1 000 000 Ar in notes, sorted by where they go. */
const GROSS = 1_000_000
const RESULT = compute(GROSS, 0)
const PILES = [
  { id: 'net', name: 'Salaire net', value: RESULT.net },
  { id: 'irsa', name: 'IRSA, l’impôt sur le revenu', value: RESULT.irsa },
  { id: 'social', name: 'CNaPS et OSTIE', value: RESULT.socialDeductions },
] as const
const DENOMINATIONS = [
  { value: 20_000, label: '20 000', ink: '#7a2740', wash: '#e6b6c1', size: 1, motif: 'baobab' },
  { value: 10_000, label: '10 000', ink: '#27594a', wash: '#b3d5c5', size: 0.95, motif: 'palm' },
  { value: 5_000, label: '5 000', ink: '#3b3f7d', wash: '#c1c4ea', size: 0.9, motif: 'terraces' },
] as const
/**
 * Notes per pile and denomination. Piles are rounded to whole notes (880 000, 100 000 and
 * 20 000 Ar); the labels carry the exact amounts.
 */
const COMPOSITION = [
  [37, 10, 8],
  [3, 3, 2],
  [0, 2, 0],
]
const NOTE_COUNT = COMPOSITION.flat().reduce((a, b) => a + b, 0)

const FOV = 38
const CAMERA_Z = 12
const HALF_TAN = Math.tan((FOV / 2) * (Math.PI / 180))

/** Scroll bands, as fractions of the pinned track. */
const T = {
  titleOut: [0.02, 0.15],
  gather: [0.04, 0.3],
  gross: [0.24, 0.33, 0.44, 0.5],
  deal: [0.46, 0.66],
  split: [0.6, 0.67, 0.8, 0.85],
  count: [0.61, 0.72],
  settle: [0.82, 0.93],
  net: [0.88, 0.95],
} as const

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t: number) => 1 - (1 - t) ** 4
const band = (p: number, [a, b, c, d]: readonly number[]) => Math.min(seg(p, a, b), 1 - seg(p, c, d))

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PAPER = '#f2ebda'
const SERIAL_INK = '#a23a2a'

type Denomination = (typeof DENOMINATIONS)[number]

function vignette(ctx: CanvasRenderingContext2D, motif: Denomination['motif'], cx: number, cy: number) {
  ctx.lineCap = 'round'
  if (motif === 'baobab') {
    ctx.beginPath()
    ctx.moveTo(cx - 40, cy + 130)
    ctx.bezierCurveTo(cx - 52, cy + 40, cx - 20, cy + 10, cx - 24, cy - 40)
    ctx.lineTo(cx + 24, cy - 40)
    ctx.bezierCurveTo(cx + 20, cy + 10, cx + 52, cy + 40, cx + 40, cy + 130)
    ctx.fill()
    for (let a = -70; a <= 70; a += 20) {
      const r = (a * Math.PI) / 180
      const ex = cx + Math.sin(r) * 96
      const ey = cy - 40 - Math.cos(r) * 62
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(cx + a * 0.28, cy - 38)
      ctx.quadraticCurveTo(cx + a * 0.5, cy - 70, ex, ey)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(ex, ey, 13, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (motif === 'palm') {
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(cx + 6, cy + 130)
    ctx.quadraticCurveTo(cx - 8, cy + 70, cx, cy + 24)
    ctx.stroke()
    ctx.lineWidth = 6
    for (let a = -84; a <= 84; a += 12) {
      const r = (a * Math.PI) / 180
      ctx.beginPath()
      ctx.moveTo(cx, cy + 24)
      ctx.lineTo(cx + Math.sin(r) * 112, cy + 24 - Math.cos(r) * 132)
      ctx.stroke()
    }
  } else {
    ctx.lineWidth = 3
    for (let r = 12; r <= 44; r += 8) {
      ctx.beginPath()
      ctx.arc(cx + 26, cy - 62, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (let band = 0; band < 8; band++) {
      const y = cy + band * 19
      ctx.lineWidth = 2 + band * 0.6
      ctx.beginPath()
      for (let x = cx - 130; x <= cx + 130; x += 6) {
        const wave = y + Math.sin(x / (26 + band * 5) + band * 1.7) * (5 + band)
        if (x === cx - 130) ctx.moveTo(x, wave)
        else ctx.lineTo(x, wave)
      }
      ctx.stroke()
    }
  }
}

/** Decorative original notes: they borrow the grammar of a banknote, not any issued design. */
function noteArtwork(note: Denomination, back: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 448
  const ctx = canvas.getContext('2d')!
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing: string }
  const rand = random(note.value)
  const { ink, wash, label } = note
  const text = (value: string, x: number, y: number, font: string, spacing = '0px') => {
    ctx.font = font
    spaced.letterSpacing = spacing
    ctx.fillText(value, x, y)
  }

  // Paper, colour wash and fibres.
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, 1024, 448)
  const tint = ctx.createLinearGradient(0, 0, 1024, 0)
  tint.addColorStop(0, wash)
  tint.addColorStop(0.34, PAPER)
  tint.addColorStop(0.58, PAPER)
  tint.addColorStop(1, wash)
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, 1024, 448)
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.07
  for (let i = 0; i < 1800; i++) ctx.fillRect(rand() * 1024, rand() * 448, 1.5, 1.5)

  // Engraved wave field.
  ctx.strokeStyle = ink
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.2
  for (let y = 44; y < 410; y += 7) {
    ctx.beginPath()
    for (let x = 36; x <= 988; x += 6) {
      const wave = y + Math.sin(x / 44 + y / 24) * 5 + Math.sin(x / 13) * 1.2
      if (x === 36) ctx.moveTo(x, wave)
      else ctx.lineTo(x, wave)
    }
    ctx.stroke()
  }

  // Guilloché frame: two interlaced waves on each side.
  ctx.globalAlpha = 0.75
  ctx.lineWidth = 1.3
  for (const phase of [0, Math.PI]) {
    ctx.beginPath()
    for (let x = 18; x <= 1006; x += 2) {
      const wave = Math.sin(x / 7 + phase) * 7
      if (x === 18) ctx.moveTo(x, 27 + wave)
      else ctx.lineTo(x, 27 + wave)
    }
    for (let x = 18; x <= 1006; x += 2) {
      const wave = Math.sin(x / 7 + phase) * 7
      if (x === 18) ctx.moveTo(x, 421 + wave)
      else ctx.lineTo(x, 421 + wave)
    }
    for (let y = 18; y <= 430; y += 2) {
      const wave = Math.sin(y / 7 + phase) * 7
      if (y === 18) ctx.moveTo(27 + wave, y)
      else ctx.lineTo(27 + wave, y)
    }
    for (let y = 18; y <= 430; y += 2) {
      const wave = Math.sin(y / 7 + phase) * 7
      if (y === 18) ctx.moveTo(997 + wave, y)
      else ctx.lineTo(997 + wave, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.lineWidth = 3
  ctx.strokeRect(10, 10, 1004, 428)
  ctx.lineWidth = 1.2
  ctx.strokeRect(42, 42, 940, 364)
  ctx.fillStyle = ink

  if (back) {
    // Reverse: one large rosette around the short numeral.
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 1
    for (let i = 0; i < 48; i++) {
      ctx.beginPath()
      ctx.ellipse(512, 224, 250, 86, (i * Math.PI) / 48, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = PAPER
    ctx.beginPath()
    ctx.arc(512, 224, 96, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(512, 224, 84, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    text(String(note.value / 1000), 512, 250, '800 92px "Cabinet Grotesk", sans-serif', '-2px')
    text('MILLE ARIARY', 512, 282, '700 15px Satoshi, sans-serif', '3px')
    text('KARAMA-KO', 512, 84, '800 26px "Cabinet Grotesk", sans-serif', '6px')
    text('SPÉCIMEN SANS VALEUR', 512, 388, '500 14px Satoshi, sans-serif', '4px')
    ctx.textAlign = 'left'
    text(label, 62, 92, '800 40px "Cabinet Grotesk", sans-serif')
    ctx.textAlign = 'right'
    text(label, 962, 386, '800 40px "Cabinet Grotesk", sans-serif')
    return canvas
  }

  // Watermark window.
  ctx.globalAlpha = 0.8
  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.arc(150, 236, 84, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.13
  ctx.textAlign = 'center'
  text(String(note.value / 1000), 150, 272, '800 104px "Cabinet Grotesk", sans-serif', '-3px')

  // Vignette.
  ctx.globalAlpha = 1
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(846, 224, 112, 150, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = wash
  ctx.fillRect(700, 50, 300, 350)
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1
  for (let y = 70; y < 380; y += 5) {
    ctx.beginPath()
    ctx.moveTo(720, y)
    ctx.lineTo(980, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = ink
  vignette(ctx, note.motif, 846, 224)
  ctx.restore()
  ctx.lineCap = 'butt'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(846, 224, 112, 150, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(846, 224, 121, 159, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Iridescent security stripe.
  const foil = ctx.createLinearGradient(0, 42, 0, 406)
  for (const [stop, colour] of [
    [0, '#d9dfe6'],
    [0.2, '#f3d9a4'],
    [0.4, '#b9e0d2'],
    [0.6, '#e9bfd3'],
    [0.8, '#c3ccf0'],
    [1, '#d9dfe6'],
  ] as const)
    foil.addColorStop(stop, colour)
  ctx.fillStyle = foil
  ctx.fillRect(664, 42, 30, 364)
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.55
  ctx.save()
  ctx.translate(685, 396)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'left'
  text(`${label} · `.repeat(6), 0, 0, '700 13px Satoshi, sans-serif', '2px')
  ctx.restore()

  // Lettering.
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
  text('KARAMA-KO', 262, 88, '800 24px "Cabinet Grotesk", sans-serif', '5px')
  text(label, 256, 262, '800 116px "Cabinet Grotesk", sans-serif', '-3px')
  text('ARIARY', 262, 304, '700 24px "Cabinet Grotesk", sans-serif', '9px')
  text(label, 60, 90, '800 30px "Cabinet Grotesk", sans-serif')
  text('ATELIER DU SALAIRE · MADAGASCAR', 60, 392, '500 12px Satoshi, sans-serif', '2px')
  ctx.fillStyle = SERIAL_INK
  text(`KK ${String(4_207_193 + note.value).padStart(8, '0')} A`, 262, 368, '500 22px ui-monospace, monospace', '3px')
  ctx.strokeStyle = ink
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(520, 372)
  ctx.bezierCurveTo(540, 330, 556, 392, 574, 352)
  ctx.bezierCurveTo(586, 328, 596, 384, 618, 356)
  ctx.lineTo(640, 362)
  ctx.stroke()
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.7
  text('SPÉCIMEN SANS VALEUR · '.repeat(3), 262, 392, '500 10px Satoshi, sans-serif', '2px')
  return canvas
}

/** Notes frame the title from the edges, never across it: [nx, ny, z, rx, ry, rz, pile]. */
const NEAR_SLOTS = [
  [-1.0, 0.86, 1.2, -0.35, 0.45, 0.32, 0],
  [-0.32, 1.06, -1.6, 0.4, 0.2, 0.12, 1],
  [1.12, 0.16, 1.4, 0.3, -0.5, -0.36, 0],
  [-1.14, -0.02, -1.2, 0.2, 0.6, -0.5, 0],
  [0.84, -0.84, 1.8, -0.25, -0.4, 0.3, 0],
  [0.36, -1.04, -1.4, -0.4, 0.15, -0.14, 2],
  [1.1, -0.42, -3, 0.35, -0.3, 0.5, 1],
] as const

export function BanknoteHero() {
  const root = useRef<HTMLElement>(null)
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = root.current
    const container = host.current
    if (!section || !container) return
    const stage = section.querySelector<HTMLElement>('.hero-stage')!
    const title = section.querySelector<HTMLElement>('.hero-title')!
    const acts = {
      intro: section.querySelector<HTMLElement>('.hero-intro')!,
      gross: section.querySelector<HTMLElement>('.hero-gross')!,
      split: section.querySelector<HTMLElement>('.hero-split')!,
      net: section.querySelector<HTMLElement>('.hero-net')!,
    }
    const grossFigure = acts.gross.querySelector<HTMLElement>('[data-figure]')!
    const labels = [...section.querySelectorAll<HTMLElement>('.hero-pile')]
    const labelFigures = labels.map((label) => label.querySelector<HTMLElement>('[data-figure]')!)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')

    let disposed = false
    let frame = 0
    let visible = true
    let target = 0
    let progress = 0
    let paint: ((progress: number, now: number) => void) | undefined
    let teardownScene: (() => void) | undefined

    const setText = (el: HTMLElement, text: string) => {
      if (el.textContent !== text) el.textContent = text
    }
    const show = (el: HTMLElement, v: number) => {
      el.style.setProperty('--v', v.toFixed(3))
      el.toggleAttribute('data-live', v > 0.5)
      el.inert = v <= 0.5
    }
    const copy = (p: number) => {
      title.style.setProperty('--out', seg(p, T.titleOut[0], T.titleOut[1]).toFixed(3))
      show(acts.intro, 1 - seg(p, 0.03, 0.12))
      show(acts.gross, band(p, T.gross))
      show(acts.split, band(p, T.split))
      show(acts.net, seg(p, T.net[0], T.net[1]))
      stage.style.setProperty('--p', p.toFixed(4))
      setText(grossFigure, formatAr(Math.round(GROSS * easeOut(seg(p, T.gross[0], T.gross[1] + 0.02)))))
      const counted = easeOut(seg(p, T.count[0], T.count[1]))
      labelFigures.forEach((el, i) => setText(el, formatAr(Math.round(PILES[i].value * counted))))
    }

    const tick = (now: number) => {
      frame = 0
      if (disposed) return
      // The last screen of the track belongs to the sheet that slides over the stage.
      const travel = section.offsetHeight - stage.offsetHeight * 2
      target = reduced.matches || travel <= 0 ? 0 : clamp01(-section.getBoundingClientRect().top / travel)
      progress += (target - progress) * (reduced.matches ? 1 : 0.14)
      if (Math.abs(target - progress) < 0.0004) progress = target
      copy(progress)
      paint?.(progress, now)
      if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick)
    }
    const wake = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(tick)
    }
    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) wake()
    })
    watcher.observe(section)
    addEventListener('scroll', wake, { passive: true })
    addEventListener('resize', wake)
    document.addEventListener('visibilitychange', wake)
    reduced.addEventListener('change', wake)
    wake()

    const startScene = async () => {
      const THREE = await import('three')
      await Promise.all([
        document.fonts.load('800 34px "Cabinet Grotesk"'),
        document.fonts.load('500 15px Satoshi'),
      ])
      if (disposed) return
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setClearColor(0, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      container.append(renderer.domElement)

      const scene = new THREE.Scene()
      const fog = new THREE.Fog(0, 13, 36)
      scene.fog = fog
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80)
      camera.position.set(0, 0, CAMERA_Z)
      scene.add(new THREE.AmbientLight(0xffffff, 1.15))
      const key = new THREE.DirectionalLight(0xfff4ea, 2.3)
      key.position.set(-4, 7, 9)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0xe6a3b5, 1.4)
      rim.position.set(6, -3, 4)
      scene.add(rim)

      const textures = DENOMINATIONS.flatMap((note) =>
        [false, true].map((back) => {
          const texture = new THREE.CanvasTexture(noteArtwork(note, back))
          texture.colorSpace = THREE.SRGBColorSpace
          texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
          return texture
        }),
      )
      const faces = textures.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.82 }))
      const edge = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1 })

      // Every note shares one gentle curl so that stacked notes nest.
      const geometry = new THREE.BoxGeometry(3.6, 1.575, 0.016, 28, 6, 1)
      const vertices = geometry.attributes.position
      for (let v = 0; v < vertices.count; v++) {
        const x = vertices.getX(v)
        const y = vertices.getY(v)
        vertices.setZ(v, vertices.getZ(v) + Math.sin(x * 0.85) * 0.05 + y * y * 0.03)
      }
      geometry.computeVertexNormals()

      const rand = random(20)
      // One shuffled stack, so that every pile and denomination is spread through it.
      const notes = COMPOSITION.flatMap((row, pile) =>
        row.flatMap((count, denomination) => Array.from({ length: count }, () => ({ pile, denomination }))),
      )
      for (let i = notes.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[notes[i], notes[j]] = [notes[j], notes[i]]
      }
      // In a pile, the largest notes lie at the bottom.
      const pileLevel = new Array<number>(NOTE_COUNT)
      PILES.forEach((_, pile) =>
        notes
          .map((note, i) => ({ ...note, i }))
          .filter((note) => note.pile === pile)
          .sort((a, b) => a.denomination - b.denomination)
          .forEach((note, level) => (pileLevel[note.i] = level)),
      )
      // Give the framed slots to notes of the denomination each slot asks for.
      const slotOf = new Map<number, number>()
      NEAR_SLOTS.forEach((slot, s) => {
        const candidates = notes.flatMap((note, i) => (note.denomination === slot[6] && !slotOf.has(i) ? [i] : []))
        slotOf.set(candidates[Math.floor(((s + 0.5) / NEAR_SLOTS.length) * candidates.length)], s)
      })
      const group = new THREE.Group()
      scene.add(group)

      // Distant notes keep clear of the title and of the introduction.
      const farPose = () => {
        let nx = 0
        let ny = 0
        // Allowed: the top band left of the navigation, the bottom right, and both sides.
        do {
          nx = (rand() * 2 - 1) * 1.2
          ny = (rand() * 2 - 1) * 1.15
        } while (
          !(
            (ny > 0.68 && nx < 0.35) ||
            (ny < -0.62 && nx > 0.2) ||
            (Math.abs(nx) > 1.02 && ny > -0.5 && ny < 0.6)
          )
        )
        return [nx, ny, -9 - rand() * 20, (rand() - 0.5) * 1.6, (rand() - 0.5) * 1.8, (rand() - 0.5) * 2.4] as const
      }
      const bills = notes.map(({ pile, denomination }, i) => {
        const mesh = new THREE.Mesh(geometry, [
          edge,
          edge,
          edge,
          edge,
          faces[denomination * 2],
          faces[denomination * 2 + 1],
        ])
        group.add(mesh)
        const slot = slotOf.get(i)
        const float = slot !== undefined ? NEAR_SLOTS[slot] : farPose()
        return {
          mesh,
          pile,
          size: DENOMINATIONS[denomination].size,
          level: i,
          pileLevel: pileLevel[i],
          near: slot !== undefined,
          float,
          floatQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(float[3], float[4], float[5])),
          flatQuat: new THREE.Quaternion().setFromEuler(
            new THREE.Euler(-1.02, 0, 0.3 + (rand() - 0.5) * 0.07),
          ),
          jitter: [(rand() - 0.5) * 0.07, (rand() - 0.5) * 0.05],
          stagger: rand(),
          phase: rand() * Math.PI * 2,
        }
      })

      const applyTheme = () => {
        fog.color.set(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0e0e0e')
        wake()
      }
      const themeWatcher = new MutationObserver(applyTheme)
      themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      applyTheme()

      let width = 1
      let height = 1
      let pointerX = 0
      let pointerY = 0
      const began = performance.now()
      const position = new THREE.Vector3()
      const to = new THREE.Vector3()
      const quat = new THREE.Quaternion()
      const spin = new THREE.Quaternion()
      const wobble = new THREE.Euler()
      const axisX = new THREE.Vector3(1, 0, 0)
      const normal = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(-1.02, 0, 0.3))
      const anchor = new THREE.Vector3()

      paint = (p, now) => {
        if (!width || !height) return
        const aspect = width / height
        const halfH = HALF_TAN * CAMERA_Z
        const halfW = halfH * aspect
        const column = aspect < 0.85
        const flatScale = THREE.MathUtils.clamp(halfW / 8.5, 0.44, 1)
        const floatScale = THREE.MathUtils.clamp(halfW / 7, 0.56, 1)
        const gap = 0.02 * flatScale
        const still = reduced.matches
        const time = still ? 0 : (now - began) / 1000
        const centers = column
          ? [
              [-0.42 * halfW, 0.34 * halfH],
              [-0.42 * halfW, -0.12 * halfH],
              [-0.42 * halfW, -0.5 * halfH],
            ]
          : [
              [-0.5 * halfW, 0.02 * halfH],
              [0.1 * halfW, -0.04 * halfH],
              [0.62 * halfW, -0.04 * halfH],
            ]
        const settle = ease(seg(p, T.settle[0], T.settle[1]))

        for (const bill of bills) {
          const [nx, ny, z] = bill.float
          const depth = HALF_TAN * (CAMERA_Z - z)
          const arrival = still ? 1 : easeOut(clamp01((time - 0.15 - bill.stagger * 0.5) / 1.7))
          const gather = ease(seg(p, T.gather[0] + bill.stagger * 0.08, T.gather[1] - 0.08 + bill.stagger * 0.08))
          const order = 1 - bill.level / (NOTE_COUNT - 1)
          const dealStart = T.deal[0] + order * (T.deal[1] - T.deal[0] - 0.07)
          const dealRaw = seg(p, dealStart, dealStart + 0.07)
          const deal = ease(dealRaw)

          // Floating around the title.
          position.set(
            nx * depth * aspect,
            ny * depth + Math.sin(time * 0.5 + bill.phase) * 0.14 + (1 - arrival) * (2 + ny * 2),
            z - (1 - arrival) * 16,
          )
          wobble.set(
            Math.sin(time * 0.31 + bill.phase) * 0.09 + (1 - arrival) * 1.4,
            Math.cos(time * 0.27 + bill.phase) * 0.12,
            Math.sin(time * 0.22 + bill.phase * 2) * 0.05,
          )
          quat.copy(bill.floatQuat).multiply(spin.setFromEuler(wobble))

          // Gathered into one stack.
          to.copy(normal)
            .multiplyScalar((bill.level - NOTE_COUNT / 2) * gap)
            .add(anchor.set(bill.jitter[0], -0.26 * halfH + bill.jitter[1], 0))
          position.lerp(to, gather)
          position.z += Math.sin(Math.PI * gather) * (bill.near ? 0.6 : 2)
          quat.slerp(bill.flatQuat, gather)

          // Dealt to its pile.
          const [cx, cy] = centers[bill.pile]
          to.copy(normal)
            .multiplyScalar(bill.pileLevel * gap)
            .add(anchor.set(cx + bill.jitter[0], cy + bill.jitter[1], 0))
          position.lerp(to, deal)
          position.y += Math.sin(Math.PI * dealRaw) * 1.5 * flatScale
          position.z += Math.sin(Math.PI * dealRaw) * 1.4
          if (dealRaw > 0 && dealRaw < 1) quat.multiply(spin.setFromAxisAngle(axisX, Math.PI * 2 * deal))

          // Deductions leave; the net stays.
          let scale = THREE.MathUtils.lerp(floatScale, flatScale, gather)
          if (bill.pile === 0) {
            to.copy(normal)
              .multiplyScalar(bill.pileLevel * gap * 1.15)
              .add(anchor.set(bill.jitter[0], (column ? -0.34 : -0.52) * halfH + bill.jitter[1], 0))
            position.lerp(to, settle)
            scale *= 1 + settle * 0.15
          } else {
            position.x += settle * halfW * 2.6
            position.y += settle * 2
            position.z -= settle * 6
          }
          bill.mesh.position.copy(position)
          bill.mesh.quaternion.copy(quat)
          bill.mesh.scale.setScalar(scale * bill.size)
        }

        // The whole flight of notes sways slowly, then comes to rest as it gathers.
        const loose = 1 - ease(seg(p, T.gather[0], T.gather[1]))
        group.rotation.set(
          Math.sin(time * 0.17) * 0.05 * loose,
          Math.sin(time * 0.23) * 0.16 * loose,
          (Math.sin(time * 0.13) * 0.07 + p * 1.2) * loose,
        )
        const push = ease(seg(p, 0.08, 0.32)) - ease(seg(p, 0.44, 0.58))
        camera.position.x += (pointerX * 0.9 - camera.position.x) * 0.05
        camera.position.y += (-pointerY * 0.6 - camera.position.y) * 0.05
        camera.position.z = CAMERA_Z - push * 1.5
        camera.lookAt(0, 0, 0)
        camera.updateMatrixWorld()
        renderer.render(scene, camera)

        // Pin each label to its pile.
        section.dataset.layout = column ? 'column' : 'row'
        labels.forEach((label, i) => {
          const [cx, cy] = centers[i]
          if (column) anchor.set(cx + 2.15 * flatScale, cy + 0.25, 0)
          else anchor.set(cx, cy - 1.15 * flatScale - 0.2, 0)
          anchor.project(camera)
          label.style.setProperty('--x', `${((anchor.x + 1) / 2) * width}px`)
          label.style.setProperty('--y', `${((1 - anchor.y) / 2) * height}px`)
        })
        section.dataset.webgl = 'ready'
      }

      const resize = new ResizeObserver(() => {
        width = container.clientWidth
        height = container.clientHeight
        if (!width || !height) return
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height, false)
        wake()
      })
      resize.observe(container)
      const pointer = (event: PointerEvent) => {
        if (reduced.matches || event.pointerType !== 'mouse') return
        pointerX = event.clientX / innerWidth - 0.5
        pointerY = event.clientY / innerHeight - 0.5
      }
      const contextLost = (event: Event) => {
        event.preventDefault()
        paint = undefined
        section.dataset.webgl = 'fallback'
      }
      addEventListener('pointermove', pointer, { passive: true })
      renderer.domElement.addEventListener('webglcontextlost', contextLost)
      wake()

      teardownScene = () => {
        paint = undefined
        resize.disconnect()
        themeWatcher.disconnect()
        removeEventListener('pointermove', pointer)
        renderer.domElement.removeEventListener('webglcontextlost', contextLost)
        geometry.dispose()
        textures.forEach((texture) => texture.dispose())
        faces.forEach((material) => material.dispose())
        edge.dispose()
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      }
    }
    // The 3D scene is a 190 kB download and a continuous GPU load: skip it where that would hurt.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const constrained =
      connection?.saveData === true ||
      /(^|-)2g$/.test(connection?.effectiveType ?? '') ||
      (memory !== undefined && memory <= 2) ||
      navigator.hardwareConcurrency <= 2
    let idle = 0
    if (constrained) section.dataset.webgl = 'fallback'
    else {
      // Let the title and the buttons paint first.
      const begin = () => startScene().catch(() => {
        if (!disposed) section.dataset.webgl = 'fallback'
      })
      idle =
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(begin, { timeout: 1200 })
          : (setTimeout(begin, 200) as unknown as number)
    }

    return () => {
      disposed = true
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle)
      clearTimeout(idle)
      cancelAnimationFrame(frame)
      watcher.disconnect()
      removeEventListener('scroll', wake)
      removeEventListener('resize', wake)
      document.removeEventListener('visibilitychange', wake)
      reduced.removeEventListener('change', wake)
      teardownScene?.()
    }
  }, [])

  return (
    <section ref={root} className="hero" aria-labelledby="home-title" data-webgl="pending" data-layout="row">
      <div className="hero-stage">
        <div className="hero-backdrop" aria-hidden="true">
          <GuillocheField />
        </div>
        <h1 id="home-title" className="hero-title">
          <span>Karama-Ko</span>
        </h1>
        <div ref={host} className="hero-scene" aria-hidden="true" />
        <div className="hero-fallback" aria-hidden="true">
          {DENOMINATIONS.map((note) => (
            <div className="fallback-note" key={note.value} style={{ background: note.wash, color: note.ink }}>
              <span>Karama-Ko</span>
              <strong>{note.label}</strong>
              <span>Ariary</span>
            </div>
          ))}
        </div>

        <div className="hero-act hero-intro" data-live>
          <p className="hero-lede">
            Votre salaire à Madagascar, du brut au net. Comprenez-le, comparez vos offres, préparez la suite.
          </p>
          <div className="hero-actions">
            <a href="#calculateur" className="btn btn-accent">
              Calculer mon salaire
              <ArrowIcon />
            </a>
            <a href="#outils" className="btn btn-ghost">
              Voir les outils
            </a>
          </div>
        </div>
        <p className="hero-cue" aria-hidden="true">
          <span />
          Faites défiler
        </p>

        <p className="sr-only-focusable">
          Sur un salaire brut de {formatAr(GROSS)}, sans personne à charge : {formatAr(RESULT.net)} de salaire
          net, {formatAr(RESULT.irsa)} d’IRSA et {formatAr(RESULT.socialDeductions)} de cotisations CNaPS et
          OSTIE.
        </p>
        <div className="hero-act hero-gross" aria-hidden="true">
          <p>Prenez un salaire brut de</p>
          <p className="hero-figure" data-figure>
            {formatAr(GROSS)}
          </p>
          <p>En billets de 20 000, 10 000 et 5 000, chaque mois.</p>
        </div>
        <div className="hero-act hero-split" aria-hidden="true">
          <p className="hero-statement">Tout n’arrive pas sur votre compte.</p>
          {PILES.map((pile) => (
            <div className="hero-pile" data-pile={pile.id} key={pile.id}>
              <strong data-figure>{formatAr(pile.value)}</strong>
              <span>{pile.name}</span>
              <small>{formatPercent(pile.value / GROSS, 2)} du brut</small>
            </div>
          ))}
        </div>
        <div className="hero-act hero-net">
          <p className="hero-figure">{formatAr(RESULT.net)}</p>
          <p className="hero-statement">C’est ce qui vous reste. Et le vôtre&nbsp;?</p>
          <div className="hero-actions">
            <a href="#calculateur" className="btn btn-accent">
              Calculer le mien
              <ArrowIcon />
            </a>
            <a href="#outils" className="btn btn-ghost">
              Tous les outils
            </a>
          </div>
        </div>
        <div className="hero-progress" aria-hidden="true" />
      </div>
    </section>
  )
}
