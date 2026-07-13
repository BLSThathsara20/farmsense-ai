import { getCurrentPosition } from '../external/geolocation.connector'
import { reverseGeocode, searchPlaces } from '../external/nominatim.connector'
import { lookupPostcode, isUkPostcode } from '../external/postcodes.connector'

/**
 * Location domain service — orchestrates geolocation + external geocoding APIs.
 * UI components should call this, never connectors directly.
 */
export const locationService = {
  getCurrentPosition,
  reverseGeocode,
  searchLocations: searchPlaces,
  lookupUkPostcode: lookupPostcode,
  isUkPostcode,

  async resolveCurrentLocation() {
    const coords = await getCurrentPosition()
    return reverseGeocode(coords.lat, coords.lng)
  },
}
