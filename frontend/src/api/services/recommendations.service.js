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
        planStatus: 'draft',
        finalized: false,
        selectedCrops: [],
      })
    }

    return backendClient.get(backendEndpoints.recommendations)
  },

  async confirmPlan(cropIds) {
    if (apiConfig.useMock) {
      const selected = recommendations.filter((r) => cropIds.includes(r.id))
      return withMockDelay({
        recommendations,
        topRecommendation: selected[0] || recommendations[0],
        selectedCrops: selected,
        planStatus: 'finalized',
        finalized: true,
        finalizedAt: new Date().toISOString(),
        runDate: new Date().toISOString(),
      })
    }

    return backendClient.post(backendEndpoints.confirmPlan, { cropIds })
  },

  async deletePlan() {
    if (apiConfig.useMock) {
      return withMockDelay({ deleted: true, runsDeleted: 1 })
    }
    return backendClient.delete(backendEndpoints.deletePlan)
  },
}
