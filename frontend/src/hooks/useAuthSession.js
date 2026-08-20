import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useFarmStore } from '../store/farmStore'
import { authService, apiConfig, ApiError } from '../api'
import { describeServiceError, isServiceOutageError } from '../lib/serviceError'

const SESSION_CHECK_MS = 12000

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

function errorStatus(err) {
  return err instanceof ApiError ? err.status : err?.status
}

/**
 * Validates persisted localStorage sessions against the backend.
 * Only a real 401/403 clears the saved token — timeouts, 429, and outages keep you signed in.
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
        return
      }

      if (apiConfig.useMock) {
        if (!active) return
        setSessionError(null)
        setSessionStatus('authenticated')
        return
      }

      // Fresh login/register already proved the token (same tab, no full reload)
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
        if (useAuthStore.getState()._sessionRunId !== runId) return

        const status = errorStatus(err)
        // Only invalid/expired credentials should force login again
        if (status === 401 || status === 403) {
          if (import.meta.env.DEV) {
            console.warn('[auth] Session rejected by API — signed out.', status)
          }
          clearSession(null)
          return
        }

        // 429 / timeout / network / 5xx: keep local session so refresh does not kick you out
        const info = describeServiceError(err, { action: 'verify your session' })
        if (import.meta.env.DEV) {
          console.warn(
            '[auth] Session check failed temporarily — staying signed in.',
            info.kind,
            status || err?.code,
            err
          )
        }
        setSessionError(isServiceOutageError(info) ? info : null)
        setSessionStatus('authenticated')
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
