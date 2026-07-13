import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'
import { recommendations } from '../mock/data'

export const recommendationsService = {
  async getRecommendations() {
    if (apiConfig.useMock) {
      return withMockDelay({
        recommendations,
        topRecommendation: recommendations[0],
        runDate: new Date().toISOString(),
      })
    }

    return backendClient.get(backendEndpoints.recommendations)
  },
}
