import { ApiError } from '../api/errors'
import { apiConfig } from '../api/config'

export const SUPPORT_CONTACT_EMAIL =
  apiConfig.superAdminEmail || 'blsthathsara@gmail.com'

/**
 * Map API / network failures into a simple user-facing message.
 * No technical URLs, HTTP codes, or backend troubleshooting copy.
 */
export function describeServiceError(err, { action = 'complete this request' } = {}) {
  const status = err instanceof ApiError ? err.status : err?.status
  const code = err instanceof ApiError ? err.code : err?.code
  const message =
    (err instanceof ApiError && err.message) ||
    (typeof err?.message === 'string' ? err.message : null)

  if (code === 'NETWORK' || (!status && code === 'NETWORK') || code === 'TIMEOUT') {
    return {
      kind: 'connectivity',
      title: 'Something went wrong',
      description: `We could not ${action} right now.`,
      contactEmail: SUPPORT_CONTACT_EMAIL,
    }
  }

  if (status === 404 || status === 502 || status === 503 || status === 504 || status >= 500) {
    return {
      kind: 'server',
      title: 'Service temporarily unavailable',
      description: 'FarmSense is having trouble right now. This is not your fault.',
      contactEmail: SUPPORT_CONTACT_EMAIL,
    }
  }

  return {
    kind: 'auth',
    title: 'Sign in failed',
    description: message || 'Could not sign in. Please try again.',
    contactEmail: null,
  }
}

export function isServiceOutageError(info) {
  return info?.kind === 'connectivity' || info?.kind === 'server'
}
