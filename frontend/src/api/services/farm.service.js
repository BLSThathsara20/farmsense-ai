import {
  textureOptions,
  cropPreferences,
  regions,
} from '../mock/data'

/**
 * Static farm form options and reference data.
 * When backend provides these, swap mock imports for API calls here.
 */
export const farmService = {
  getTextureOptions: () => textureOptions,
  getCropPreferences: () => cropPreferences,
  getRegions: () => regions,
}
