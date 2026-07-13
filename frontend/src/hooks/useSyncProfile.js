import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useFarmStore } from '../store/farmStore'
import { authService, apiConfig } from '../api'
import { isAdminUser } from '../lib/roles'

/** Keep local farm UI in sync with PostgreSQL for the signed-in user. */
export function useSyncProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.user?.id)
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  useEffect(() => {
    if (!isAuthenticated || apiConfig.useMock) return
    if (isAdminUser(user)) return

    let cancelled = false
    ;(async () => {
      try {
        const profile = await authService.getProfile()
        if (cancelled) return
        if (profile?.user) updateProfile(profile.user)

        const farmLoc = profile?.farm?.location || profile?.user?.location
        const farmRegion = profile?.farm?.region || profile?.user?.region
        const farmSize = profile?.farm?.areaHectares ?? profile?.user?.farmSize

        const soil = useFarmStore.getState().soilData
        if (!soil.region && (farmLoc?.label || farmRegion)) {
          const location = farmLoc?.label
            ? { ...farmLoc, source: farmLoc.source || 'saved' }
            : {
                id: `farm-${profile?.farm?.id || 'saved'}`,
                label: farmRegion,
                fullLabel: profile?.farm?.district || farmRegion,
                country: profile?.farm?.countryCode || profile?.user?.countryCode || 'GB',
                source: 'saved',
              }
          const patch = { region: location.label, location }
          if (farmSize && Number(farmSize) > 0) patch.area = Number(farmSize)
          useFarmStore.setState({
            soilData: { ...soil, ...patch },
          })
        }

        const hasSoil = Boolean(profile?.savedData?.hasSoilData)
        const lastRec = profile?.savedData?.lastRecommendation
        if (hasSoil) {
          const patch = { hasSoilData: true }
          if (lastRec?.finalized && lastRec.selectedCrops?.length) {
            patch.selectedCrops = lastRec.selectedCrops
            patch.cropPlanConfirmedAt = lastRec.finalizedAt || new Date().toISOString()
            patch.lastRecommendation = lastRec.selectedCrops[0]
          } else if (lastRec && !lastRec.finalized) {
            patch.cropPlanConfirmedAt = null
          }
          useFarmStore.setState(patch)
        } else {
          useFarmStore.setState({
            hasSoilData: false,
            lastRecommendation: null,
            lastSoilReading: null,
            selectedCrops: [],
            cropPlanConfirmedAt: null,
          })
        }
      } catch {
        /* offline or token expired — pages handle errors */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userId, user, updateProfile])
}
