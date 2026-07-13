import { useState, useEffect, useRef } from 'react'

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useCountUp(end, { duration = 1600, start = 0, enabled = true } = {}) {
  const [value, setValue] = useState(start)
  const started = useRef(false)

  useEffect(() => {
    if (!enabled || started.current) return
    started.current = true

    const t0 = performance.now()
    let frame

    const tick = (now) => {
      const progress = Math.min((now - t0) / duration, 1)
      setValue(Math.round(start + (end - start) * easeOutCubic(progress)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [end, duration, start, enabled])

  return value
}
