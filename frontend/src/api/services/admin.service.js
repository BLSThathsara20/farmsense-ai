import { backendEndpoints } from '../config'
import { backendClient } from '../backend/client'
import { withMockDelay } from '../mock/utils'

/** Sample-only farmers for Dummy mode (never mixed into Live). */
const mockFarmers = [
  {
    id: 'mock-f1',
    name: 'Alex Farmer',
    email: 'alex.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-01-10T10:00:00Z',
    lastLoginAt: '2026-07-12T08:00:00Z',
    district: 'Northumberland',
    region: 'Northumberland',
    farmSize: 4.5,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 2,
    hasRecommendations: true,
    planStatus: 'finalized',
    finalized: true,
    topCrop: 'Tomato',
    lastPlanAt: '2026-07-11T12:00:00Z',
  },
  {
    id: 'mock-f2',
    name: 'Sam Grower',
    email: 'sam.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-03-02T10:00:00Z',
    lastLoginAt: null,
    district: 'Cumbria',
    region: 'Cumbria',
    farmSize: 2,
    countryCode: 'GB',
    hasSoilData: false,
    soilReadingsCount: 0,
    hasRecommendations: false,
    planStatus: 'none',
    finalized: false,
    topCrop: null,
    lastPlanAt: null,
  },
  {
    id: 'mock-f3',
    name: 'Jordan Fields',
    email: 'jordan.demo@farmsense.local',
    isActive: false,
    createdAt: '2026-02-14T10:00:00Z',
    lastLoginAt: '2026-04-01T09:00:00Z',
    district: 'North Yorkshire',
    region: 'North Yorkshire',
    farmSize: 8,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 1,
    hasRecommendations: true,
    planStatus: 'draft',
    finalized: false,
    topCrop: 'Maize',
    lastPlanAt: '2026-06-20T12:00:00Z',
  },
  {
    id: 'mock-f4',
    name: 'Priya Mehta',
    email: 'priya.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-01-22T11:30:00Z',
    lastLoginAt: '2026-07-10T07:15:00Z',
    district: 'County Durham',
    region: 'County Durham',
    farmSize: 6.2,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 3,
    hasRecommendations: true,
    planStatus: 'finalized',
    finalized: true,
    topCrop: 'Potato',
    lastPlanAt: '2026-07-09T16:00:00Z',
  },
  {
    id: 'mock-f5',
    name: 'Chris Bancroft',
    email: 'chris.demo@farmsense.local',
    isActive: true,
    createdAt: '2025-11-05T09:00:00Z',
    lastLoginAt: '2026-07-08T18:40:00Z',
    district: 'Lancashire',
    region: 'Lancashire',
    farmSize: 12,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 4,
    hasRecommendations: true,
    planStatus: 'finalized',
    finalized: true,
    topCrop: 'Wheat',
    lastPlanAt: '2026-07-07T10:20:00Z',
  },
  {
    id: 'mock-f6',
    name: 'Helen Crowe',
    email: 'helen.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-04-18T14:00:00Z',
    lastLoginAt: '2026-07-01T12:00:00Z',
    district: 'Lincolnshire',
    region: 'Lincolnshire',
    farmSize: 18.5,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 2,
    hasRecommendations: true,
    planStatus: 'draft',
    finalized: false,
    topCrop: 'Cabbage',
    lastPlanAt: '2026-06-28T09:45:00Z',
  },
  {
    id: 'mock-f7',
    name: 'Owen Hughes',
    email: 'owen.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-02-01T08:20:00Z',
    lastLoginAt: '2026-06-30T11:10:00Z',
    district: 'Norfolk',
    region: 'Norfolk',
    farmSize: 9.1,
    countryCode: 'GB',
    hasSoilData: false,
    soilReadingsCount: 0,
    hasRecommendations: false,
    planStatus: 'none',
    finalized: false,
    topCrop: null,
    lastPlanAt: null,
  },
  {
    id: 'mock-f8',
    name: 'Megan Shaw',
    email: 'megan.demo@farmsense.local',
    isActive: true,
    createdAt: '2025-12-12T16:45:00Z',
    lastLoginAt: '2026-07-11T06:55:00Z',
    district: 'Cambridgeshire',
    region: 'Cambridgeshire',
    farmSize: 5.4,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 1,
    hasRecommendations: true,
    planStatus: 'finalized',
    finalized: true,
    topCrop: 'Carrot',
    lastPlanAt: '2026-07-05T14:30:00Z',
  },
  {
    id: 'mock-f9',
    name: 'David Kerr',
    email: 'david.demo@farmsense.local',
    isActive: false,
    createdAt: '2026-03-28T10:00:00Z',
    lastLoginAt: '2026-05-02T09:00:00Z',
    district: 'East Riding of Yorkshire',
    region: 'East Riding of Yorkshire',
    farmSize: 14,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 2,
    hasRecommendations: true,
    planStatus: 'draft',
    finalized: false,
    topCrop: 'Barley',
    lastPlanAt: '2026-05-01T13:00:00Z',
  },
  {
    id: 'mock-f10',
    name: 'Aisha Khan',
    email: 'aisha.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-05-09T12:00:00Z',
    lastLoginAt: '2026-07-13T08:05:00Z',
    district: 'Kent',
    region: 'Kent',
    farmSize: 3.2,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 1,
    hasRecommendations: true,
    planStatus: 'finalized',
    finalized: true,
    topCrop: 'Apple',
    lastPlanAt: '2026-07-12T17:00:00Z',
  },
  {
    id: 'mock-f11',
    name: 'Tom Reid',
    email: 'tom.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-01-30T09:40:00Z',
    lastLoginAt: '2026-07-04T19:20:00Z',
    district: 'Devon',
    region: 'Devon',
    farmSize: 7.8,
    countryCode: 'GB',
    hasSoilData: false,
    soilReadingsCount: 0,
    hasRecommendations: false,
    planStatus: 'none',
    finalized: false,
    topCrop: null,
    lastPlanAt: null,
  },
  {
    id: 'mock-f12',
    name: 'Lucy Byrne',
    email: 'lucy.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-04-02T15:10:00Z',
    lastLoginAt: '2026-07-06T10:00:00Z',
    district: 'Herefordshire',
    region: 'Herefordshire',
    farmSize: 11,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 2,
    hasRecommendations: true,
    planStatus: 'draft',
    finalized: false,
    topCrop: 'Hop',
    lastPlanAt: '2026-07-03T11:25:00Z',
  },
  {
    id: 'mock-f13',
    name: 'Noah Patel',
    email: 'noah.demo@farmsense.local',
    isActive: true,
    createdAt: '2025-10-20T08:00:00Z',
    lastLoginAt: '2026-06-22T07:30:00Z',
    district: 'Shropshire',
    region: 'Shropshire',
    farmSize: 15.5,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 5,
    hasRecommendations: true,
    planStatus: 'finalized',
    finalized: true,
    topCrop: 'Onion',
    lastPlanAt: '2026-06-21T15:40:00Z',
  },
  {
    id: 'mock-f14',
    name: 'Rachel Ng',
    email: 'rachel.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-06-01T13:20:00Z',
    lastLoginAt: null,
    district: 'Greater London',
    region: 'Greater London',
    farmSize: 0.8,
    countryCode: 'GB',
    hasSoilData: false,
    soilReadingsCount: 0,
    hasRecommendations: false,
    planStatus: 'none',
    finalized: false,
    topCrop: null,
    lastPlanAt: null,
  },
  {
    id: 'mock-f15',
    name: 'Callum Forsyth',
    email: 'callum.demo@farmsense.local',
    isActive: true,
    createdAt: '2026-02-25T10:50:00Z',
    lastLoginAt: '2026-07-09T14:15:00Z',
    district: 'Scottish Borders',
    region: 'Scottish Borders',
    farmSize: 22,
    countryCode: 'GB',
    hasSoilData: true,
    soilReadingsCount: 2,
    hasRecommendations: true,
    planStatus: 'finalized',
    finalized: true,
    topCrop: 'Oats',
    lastPlanAt: '2026-07-08T09:00:00Z',
  },
]

function districtBreakdown(farmers) {
  const counts = {}
  for (const f of farmers) {
    const d = f.district || 'Unknown'
    counts[d] = (counts[d] || 0) + 1
  }
  return Object.entries(counts)
    .map(([district, count]) => ({ district, farmers: count }))
    .sort((a, b) => b.farmers - a.farmers || a.district.localeCompare(b.district))
}

function pct(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

function dummyAnalytics() {
  const total = mockFarmers.length
  const active = mockFarmers.filter((f) => f.isActive).length
  const inactive = total - active
  const withSoil = mockFarmers.filter((f) => f.hasSoilData).length
  const finalized = mockFarmers.filter((f) => f.finalized || f.planStatus === 'finalized').length
  const draft = mockFarmers.filter((f) => f.planStatus === 'draft' && !f.finalized).length
  const noPlan = total - finalized - draft
  const byDistrict = districtBreakdown(mockFarmers)

  const cropCounts = {}
  for (const f of mockFarmers) {
    if ((f.finalized || f.planStatus === 'finalized') && f.topCrop) {
      cropCounts[f.topCrop] = (cropCounts[f.topCrop] || 0) + 1
    }
  }
  const topCrops = Object.entries(cropCounts)
    .map(([crop, farmers]) => ({ crop, farmers }))
    .sort((a, b) => b.farmers - a.farmers || a.crop.localeCompare(b.crop))

  const monthCounts = {}
  for (const f of mockFarmers) {
    if (!f.createdAt) continue
    const month = f.createdAt.slice(0, 7)
    monthCounts[month] = (monthCounts[month] || 0) + 1
  }
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
  const signupsByMonth = Object.keys(monthCounts)
    .sort()
    .map((month) => {
      const [y, m] = month.split('-')
      return { month, label: `${months[Number(m) - 1]} ${y}`, farmers: monthCounts[month] }
    })

  const sizes = mockFarmers.map((f) => Number(f.farmSize)).filter((n) => Number.isFinite(n) && n > 0)
  const insights = []
  if (pct(withSoil, total) >= 60) {
    insights.push(`Soil data adoption is strong at ${pct(withSoil, total)}% of farmers.`)
  } else {
    insights.push(
      `Only ${pct(withSoil, total)}% of farmers have submitted soil data — worth nudging new sign-ups to complete Plan.`
    )
  }
  if (draft > finalized) {
    insights.push(
      `More draft plans (${draft}) than finalized (${finalized}) — farmers may need help confirming picks.`
    )
  } else {
    insights.push(`${pct(finalized, total)}% of farmers have a finalized crop plan.`)
  }
  if (inactive) insights.push(`${inactive} inactive account(s) are blocked from signing in.`)
  if (byDistrict[0]) {
    insights.push(`Most farmers are in ${byDistrict[0].district} (${byDistrict[0].farmers}).`)
  }
  if (topCrops[0]) {
    insights.push(`Leading finalized crop: ${topCrops[0].crop} (${topCrops[0].farmers} farm(s)).`)
  }

  return {
    mode: 'dummy',
    totals: {
      farmers: total,
      active,
      inactive,
      withSoilData: withSoil,
      draftPlans: draft,
      finalizedPlans: finalized,
      noPlan,
    },
    rates: {
      soilAdoptionPct: pct(withSoil, total),
      finalizedPct: pct(finalized, total),
      draftPct: pct(draft, total),
      noPlanPct: pct(noPlan, total),
      activePct: pct(active, total),
    },
    planStatus: [
      { status: 'Finalized', count: finalized },
      { status: 'Draft', count: draft },
      { status: 'No plan', count: noPlan },
    ],
    byDistrict,
    topCrops,
    signupsByMonth,
    farmSize: {
      avgHa: sizes.length ? Math.round((sizes.reduce((a, b) => a + b, 0) / sizes.length) * 100) / 100 : null,
      minHa: sizes.length ? Math.min(...sizes) : null,
      maxHa: sizes.length ? Math.max(...sizes) : null,
      reported: sizes.length,
    },
    insights: insights.slice(0, 5),
  }
}

function dummyOverview() {
  return {
    mode: 'dummy',
    totals: {
      farmers: mockFarmers.length,
      active: mockFarmers.filter((f) => f.isActive).length,
      inactive: mockFarmers.filter((f) => !f.isActive).length,
      withSoilData: mockFarmers.filter((f) => f.hasSoilData).length,
      draftPlans: mockFarmers.filter((f) => f.planStatus === 'draft').length,
      finalizedPlans: mockFarmers.filter((f) => f.finalized).length,
    },
    byDistrict: districtBreakdown(mockFarmers),
  }
}

export const adminService = {
  /**
   * @param {{ dataMode?: 'live' | 'dummy' }} [opts]
   */
  async getOverview({ dataMode = 'live' } = {}) {
    if (dataMode === 'dummy') {
      return withMockDelay(dummyOverview())
    }
    return backendClient.get(backendEndpoints.admin.overview)
  },

  async getAnalytics({ dataMode = 'live' } = {}) {
    if (dataMode === 'dummy') {
      return withMockDelay(dummyAnalytics())
    }
    return backendClient.get(backendEndpoints.admin.analytics)
  },

  /**
   * @param {{ q?: string, page?: number, limit?: number, dataMode?: 'live' | 'dummy' }} [opts]
   */
  async listFarmers({ q = '', page = 1, limit = 20, dataMode = 'live' } = {}) {
    if (dataMode === 'dummy') {
      const term = q.trim().toLowerCase()
      let items = mockFarmers
      if (term) {
        items = items.filter(
          (f) =>
            f.name.toLowerCase().includes(term) ||
            f.email.toLowerCase().includes(term) ||
            (f.district || '').toLowerCase().includes(term)
        )
      }
      const total = items.length
      const safeLimit = Math.max(1, Math.min(100, limit))
      const safePage = Math.max(1, page)
      const offset = (safePage - 1) * safeLimit
      const pageItems = items.slice(offset, offset + safeLimit)
      return withMockDelay({
        mode: 'dummy',
        items: pageItems,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      })
    }
    return backendClient.get(backendEndpoints.admin.farmers, {
      q: q || undefined,
      page,
      limit,
    })
  },

  async getFarmer(id, { dataMode = 'live' } = {}) {
    if (dataMode === 'dummy') {
      const farmer = mockFarmers.find((f) => f.id === id) || mockFarmers[0]
      return withMockDelay({ ...farmer })
    }
    return backendClient.get(backendEndpoints.admin.farmer(id))
  },

  async setFarmerActive(id, isActive, { dataMode = 'live' } = {}) {
    if (dataMode === 'dummy') {
      const farmer = mockFarmers.find((f) => f.id === id) || mockFarmers[0]
      return withMockDelay({ ...farmer, isActive })
    }
    return backendClient.patch(backendEndpoints.admin.farmer(id), { isActive })
  },

  async deleteFarmer(id, { dataMode = 'live' } = {}) {
    if (dataMode === 'dummy') {
      return withMockDelay({ deleted: true, id, email: 'demo@farmsense.local', name: 'Demo' })
    }
    return backendClient.delete(backendEndpoints.admin.farmer(id))
  },

  async getModelsStatus() {
    return backendClient.get(backendEndpoints.admin.modelsStatus)
  },

  /**
   * @param {string} layer
   * @param {Record<string, unknown>} [payload]
   */
  async testModel(layer, payload = {}) {
    return backendClient.post(backendEndpoints.admin.modelsTest, { layer, payload })
  },
}
