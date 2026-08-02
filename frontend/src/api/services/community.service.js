import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'
import { districtData } from '../mock/data'

export const communityService = {
  async getDistrictData() {
    if (apiConfig.useMock) {
      return withMockDelay({ ...districtData, empty: false, demo: true })
    }

    return backendClient.get(backendEndpoints.community)
  },
}
