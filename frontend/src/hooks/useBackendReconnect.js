import { useEffect, useRef, useState } from 'react'
import { systemService } from '../api'

/** Max probes while an outage card is visible — avoids endless traffic at scale. */
export const BACKEND_RECONNECT_MAX_ATTEMPTS = 5
/** Base wait between probes (ms). Small random jitter is added to spread load. */
const BASE_DELAY_MS = 3500
const JITTER_MS = 1500
const HEALTH_TIMEOUT_MS = 3000

/**
 * Lightweight reconnect: poll GET /health up to 5 times while offline.
 * On success → onRecovered(). Stops after max attempts or when disabled.
 */
export function useBackendReconnect({ enabled, onRecovered }) {
  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState('idle') // idle | waiting | checking | recovered | exhausted
  const onRecoveredRef = useRef(onRecovered)
  onRecoveredRef.current = onRecovered

  useEffect(() => {
    if (!enabled) {
      setAttempt(0)
      setPhase('idle')
      return undefined
    }

    let cancelled = false
    let timer = null

    const delayFor = (n) => BASE_DELAY_MS + Math.floor(Math.random() * JITTER_MS) + (n - 1) * 500

    const runProbe = async (n) => {
      if (cancelled) return
      setAttempt(n)
      setPhase('checking')
      try {
        await systemService.probeHealth(HEALTH_TIMEOUT_MS)
        if (cancelled) return
        setPhase('recovered')
        onRecoveredRef.current?.()
      } catch {
        if (cancelled) return
        if (n >= BACKEND_RECONNECT_MAX_ATTEMPTS) {
          setPhase('exhausted')
          return
        }
        setPhase('waiting')
        timer = setTimeout(() => runProbe(n + 1), delayFor(n + 1))
      }
    }

    // First probe after a short pause so the error card can paint
    setPhase('waiting')
    setAttempt(0)
    timer = setTimeout(() => runProbe(1), 2000 + Math.floor(Math.random() * 1000))

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled])

  return {
    attempt,
    maxAttempts: BACKEND_RECONNECT_MAX_ATTEMPTS,
    phase,
    isActive: phase === 'waiting' || phase === 'checking',
    isExhausted: phase === 'exhausted',
  }
}
