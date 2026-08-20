import {
  dashboardService,
  recommendationsService,
  marketService,
  communityService,
  farmService,
} from '../api'
import { useAsyncData } from './useAsyncData'
import { useEffect } from 'react'
import { useFarmStore } from '../store/farmStore'
import { useAuthStore } from '../store/authStore'

/** Dashboard + farmer profile from GET /dashboard (live backend when mock is off). */
export function useMockData() {
  const { data, loading, error, retry } = useAsyncData(
    () => dashboardService.getDashboard(),
    []
  )

  useEffect(() => {
    if (!data?.plansOverview) return
    useFarmStore.getState().setPlansOverview(data.plansOverview)
    if (data.plansOverview.plans) {
      useFarmStore.getState().setPlans(data.plansOverview.plans)
    }
  }, [data])

  return {
    loading,
    error,
    retry,
    farmers: data ? [data.currentFarmer] : [],
    currentFarmer: data?.currentFarmer,
    recommendations: data?.recommendations ?? [],
    topRecommendation: data?.topRecommendation,
    marketData: null,
    districtData: null,
    soilReadings: data?.soilReadings,
    dashboardStats: data?.stats,
    hasSoilData: data?.hasSoilData ?? false,
    plansOverview: data?.plansOverview ?? null,
    allSelectedCrops: data?.allSelectedCrops ?? data?.plansOverview?.allSelectedCrops ?? [],
    crops: farmService.getCropPreferences().filter((c) => c !== 'No preference'),
    regions: farmService.getRegions(),
    textureOptions: farmService.getTextureOptions(),
    cropPreferences: farmService.getCropPreferences(),
  }
}

export function useMarketData(crop = 'Tomato') {
  const demoDataMode = useAuthStore((s) => Boolean(s.user?.demoDataMode))
  const { data, loading, error, retry } = useAsyncData(
    () => marketService.getMarketData(crop),
    [crop, demoDataMode]
  )

  return {
    loading,
    error,
    retry,
    data: data?.data,
    crop: data?.crop ?? crop,
  }
}

export function useRecommendations(planId) {
  const { data, loading, error, retry } = useAsyncData(
    () =>
      planId
        ? recommendationsService.getPlan(planId)
        : recommendationsService.getRecommendations(),
    [planId || 'latest']
  )

  return {
    loading,
    error,
    retry,
    recommendations: data?.recommendations ?? [],
    topRecommendation: data?.topRecommendation,
    runDate: data?.runDate ?? new Date().toISOString(),
    planStatus: data?.planStatus ?? null,
    finalized: Boolean(data?.finalized),
    selectedCropsFromServer: data?.selectedCrops ?? [],
    finalizedAt: data?.finalizedAt ?? null,
    planId: data?.planId || data?.runId || planId || null,
    title: data?.title || null,
    plantedDate: data?.plantedDate ?? null,
    effectivePlantedDate: data?.effectivePlantedDate ?? null,
    generatedPlantedDate: data?.generatedPlantedDate ?? null,
    plantedDateSource: data?.plantedDateSource ?? null,
    reminders: data?.reminders ?? [],
  }
}

export function usePlansList() {
  const { data, loading, error, retry } = useAsyncData(
    () => recommendationsService.listPlans(),
    []
  )
  return {
    loading,
    error,
    retry,
    plans: data?.plans ?? [],
  }
}

export function usePlansOverview() {
  const { data, loading, error, retry } = useAsyncData(
    () => recommendationsService.getPlansOverview(),
    []
  )
  return {
    loading,
    error,
    retry,
    overview: data,
  }
}

export function useCommunityData() {
  const demoDataMode = useAuthStore((s) => Boolean(s.user?.demoDataMode))
  const { data, loading, error, retry } = useAsyncData(
    () => communityService.getDistrictData(),
    [demoDataMode]
  )

  return {
    loading,
    error,
    retry,
    districtData: data,
  }
}

/** Crop names from GET /market/crops (DB reference data). */
export function useCrops() {
  const { data, loading, error, retry } = useAsyncData(
    () => marketService.getCrops(),
    []
  )

  const crops = Array.isArray(data)
    ? data
    : farmService.getCropPreferences().filter((c) => c !== 'No preference')

  return { crops, loading, error, retry }
}
