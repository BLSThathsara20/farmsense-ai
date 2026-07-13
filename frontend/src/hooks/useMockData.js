import {
  dashboardService,
  recommendationsService,
  marketService,
  communityService,
  farmService,
} from '../api'
import { useAsyncData } from './useAsyncData'

/** @deprecated Use specific hooks below. Kept for backward compatibility. */
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
    getPriceData: marketService.generatePriceData,
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

import { crops } from '../api/mock/data'

export function useCrops() {
  return crops
}
