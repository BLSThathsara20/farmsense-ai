import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      /** False until zustand rehydrates from localStorage */
      hasHydrated: false,
      /**
       * Session check against the API (or mock).
       * idle → checking → authenticated | unauthenticated
       */
      sessionStatus: 'idle',
      /** Connectivity / server fault from the last session check (if any) */
      sessionError: null,
      /** Internal: ignore stale async session checks after remount */
      _sessionRunId: null,

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          sessionStatus: 'authenticated',
          sessionError: null,
        }),

      register: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          sessionStatus: 'authenticated',
          sessionError: null,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          sessionStatus: 'unauthenticated',
          sessionError: null,
        }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      setSessionStatus: (sessionStatus) => set({ sessionStatus }),

      setSessionError: (sessionError) => set({ sessionError }),
    }),
    {
      name: 'farmsense-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          useAuthStore.setState({
            hasHydrated: true,
            sessionStatus: 'unauthenticated',
            sessionError: null,
            user: null,
            token: null,
            isAuthenticated: false,
          })
          return
        }
        useAuthStore.setState({ hasHydrated: true })
      },
    }
  )
)

/** Guarantee hydration flag even if persist callback is missed (HMR / edge cases). */
if (typeof window !== 'undefined') {
  const markHydrated = () => {
    if (!useAuthStore.getState().hasHydrated) {
      useAuthStore.setState({ hasHydrated: true })
    }
  }
  useAuthStore.persist.onFinishHydration(markHydrated)
  if (useAuthStore.persist.hasHydrated()) markHydrated()
  setTimeout(markHydrated, 250)
}
