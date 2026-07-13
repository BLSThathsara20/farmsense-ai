import { apiConfig } from '../config'
import { apiRequest, buildUrl } from '../client'

const SERVICE = 'postcodes.io'
const { baseUrl, timeout, headers } = apiConfig.external.postcodesIo

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

export function isUkPostcode(value) {
  return UK_POSTCODE_RE.test(value.trim())
}

function formatPostcodeResult(result) {
  const parts = [
    result.admin_ward || result.parish,
    result.admin_district,
    result.region,
    result.country,
  ]
  return parts.filter(Boolean).join(', ')
}

/** @param {string} postcode */
export async function lookupPostcode(postcode) {
  const normalised = postcode.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!isUkPostcode(normalised)) {
    throw new Error('Enter a valid UK postcode (e.g. NE1 4LP)')
  }

  const encoded = encodeURIComponent(normalised.replace(/\s/g, ''))
  const url = buildUrl(baseUrl, `/postcodes/${encoded}`)

  const json = await apiRequest(url, { headers, timeout, service: SERVICE })
  if (!json.result) {
    throw new Error(json.error || 'Postcode not found')
  }

  const r = json.result
  return {
    label: formatPostcodeResult(r),
    lat: r.latitude,
    lng: r.longitude,
    postcode: r.postcode,
    country: 'GB',
    adminDistrict: r.admin_district,
    region: r.region,
    source: 'postcode',
  }
}

export { SERVICE as postcodesService }
