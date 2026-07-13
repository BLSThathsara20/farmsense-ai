import { apiConfig } from '../config'

const SERVICE = 'geolocation'

const GEO_MESSAGES = {
  1: 'Location access was denied. Search or enter a postcode instead.',
  2: 'Could not determine your location. Try again or search manually.',
  3: 'Location request timed out. Please try again.',
}

/**
 * Browser Geolocation API connector.
 * @returns {Promise<{ lat: number, lng: number, accuracy: number }>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(GEO_MESSAGES[err.code] || 'Unable to get your location')),
      apiConfig.external.geolocation
    )
  })
}

export { SERVICE as geolocationService }
