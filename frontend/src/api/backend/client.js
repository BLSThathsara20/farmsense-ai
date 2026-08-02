import { apiConfig, backendEndpoints } from '../config'
import { apiRequest, buildUrl } from '../client'

const { baseUrl, timeout } = apiConfig.backend

function getStoredToken() {
  try {
    const raw = localStorage.getItem('farmsense-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token || null
  } catch {
    return null
  }
}

function request(path, options = {}) {
  const url = buildUrl(baseUrl, path, options.params)
  const token = getStoredToken()
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
  return apiRequest(url, {
    ...options,
    timeout: options.timeout ?? timeout,
    service: 'farmsense-backend',
    headers: { ...authHeader, ...(options.headers || {}) },
  })
}

export const backendClient = {
  get: (path, params, options = {}) =>
    request(path, { method: 'GET', params, timeout: options.timeout }),
  post: (path, body, options = {}) =>
    request(path, {
      method: 'POST',
      body,
      headers: options.headers,
      timeout: options.timeout,
    }),
  put: (path, body, options = {}) =>
    request(path, { method: 'PUT', body, timeout: options.timeout }),
  patch: (path, body, options = {}) =>
    request(path, { method: 'PATCH', body, timeout: options.timeout }),
  delete: (path, options = {}) =>
    request(path, { method: 'DELETE', timeout: options.timeout }),
}

export { backendEndpoints }
