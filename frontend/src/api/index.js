/**
 * FarmSense AI — unified API layer
 *
 * Architecture:
 *   config.js          → URLs, timeouts, feature flags (single source of truth)
 *   client.js          → Shared HTTP client (all fetch goes through here)
 *   external/          → Third-party connectors (Nominatim, postcodes.io, GPS)
 *   backend/           → FarmSense FastAPI client
 *   mock/              → Mock data + utilities (dev until backend is ready)
 *   services/          → Domain services (what pages/hooks should import)
 *
 * Usage in components/hooks:
 *   import { locationService, dashboardService } from '@/api'
 *   // or
 *   import { locationService } from '../api/services/location.service'
 */

export { apiConfig, backendEndpoints } from './config'
export { ApiError, getErrorMessage } from './errors'
export { apiRequest, buildUrl } from './client'

export * from './external'
export { backendClient } from './backend/client'

export {
  locationService,
  authService,
  dashboardService,
  recommendationsService,
  marketService,
  communityService,
  farmService,
  soilService,
  systemService,
} from './services'
