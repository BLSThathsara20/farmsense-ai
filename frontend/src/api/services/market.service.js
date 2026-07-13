import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'
import { marketData, crops, generatePriceData } from '../mock/data'

export const marketService = {
  async getMarketData(crop = 'Tomato') {
    if (apiConfig.useMock) {
      return withMockDelay({
        crop,
        data: marketData[crop] || marketData.Tomato,
      })
    }

    return backendClient.get(backendEndpoints.market, { crop })
  },

  async getCrops() {
    if (apiConfig.useMock) {
      return withMockDelay(crops)
    }

    return backendClient.get(`${backendEndpoints.market}/crops`)
  },

  generatePriceData,
}
