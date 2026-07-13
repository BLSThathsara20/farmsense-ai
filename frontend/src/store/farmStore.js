import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const defaultSoilData = {
  region: '',
  location: null,
  area: 2,
  nitrogen: 50,
  phosphorus: 50,
  potassium: 50,
  ph: 6.5,
  texture: '',
  preferences: [],
}

export const useFarmStore = create(
  persist(
    (set, get) => ({
      soilData: { ...defaultSoilData },
      hasSoilData: false,
      lastRecommendation: null,
      lastSoilReading: null,
      units: 'metric',
      notifications: {
        sellAlerts: true,
        weatherAlerts: true,
        communityUpdates: false,
      },

      updateSoilData: (data) =>
        set({
          soilData: { ...get().soilData, ...data },
        }),

      submitSoilData: (data) =>
        set({
          soilData: data,
          hasSoilData: true,
          lastSoilReading: new Date().toISOString(),
        }),

      setLastRecommendation: (recommendation) =>
        set({ lastRecommendation: recommendation }),

      selectedCrops: [],
      cropPlanConfirmedAt: null,

      toggleSelectedCrop: (rec) =>
        set((state) => {
          const exists = state.selectedCrops.some((c) => c.id === rec.id)
          return {
            selectedCrops: exists
              ? state.selectedCrops.filter((c) => c.id !== rec.id)
              : [...state.selectedCrops, rec],
          }
        }),

      setSelectedCrops: (crops) => set({ selectedCrops: crops }),

      confirmCropPlan: (crops, confirmedAt) =>
        set({
          selectedCrops: crops,
          cropPlanConfirmedAt: confirmedAt || new Date().toISOString(),
          lastRecommendation: crops[0] || null,
        }),

      clearCropSelection: () =>
        set({ selectedCrops: [], cropPlanConfirmedAt: null }),

      setUnits: (units) => set({ units }),

      setNotifications: (notifications) =>
        set({ notifications: { ...get().notifications, ...notifications } }),

      resetFarmData: () =>
        set({
          soilData: { ...defaultSoilData },
          hasSoilData: false,
          lastRecommendation: null,
          lastSoilReading: null,
          selectedCrops: [],
          cropPlanConfirmedAt: null,
        }),
    }),
    { name: 'farmsense-farm' }
  )
)
