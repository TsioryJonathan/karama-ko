import { useEffect, useRef } from 'react'

/** A rosette: stacked ellipses rotated around one centre, the way banknote security print is drawn. */
const ROSETTES = [
  { x: 0.1, y: 0.2, size: 0.34, turns: 56, speed: 0.011, accent: false },
  { x: 0.92, y: 0.78, size: 0.42, turns: 64, speed: -0.008, accent: true },
  { x: 0.56, y: 1.02, size: 0.26, turns: 48, speed: 0.014, accent: false },
]

/**
 * Decorative hero background: crisp engraved rosettes that turn very slowly and lean away from
 * the pointer. Fills its positioned parent and stays behind its content.
 */
export function GuillocheField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.parentElement?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !host || !ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let visible = false
    let width = 0
    let height = 0
    let line = ''
    let accent = ''
    const pointer = { x: 0, y: 0, target: { x: 0, y: 0 } }

    const readTheme = () => {
      const style = getComputedStyle(document.documentElement)
      line = style.getPropertyValue('--control').trim()
      accent = style.getPropertyValue('--accent').trim()
    }
    const draw = (now: number) => {
      frame = 0
      if (!width || !height) return
      const time = reduced.matches ? 0 : now / 1000
      pointer.x += (pointer.target.x - pointer.x) * 0.05
      pointer.y += (pointer.target.y - pointer.y) * 0.05
      ctx.clearRect(0, 0, width, height)
      ctx.lineWidth = 0.8
      const reach = Math.min(width, height)
      ROSETTES.forEach((rosette, index) => {
        const radius = rosette.size * Math.max(width, height) * 0.5
        const cx = rosette.x * width - pointer.x * (12 + index * 8)
        const cy = rosette.y * height - pointer.y * (12 + index * 8)
        ctx.strokeStyle = rosette.accent ? accent : line
        ctx.globalAlpha = rosette.accent ? 0.5 : 0.34
        const path = new Path2D()
        for (let i = 0; i < rosette.turns; i++) {
          const angle = (i * Math.PI) / rosette.turns + time * rosette.speed
          path.ellipse(cx, cy, radius, radius * 0.34, angle, 0, Math.PI * 2)
        }
        // A second, counter-rotating ring gives the moiré of a real guilloché.
        const inner = new Path2D()
        for (let i = 0; i < rosette.turns / 2; i++) {
          const angle = (i * 2 * Math.PI) / rosette.turns - time * rosette.speed * 1.6
          inner.ellipse(cx, cy, radius * 0.56, radius * 0.2, angle, 0, Math.PI * 2)
        }
        ctx.stroke(path)
        ctx.globalAlpha *= 0.8
        ctx.stroke(inner)
        void reach
      })
      ctx.globalAlpha = 1
      if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(draw)
    }
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(draw)
    }
    const resize = new ResizeObserver(() => {
      const ratio = Math.min(devicePixelRatio, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      wake()
    })
    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) wake()
    })
    const theme = new MutationObserver(() => {
      readTheme()
      wake()
    })
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointer.target.x = event.clientX / innerWidth - 0.5
      pointer.target.y = event.clientY / innerHeight - 0.5
    }
    readTheme()
    resize.observe(canvas)
    watcher.observe(canvas)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    host.addEventListener('pointermove', move, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      watcher.disconnect()
      theme.disconnect()
      host.removeEventListener('pointermove', move)
    }
  }, [])

  return (
    <div className="wave-field" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  )
}
