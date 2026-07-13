export class ApiError extends Error {
  constructor(message, { status, code, data, service } = {}) {
    super(typeof message === 'string' ? message : stringifyError(message))
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
    this.service = service
  }

  static fromResponse(res, body, service) {
    const message = extractErrorMessage(body, res.status)
    const code =
      (typeof body?.error === 'object' && body.error?.code) ||
      body?.code ||
      undefined
    return new ApiError(message, {
      status: res.status,
      code,
      data: body,
      service,
    })
  }

  static timeout(service) {
    return new ApiError('Request timed out. Please try again.', { code: 'TIMEOUT', service })
  }

  static network(service) {
    return new ApiError('Network error. Check your connection.', { code: 'NETWORK', service })
  }
}

/** Turn any thrown value into a short string for toasts / UI. */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  if (typeof err === 'string' && err.trim()) return err
  if (err instanceof ApiError && err.message) return err.message
  if (err instanceof Error && typeof err.message === 'string' && err.message !== '[object Object]') {
    return err.message
  }
  if (err?.data) {
    const nested = extractErrorMessage(err.data, err.status)
    if (nested) return nested
  }
  return fallback
}

function extractErrorMessage(body, status) {
  if (!body) return defaultStatusMessage(status)

  // FarmSense shape: { error: { code, message } }
  if (typeof body.error === 'object' && body.error !== null) {
    if (typeof body.error.message === 'string' && body.error.message.trim()) {
      return body.error.message
    }
  }

  if (typeof body.error === 'string' && body.error.trim()) return body.error
  if (typeof body.message === 'string' && body.message.trim()) return body.message

  // FastAPI validation: { detail: "..." } or { detail: [{ msg, loc }] }
  if (typeof body.detail === 'string' && body.detail.trim()) return body.detail
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    return body.detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item?.msg) {
          const field = Array.isArray(item.loc) ? item.loc.filter((p) => p !== 'body').join('.') : ''
          return field ? `${field}: ${item.msg}` : item.msg
        }
        return null
      })
      .filter(Boolean)
      .join('. ') || defaultStatusMessage(status)
  }

  return defaultStatusMessage(status)
}

function defaultStatusMessage(status) {
  if (status === 401) return 'Invalid email or password'
  if (status === 403) return 'You do not have permission to do that'
  if (status === 404) return 'Not found'
  if (status === 409) return 'That account or resource already exists'
  if (status === 422) return 'Please check your details and try again'
  if (status === 429) return 'Too many requests. Please wait a moment'
  if (status >= 500) return 'Server error. Please try again shortly'
  return `Request failed (${status || 'unknown'})`
}

function stringifyError(value) {
  if (value == null) return 'Unknown error'
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value.message === 'string') return value.message
    try {
      return JSON.stringify(value)
    } catch {
      return 'Unknown error'
    }
  }
  return String(value)
}
