import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useFarmStore } from '../store/farmStore'
import { authService, apiConfig, ApiError } from '../api'
import { describeServiceError, isServiceOutageError } from '../lib/serviceError'

const SESSION_CHECK_MS = 6000

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(ApiError.timeout('farmsense-backend'))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/**
 * Validates persisted localStorage sessions against the backend.
 * Always resolves within SESSION_CHECK_MS so routes never spin forever.
 */
export function useAuthSession() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const setSessionStatus = useAuthStore((s) => s.setSessionStatus)
  const setSessionError = useAuthStore((s) => s.setSessionError)

  useEffect(() => {
    if (!hasHydrated) return

    let active = true
    const runId = Symbol('session-check')

    const clearSession = (errorInfo = null) => {
      try {
        useFarmStore.getState().resetFarmData()
      } catch {
        /* ignore */
      }
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        sessionStatus: 'unauthenticated',
        sessionError: errorInfo,
      })
    }

    ;(async () => {
      if (!token || !isAuthenticated) {
        if (!active) return
        setSessionError(null)
        setSessionStatus('unauthenticated')
        if (token || isAuthenticated) clearSession(null)
        return
      }

      if (apiConfig.useMock) {
        if (!active) return
        setSessionError(null)
        setSessionStatus('authenticated')
        return
      }

      // Fresh login/register already proved the token
      if (useAuthStore.getState().sessionStatus === 'authenticated') {
        setSessionError(null)
        return
      }

      setSessionStatus('checking')
      setSessionError(null)
      useAuthStore.setState({ _sessionRunId: runId })

      try {
        const profile = await withTimeout(authService.getProfile(), SESSION_CHECK_MS)
        if (!active || useAuthStore.getState()._sessionRunId !== runId) return
        if (profile?.user) updateProfile(profile.user)
        setSessionError(null)
        setSessionStatus('authenticated')
      } catch (err) {
        // Clear sticky "checking" for this run even after Strict Mode remount.
        if (useAuthStore.getState()._sessionRunId !== runId) return
        const info = describeServiceError(err, { action: 'verify your session' })
        if (import.meta.env.DEV) {
          console.warn('[auth] Session invalid — signed out.', info.kind, err)
        }
        clearSession(isServiceOutageError(info) ? info : null)
      }
    })()

    return () => {
      active = false
    }
  }, [
    hasHydrated,
    token,
    isAuthenticated,
    updateProfile,
    setSessionStatus,
    setSessionError,
  ])

  const hasHydratedNow = useAuthStore((s) => s.hasHydrated)
  const sessionStatus = useAuthStore((s) => s.sessionStatus)

  return {
    hasHydrated: hasHydratedNow,
    sessionStatus,
    isSessionReady:
      hasHydratedNow && sessionStatus !== 'idle' && sessionStatus !== 'checking',
    isAuthenticated: sessionStatus === 'authenticated',
  }
}
