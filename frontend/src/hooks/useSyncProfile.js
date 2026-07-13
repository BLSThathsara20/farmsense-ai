import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useFarmStore } from '../store/farmStore'
import { authService, apiConfig } from '../api'

/** After login, pull saved profile from PostgreSQL so returning users see their data. */
export function useSyncProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  useEffect(() => {
    if (!isAuthenticated || apiConfig.useMock) return

    let cancelled = false
    ;(async () => {
      try {
        const profile = await authService.getProfile()
        if (cancelled) return
        if (profile?.user) updateProfile(profile.user)
        if (profile?.savedData?.hasSoilData) {
          useFarmStore.setState({ hasSoilData: true })
        }
      } catch {
        /* offline or token expired — pages handle errors */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, updateProfile])
}
