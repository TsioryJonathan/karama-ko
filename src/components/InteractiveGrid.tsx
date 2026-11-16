import { useEffect, useRef } from 'react'

const CELL_SIZE = 64

/** Decorative grid: pointer coordinates follow its actual animated position. */
export function InteractiveGrid() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const grid = ref.current
    const shell = grid?.parentElement
    if (!grid || !shell) return

    const clear = () => grid.style.setProperty('--tile-opacity', '0')
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const target = event.target
      if (target instanceof Element && target.closest('button, input, a, #resultat')) {
        clear()
        return
      }
      // The bounds include both the slow drift and the pointer parallax.
      const bounds = grid.getBoundingClientRect()
      const column = Math.floor((event.clientX - bounds.left) / CELL_SIZE)
      const row = Math.floor((event.clientY - bounds.top) / CELL_SIZE)
      grid.style.setProperty('--tile-x', `${column * CELL_SIZE + 1}px`)
      grid.style.setProperty('--tile-y', `${row * CELL_SIZE + 1}px`)
      grid.style.setProperty('--tile-opacity', '1')
    }

    shell.addEventListener('pointermove', move, { passive: true })
    shell.addEventListener('pointerleave', clear)
    shell.addEventListener('pointercancel', clear)
    window.addEventListener('blur', clear)
    return () => {
      shell.removeEventListener('pointermove', move)
      shell.removeEventListener('pointerleave', clear)
      shell.removeEventListener('pointercancel', clear)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return <div ref={ref} className="interactive-grid" aria-hidden="true" />
}
