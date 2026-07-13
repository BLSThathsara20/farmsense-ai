import { ApiError } from './errors'

/**
 * Shared HTTP client for all outbound requests (backend + external APIs).
 * Connectors and backend client both use this — never call fetch() directly elsewhere.
 */
export async function apiRequest(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 15000,
    service = 'api',
    parseJson = true,
  } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (!parseJson) {
      if (!res.ok) throw ApiError.fromResponse(res, {}, service)
      return res
    }

    const text = await res.text()
    const data = text ? JSON.parse(text) : null

    if (!res.ok) {
      throw ApiError.fromResponse(res, data, service)
    }

    return data
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.timeout(service)
    if (err instanceof ApiError) throw err
    throw ApiError.network(service)
  } finally {
    clearTimeout(timer)
  }
}

export function buildUrl(base, path, params) {
  const url = new URL(path, base)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}
