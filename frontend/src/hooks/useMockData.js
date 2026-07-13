import {
  dashboardService,
  recommendationsService,
  marketService,
  communityService,
  farmService,
} from '../api'
import { useAsyncData } from './useAsyncData'

/** Dashboard + farmer profile from GET /dashboard (live backend when mock is off). */
export function useMockData() {
  const { data, loading, error, retry } = useAsyncData(
    () => dashboardService.getDashboard(),
    []
  )

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
    crops: farmService.getCropPreferences().filter((c) => c !== 'No preference'),
    regions: farmService.getRegions(),
    textureOptions: farmService.getTextureOptions(),
    cropPreferences: farmService.getCropPreferences(),
  }
}

export function useMarketData(crop = 'Tomato') {
  const { data, loading, error, retry } = useAsyncData(
    () => marketService.getMarketData(crop),
    [crop]
  )

  return {
    loading,
    error,
    retry,
    data: data?.data,
    crop: data?.crop ?? crop,
  }
}

export function useRecommendations() {
  const { data, loading, error, retry } = useAsyncData(
    () => recommendationsService.getRecommendations(),
    []
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
  }
}

export function useCommunityData() {
  const { data, loading, error, retry } = useAsyncData(
    () => communityService.getDistrictData(),
    []
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
