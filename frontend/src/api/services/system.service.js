import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'

export const systemService = {
  async getHealth() {
    return backendClient.get(backendEndpoints.health)
  },

  async getReadiness() {
    return backendClient.get(backendEndpoints.healthReady)
  },

  async getStatus() {
    const [health, ready] = await Promise.all([
      this.getHealth().catch((e) => ({ status: 'error', error: e.message })),
      this.getReadiness().catch((e) => ({
        status: 'error',
        database: false,
        ml_model: false,
        error: e.message,
      })),
    ])
    return {
      api: health,
      ready,
      mockMode: apiConfig.useMock,
      backendUrl: apiConfig.backend.baseUrl,
      checkedAt: new Date().toISOString(),
    }
  },
}
