import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

const PROMPT_KEY = 'farmsense-simple-mode-prompted'

export function applySimpleModeToDom(enabled) {
  if (typeof document === 'undefined') return
  if (enabled) {
    document.documentElement.dataset.simpleMode = 'true'
  } else {
    delete document.documentElement.dataset.simpleMode
  }
}

export function markSimpleModePrompted() {
  try {
    localStorage.setItem(PROMPT_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function hasSeenSimpleModePrompt() {
  try {
    return localStorage.getItem(PROMPT_KEY) === '1'
  } catch {
    return false
  }
}

/** Keeps <html data-simple-mode> in sync with the account preference. */
export function useSimpleMode() {
  const simpleMode = useAuthStore((s) => Boolean(s.user?.simpleMode))
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    applySimpleModeToDom(isAuthenticated && simpleMode)
    return () => {
      applySimpleModeToDom(false)
    }
  }, [isAuthenticated, simpleMode])

  return simpleMode
}
