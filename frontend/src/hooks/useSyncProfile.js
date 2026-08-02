import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useFarmStore } from '../store/farmStore'
import { authService, apiConfig, ApiError } from '../api'
import { isAdminUser } from '../lib/roles'

/** Keep local farm UI in sync with PostgreSQL for the signed-in user. */
export function useSyncProfile() {
  const sessionStatus = useAuthStore((s) => s.sessionStatus)
  const userId = useAuthStore((s) => s.user?.id)
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || apiConfig.useMock) return
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
        const overview = profile?.savedData?.plansOverview
        const patch = {}
        if (overview) {
          patch.plansOverview = overview
          patch.plans = overview.plans || []
          if (overview.latestPlanId) patch.activePlanId = overview.latestPlanId
        }
        if (hasSoil || (overview?.totalPlans || 0) > 0) {
          patch.hasSoilData = true
          if (lastRec?.finalized && lastRec.selectedCrops?.length) {
            patch.selectedCrops = lastRec.selectedCrops
            patch.cropPlanConfirmedAt = lastRec.finalizedAt || new Date().toISOString()
            patch.lastRecommendation = lastRec.selectedCrops[0]
            if (lastRec.planId) patch.activePlanId = lastRec.planId
          } else if (lastRec && !lastRec.finalized) {
            patch.cropPlanConfirmedAt = null
            if (lastRec.planId) patch.activePlanId = lastRec.planId
          }
          useFarmStore.setState(patch)
        } else {
          useFarmStore.setState({
            hasSoilData: false,
            lastRecommendation: null,
            lastSoilReading: null,
            selectedCrops: [],
            cropPlanConfirmedAt: null,
            plans: [],
            activePlanId: null,
            plansOverview: overview || null,
          })
        }
      } catch (err) {
        if (cancelled) return
        const status = err instanceof ApiError ? err.status : err?.status
        if (status === 401 || status === 403) {
          useFarmStore.getState().resetFarmData()
          logout()
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionStatus, userId, user, updateProfile, logout])
}
