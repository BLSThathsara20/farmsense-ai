import { apiConfig } from '../config'
import { apiRequest, buildUrl } from '../client'

const SERVICE = 'nominatim'
const { baseUrl, timeout, headers } = apiConfig.external.nominatim

function formatAddress(data) {
  const a = data.address || {}
  const parts = [
    a.city || a.town || a.village || a.hamlet || a.suburb,
    a.county || a.state_district || a.state,
    a.country,
  ].filter(Boolean)
  return parts.join(', ') || data.display_name
}

function mapSearchResult(item) {
  return {
    id: item.place_id,
    label: formatAddress(item),
    fullLabel: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    country: item.address?.country_code?.toUpperCase(),
    source: 'search',
  }
}

/** @param {number} lat @param {number} lng */
export async function reverseGeocode(lat, lng) {
  const url = buildUrl(baseUrl, '/reverse', {
    lat,
    lon: lng,
    format: 'json',
    addressdetails: '1',
    zoom: '12',
  })

  const data = await apiRequest(url, { headers, timeout, service: SERVICE })
  if (!data?.display_name) throw new Error('No address found for this location')

  return {
    label: formatAddress(data),
    lat,
    lng,
    country: data.address?.country_code?.toUpperCase(),
    source: 'gps',
  }
}

/** @param {string} query */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return []

  const url = buildUrl(baseUrl, '/search', {
    q: query.trim(),
    format: 'json',
    addressdetails: '1',
    limit: '6',
  })

  const data = await apiRequest(url, { headers, timeout, service: SERVICE })
  return data.map(mapSearchResult)
}

export { SERVICE as nominatimService }
