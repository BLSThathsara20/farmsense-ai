import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'
import {
  dashboardStats,
  recommendations,
  soilReadings,
  farmers,
} from '../mock/data'

export const dashboardService = {
  async getDashboard() {
    if (apiConfig.useMock) {
      return withMockDelay({
        stats: dashboardStats,
        topRecommendation: recommendations[0],
        recommendations,
        soilReadings,
        currentFarmer: farmers[0],
        hasSoilData: true,
      })
    }

    return backendClient.get(backendEndpoints.dashboard)
  },
}
