import { create } from 'zustand'

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'system'
  return localStorage.getItem('farmsense-theme') || 'system'
}

const applyTheme = (mode) => {
  const root = document.documentElement
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.classList.toggle('dark', isDark)
  return isDark
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  isDark: false,

  initTheme: () => {
    const { theme } = get()
    const isDark = applyTheme(theme)
    set({ isDark })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (get().theme === 'system') {
        set({ isDark: applyTheme('system') })
      }
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  },

  setTheme: (theme) => {
    localStorage.setItem('farmsense-theme', theme)
    const isDark = applyTheme(theme)
    set({ theme, isDark })
  },

  toggleTheme: () => {
    const { isDark } = get()
    get().setTheme(isDark ? 'light' : 'dark')
  },
}))
