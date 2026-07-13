export const farmers = [
  {
    id: 1,
    name: 'Savindu',
    email: 'savindu@example.com',
    region: 'Central Province, Sri Lanka',
    country: 'LK',
    farmSize: 2.5,
    district: 'Kandy',
  },
  {
    id: 2,
    name: 'Maria',
    email: 'maria@example.com',
    region: 'Nairobi County, Kenya',
    country: 'KE',
    farmSize: 5,
    district: 'Nairobi East',
  },
  {
    id: 3,
    name: 'Rajesh',
    email: 'rajesh@example.com',
    region: 'Punjab, India',
    country: 'IN',
    farmSize: 8,
    district: 'Ludhiana',
  },
]

export const crops = ['Tomato', 'Chili', 'Onion', 'Carrot', 'Cabbage', 'Potato', 'Maize', 'Beans']

export const recommendations = [
  {
    id: 1,
    crop: 'Tomato',
    confidence: 92,
    profitEstimate: 4200,
    soilMatch: 94,
    weatherFit: 88,
    priceTrend: 76,
    demandSignal: 85,
    plantingWindow: { sow: 'Week 3–4', harvest: 'Week 14–16', sell: 'Week 8–10' },
    oversupplyRisk: 0.15,
    reasoning: 'Your soil pH and NPK levels are ideal for tomato cultivation in your region.',
    rank: 1,
  },
  {
    id: 2,
    crop: 'Chili',
    confidence: 84,
    profitEstimate: 3800,
    soilMatch: 86,
    weatherFit: 82,
    priceTrend: 91,
    demandSignal: 78,
    plantingWindow: { sow: 'Week 2–3', harvest: 'Week 12–14', sell: 'Week 10–12' },
    oversupplyRisk: 0.22,
    reasoning: 'Strong market demand with good soil compatibility.',
    rank: 2,
  },
  {
    id: 3,
    crop: 'Onion',
    confidence: 78,
    profitEstimate: 2900,
    soilMatch: 80,
    weatherFit: 75,
    priceTrend: 68,
    demandSignal: 72,
    plantingWindow: { sow: 'Week 4–5', harvest: 'Week 16–18', sell: 'Week 14–16' },
    oversupplyRisk: 0.45,
    reasoning: 'Moderate suitability — consider market timing carefully.',
    rank: 3,
  },
  {
    id: 4,
    crop: 'Carrot',
    confidence: 71,
    profitEstimate: 2400,
    soilMatch: 74,
    weatherFit: 70,
    priceTrend: 65,
    demandSignal: 68,
    plantingWindow: { sow: 'Week 5–6', harvest: 'Week 15–17', sell: 'Week 13–15' },
    oversupplyRisk: 0.35,
    reasoning: 'Loamy soil texture supports root crop development.',
    rank: 4,
  },
  {
    id: 5,
    crop: 'Cabbage',
    confidence: 65,
    profitEstimate: 2100,
    soilMatch: 68,
    weatherFit: 72,
    priceTrend: 58,
    demandSignal: 60,
    plantingWindow: { sow: 'Week 3–4', harvest: 'Week 12–14', sell: 'Week 10–12' },
    oversupplyRisk: 0.72,
    reasoning: 'High oversupply risk in your district this season.',
    rank: 5,
  },
]

export function generatePriceData(crop, weeks = 12) {
  const basePrices = {
    Tomato: 45,
    Chili: 62,
    Onion: 38,
    Carrot: 28,
    Cabbage: 22,
    Potato: 32,
    Maize: 18,
    Beans: 35,
  }
  const base = basePrices[crop] || 40
  const seed = crop.length
  const data = []

  for (let i = -6; i < weeks - 6; i++) {
    const isForecast = i >= 0
    const variance = Math.sin(i * 0.8 + seed) * 5 + ((seed * (i + 7)) % 5)
    const trend = i * 0.4
    data.push({
      week: i < 0 ? `W${i + 7}` : `W${i + 1}`,
      weekNum: i,
      price: Math.round((base + variance + trend) * 10) / 10,
      forecast: isForecast ? Math.round((base + variance + trend + 2) * 10) / 10 : null,
      lower: isForecast ? Math.round((base + variance + trend - 3) * 10) / 10 : null,
      upper: isForecast ? Math.round((base + variance + trend + 5) * 10) / 10 : null,
      isForecast,
    })
  }

  return data
}

export const marketData = {
  Tomato: {
    currentPrice: 52.4,
    trend: 7.2,
    sellVerdict: 'good',
    sellMessage: 'Prices are rising — good time to sell within the next 2 weeks.',
    demand: { googleTrends: 'Rising', reddit: 'Positive sentiment' },
    weeklyPrices: generatePriceData('Tomato'),
  },
  Chili: {
    currentPrice: 68.1,
    trend: 12.5,
    sellVerdict: 'good',
    sellMessage: 'Strong demand signal — sell window is open.',
    demand: { googleTrends: 'Rising', reddit: 'Positive sentiment' },
    weeklyPrices: generatePriceData('Chili'),
  },
  Onion: {
    currentPrice: 41.2,
    trend: -3.1,
    sellVerdict: 'wait',
    sellMessage: 'Prices dipping — consider waiting 2–3 weeks.',
    demand: { googleTrends: 'Stable', reddit: 'Mixed sentiment' },
    weeklyPrices: generatePriceData('Onion'),
  },
  Carrot: {
    currentPrice: 31.8,
    trend: 2.4,
    sellVerdict: 'wait',
    sellMessage: 'Moderate trend — monitor for next week.',
    demand: { googleTrends: 'Stable', reddit: 'Neutral' },
    weeklyPrices: generatePriceData('Carrot'),
  },
  Cabbage: {
    currentPrice: 19.5,
    trend: -8.4,
    sellVerdict: 'avoid',
    sellMessage: 'Oversupply pushing prices down — hold if possible.',
    demand: { googleTrends: 'Declining', reddit: 'Negative sentiment' },
    weeklyPrices: generatePriceData('Cabbage'),
  },
}

export const districtData = {
  district: 'Kandy',
  week: 'Week 7',
  cropPopularity: [
    { crop: 'Tomato', percentage: 34, farmers: 128 },
    { crop: 'Chili', percentage: 22, farmers: 83 },
    { crop: 'Onion', percentage: 18, farmers: 68 },
    { crop: 'Carrot', percentage: 12, farmers: 45 },
    { crop: 'Cabbage', percentage: 8, farmers: 30 },
    { crop: 'Other', percentage: 6, farmers: 22 },
  ],
  oversupplyRisk: [
    { crop: 'Cabbage', risk: 0.72, level: 'high' },
    { crop: 'Onion', risk: 0.45, level: 'medium' },
    { crop: 'Carrot', risk: 0.35, level: 'medium' },
    { crop: 'Tomato', risk: 0.15, level: 'low' },
    { crop: 'Chili', risk: 0.22, level: 'low' },
  ],
}

export const soilReadings = {
  region: 'Central Province, Sri Lanka',
  area: 2.5,
  nitrogen: 65,
  phosphorus: 45,
  potassium: 70,
  ph: 6.5,
  texture: 'Loamy',
  preferences: ['Tomato', 'Chili'],
  lastUpdated: '2026-06-28T08:30:00Z',
}

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

export const dashboardStats = {
  topCropScore: 92,
  priceTrend: 7.2,
  demandSignal: 'Rising',
  sellWindow: { start: 8, end: 10 },
  oversupplyWarning: {
    crop: 'Cabbage',
    risk: 0.72,
    message: 'High cabbage planting in your district — consider alternatives.',
  },
  recentActivity: [
    { type: 'soil', message: 'Soil reading updated', date: '2026-06-28' },
    { type: 'recommendation', message: 'Crop plan generated', date: '2026-06-28' },
  ],
}
