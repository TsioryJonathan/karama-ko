import { useEffect, useRef, useState } from 'react'

const DURATION = 300

/** Rolls a number to its new value in 300 ms. */
export function useCountUp(target: number): number {
  const [shown, setShown] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    const from = current.current
    if (from === target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target
      setShown(target)
      return
    }
    const start = performance.now()
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / DURATION)
      const value = Math.round(from + (target - from) * (1 - (1 - t) ** 3))
      current.current = value
      setShown(value)
      if (t < 1) raf = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(raf)
  }, [target])

  return shown
}
