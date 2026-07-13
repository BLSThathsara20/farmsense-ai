import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './BottomNav'
import { AdminBottomNav, AdminSidebar } from './AdminNav'
import { cn } from '../../lib/utils'

const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']

export function AppShell() {
  const location = useLocation()
  const isPublic = publicRoutes.includes(location.pathname)
  const isAdmin = location.pathname.startsWith('/admin')

  if (isPublic) {
    return <Outlet />
  }

  if (isAdmin) {
    return (
      <div className="min-h-dvh bg-bg dark:bg-bg-dark flex ek-page-grain">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-h-dvh min-w-0 overflow-x-hidden">
          <Navbar showLogo={false} className="md:hidden" />
          <div className={cn('flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-0 pb-20 md:pb-0')}>
            <Outlet />
          </div>
          <AdminBottomNav />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg dark:bg-bg-dark flex ek-page-grain">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-dvh min-w-0 overflow-x-hidden">
        <Navbar showLogo={false} className="md:hidden" />
        <div className={cn('flex-1 flex flex-col lg:flex-row min-w-0 overflow-x-hidden min-h-0')}>
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
