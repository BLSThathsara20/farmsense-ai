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
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body, options = {}) =>
    request(path, { method: 'POST', body, headers: options.headers }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

export { backendEndpoints }
