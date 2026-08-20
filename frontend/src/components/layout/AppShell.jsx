import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './BottomNav'
import { AdminBottomNav, AdminSidebar } from './AdminNav'
import { useAuthSession } from '../../hooks/useAuthSession'
import { useSimpleMode } from '../../hooks/useSimpleMode'
import { SimpleModePrompt } from '../shared/SimpleModePrompt'
import { ConsentBanner } from '../shared/ConsentBanner'

const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/privacy']

/**
 * App chrome: left nav + page content.
 * Do not put overflow-y on the main column — that creates a second “middle” scrollbar.
 * The document scrolls as one unit so sticky plan panels work correctly.
 */
export function AppShell() {
  useAuthSession()
  useSimpleMode()

  const location = useLocation()
  const isPublic = publicRoutes.includes(location.pathname)
  const isAdmin = location.pathname.startsWith('/admin')

  if (isPublic) {
    return (
      <>
        <Outlet />
        <ConsentBanner />
      </>
    )
  }

  if (isAdmin) {
    return (
      <div className="min-h-dvh bg-bg dark:bg-bg-dark flex ek-page-grain">
        <AdminSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Navbar showLogo={false} className="md:hidden shrink-0" />
          <div className="flex-1 min-w-0 pb-20 md:pb-0">
            <Outlet />
          </div>
          <AdminBottomNav />
        </div>
        <ConsentBanner />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg dark:bg-bg-dark flex ek-page-grain">
      <SimpleModePrompt />
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar showLogo={false} className="md:hidden shrink-0" />
        <div className="flex-1 min-w-0 w-full pb-20 md:pb-0">
          <Outlet />
        </div>
        <BottomNav />
      </div>
      <ConsentBanner />
    </div>
  )
}
