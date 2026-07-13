import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'

export const soilService = {
  async submitSoil(payload, idempotencyKey) {
    if (apiConfig.useMock) {
      return withMockDelay({
        soilReadingId: `mock-${Date.now()}`,
        recommendations: {
          recommendations: [],
          topRecommendation: null,
          runDate: new Date().toISOString(),
        },
      })
    }

    return backendClient.post(backendEndpoints.soil, payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    })
  },
}
