import { useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'

export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const isDark = useThemeStore((s) => s.isDark)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const initTheme = useThemeStore((s) => s.initTheme)

  useEffect(() => {
    return initTheme()
  }, [initTheme])

  return { theme, toggleTheme, setTheme, isDark }
}
