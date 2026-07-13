import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'farmsense-admin-data-mode'

/** @returns {'live' | 'dummy'} */
export function readAdminDataMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dummy' ? 'dummy' : 'live'
  } catch {
    return 'live'
  }
}

export function useAdminDataMode() {
  const [mode, setModeState] = useState(readAdminDataMode)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setModeState(e.newValue === 'dummy' ? 'dummy' : 'live')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setMode = useCallback((next) => {
    const value = next === 'dummy' ? 'dummy' : 'live'
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
    setModeState(value)
  }, [])

  return { mode, setMode, isDummy: mode === 'dummy', isLive: mode === 'live' }
}
