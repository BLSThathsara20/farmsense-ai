/**
 * Central configuration for all API and external service connections.
 * Change providers, URLs, and feature flags here only.
 */
export const apiConfig = {
  /** Opt-in only. Backend is the default source of truth. */
  useMock: import.meta.env.VITE_USE_MOCK_API === 'true',

  /** Reserved super-admin email (first register sets password) */
  superAdminEmail: (
    import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'blsthathsara@gmail.com'
  )
    .trim()
    .toLowerCase(),

  /** FarmSense FastAPI backend */
  backend: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 15000,
  },

  /** Artificial delay when using mocks (ms) — simulates network latency */
  mockDelay: Number(import.meta.env.VITE_MOCK_DELAY) || 600,

  /** Third-party external services */
  external: {
    nominatim: {
      baseUrl: 'https://nominatim.openstreetmap.org',
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    },
    postcodesIo: {
      baseUrl: 'https://api.postcodes.io',
      timeout: 8000,
      headers: {
        Accept: 'application/json',
      },
    },
    geolocation: {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    },
  },
}

export const backendEndpoints = {
  health: '/health',
  healthReady: '/health/ready',
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  dashboard: '/dashboard',
  recommendations: '/recommendations',
  confirmPlan: '/recommendations/confirm',
  deletePlan: '/recommendations/plan',
  market: '/market',
  community: '/community',
  soil: '/soil',
  admin: {
    overview: '/admin/overview',
    analytics: '/admin/analytics',
    farmers: '/admin/farmers',
    farmer: (id) => `/admin/farmers/${id}`,
    modelsStatus: '/admin/models/status',
    modelsTest: '/admin/models/test',
  },
}
