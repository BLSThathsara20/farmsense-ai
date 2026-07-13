import { textureOptions, cropPreferences, regions } from '../../constants/farmOptions'

/**
 * Static farm form options (Plan wizard enums).
 * Live recommendations / market / community data come from backend services.
 */
export const farmService = {
  getTextureOptions: () => textureOptions,
  getCropPreferences: () => cropPreferences,
  getRegions: () => regions,
}
