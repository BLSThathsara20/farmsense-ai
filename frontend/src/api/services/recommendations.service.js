import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'
import { recommendations } from '../mock/data'

const mockPlanId = 'mock-plan-1'

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
        planId: mockPlanId,
        runId: mockPlanId,
        title: 'Plan · Tomato · Mock',
      })
    }

    return backendClient.get(backendEndpoints.recommendations)
  },

  async listPlans() {
    if (apiConfig.useMock) {
      return withMockDelay({
        plans: [
          {
            planId: mockPlanId,
            runId: mockPlanId,
            title: 'Plan · Tomato · Mock',
            planStatus: 'draft',
            finalized: false,
            topCrop: 'Tomato',
            selectedCrops: [],
            createdAt: new Date().toISOString(),
          },
        ],
      })
    }
    return backendClient.get(backendEndpoints.plans)
  },

  async getPlansOverview() {
    if (apiConfig.useMock) {
      return withMockDelay({
        totalPlans: 1,
        draftCount: 1,
        finalizedCount: 0,
        allSelectedCrops: [],
        plans: [],
        latestPlanId: mockPlanId,
        latestActivity: [],
      })
    }
    return backendClient.get(backendEndpoints.plansOverview)
  },

  async getPlan(planId) {
    if (apiConfig.useMock) {
      return withMockDelay({
        recommendations,
        topRecommendation: recommendations[0],
        runDate: new Date().toISOString(),
        planStatus: 'draft',
        finalized: false,
        selectedCrops: [],
        planId,
        runId: planId,
        title: 'Plan · Tomato · Mock',
      })
    }
    return backendClient.get(backendEndpoints.plan(planId))
  },

  async confirmPlan(cropIds, planId) {
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
        planId: planId || mockPlanId,
        runId: planId || mockPlanId,
      })
    }

    if (planId) {
      return backendClient.post(backendEndpoints.confirmPlanById(planId), { cropIds })
    }
    return backendClient.post(backendEndpoints.confirmPlan, { cropIds })
  },

  async renamePlan(planId, title) {
    if (apiConfig.useMock) {
      return withMockDelay({ planId, title })
    }
    return backendClient.patch(backendEndpoints.plan(planId), { title })
  },

  async deletePlan(planId) {
    if (apiConfig.useMock) {
      return withMockDelay({ deleted: true, runsDeleted: 1, planId })
    }
    if (planId) {
      return backendClient.delete(backendEndpoints.plan(planId))
    }
    return backendClient.delete(backendEndpoints.deletePlan)
  },
}
