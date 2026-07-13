/**
 * Static form options for the Plan wizard.
 * These are UI enums (not mock API responses). Live crop lists for Market
 * come from GET /market/crops on the backend.
 */

export const regions = [
  { value: 'lk-central', label: 'Central Province, Sri Lanka', flag: '🇱🇰' },
  { value: 'ke-nairobi', label: 'Nairobi County, Kenya', flag: '🇰🇪' },
  { value: 'in-punjab', label: 'Punjab, India', flag: '🇮🇳' },
  { value: 'ng-lagos', label: 'Lagos State, Nigeria', flag: '🇳🇬' },
  { value: 'ph-mindanao', label: 'Mindanao, Philippines', flag: '🇵🇭' },
  { value: 'vn-mekong', label: 'Mekong Delta, Vietnam', flag: '🇻🇳' },
]

export const textureOptions = [
  { value: 'Sandy', label: 'Sandy', description: 'Drains quickly, low nutrients' },
  { value: 'Loamy', label: 'Loamy', description: 'Balanced — ideal for most crops' },
  { value: 'Clay', label: 'Clay', description: 'Holds water, rich in nutrients' },
  { value: 'Silty', label: 'Silty', description: 'Fine particles, good fertility' },
]

export const cropPreferences = [
  'Tomato',
  'Chili',
  'Onion',
  'Carrot',
  'Cabbage',
  'Potato',
  'Maize',
  'Beans',
  'No preference',
]
