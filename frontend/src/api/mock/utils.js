import { apiConfig } from '../config'

export const simulateDelay = (ms = apiConfig.mockDelay) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export async function withMockDelay(data, ms) {
  await simulateDelay(ms)
  return data
}
