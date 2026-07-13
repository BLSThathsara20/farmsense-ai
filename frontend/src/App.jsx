import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useThemeStore } from './store/themeStore'
import { Toaster } from './components/ui/Toast'

export default function App() {
  useEffect(() => {
    return useThemeStore.getState().initTheme()
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
