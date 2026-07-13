import { apiConfig, backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'
import { farmers } from '../mock/data'
import { isSuperAdminEmail } from '../../lib/roles'

export const authService = {
  async login({ email, password }) {
    if (apiConfig.useMock) {
      await withMockDelay(null)
      if (isSuperAdminEmail(email)) {
        return {
          user: {
            id: 'mock-admin',
            name: 'Super Admin',
            email: email.trim().toLowerCase(),
            role: 'admin',
          },
          token: 'mock-admin-token',
        }
      }
      const farmer = farmers.find((f) => f.email === email) || { ...farmers[0], email }
      return { user: { ...farmer, role: 'farmer' }, token: 'mock-token' }
    }

    return backendClient.post(backendEndpoints.auth.login, { email, password })
  },

  async register(payload) {
    if (apiConfig.useMock) {
      await withMockDelay(null)
      const isAdmin = isSuperAdminEmail(payload.email)
      return {
        user: {
          id: Date.now(),
          name: payload.name,
          email: payload.email,
          role: isAdmin ? 'admin' : 'farmer',
          region: payload.region,
          farmSize: payload.farmSize,
          location: payload.location,
        },
        token: isAdmin ? 'mock-admin-token' : 'mock-token',
      }
    }

    return backendClient.post(backendEndpoints.auth.register, payload)
  },

  async getProfile() {
    if (apiConfig.useMock) {
      return withMockDelay({
        user: { ...farmers[0], role: 'farmer' },
        account: { email: farmers[0].email, createdAt: new Date().toISOString() },
        savedData: { soilReadingsCount: 0, recommendationRunsCount: 0, hasSoilData: false },
      })
    }
    return backendClient.get(backendEndpoints.auth.me)
  },

  async forgotPassword(email) {
    if (apiConfig.useMock) {
      return withMockDelay({
        message: 'If that email is registered, we sent a password reset link.',
        emailSent: false,
        devResetUrl: '/reset-password?token=mock-dev-token',
      })
    }
    return backendClient.post(backendEndpoints.auth.forgotPassword, { email })
  },

  async resetPassword({ token, password }) {
    if (apiConfig.useMock) {
      return withMockDelay({ message: 'Password updated. You can sign in with your new password.' })
    }
    return backendClient.post(backendEndpoints.auth.resetPassword, { token, password })
  },
}
