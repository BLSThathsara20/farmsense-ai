import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, LogOut, Shield, ChartColumn, FlaskConical } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useFarmStore } from '../../store/farmStore'

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/analysis', icon: ChartColumn, label: 'Analysis', end: false },
  { to: '/admin/models', icon: FlaskConical, label: 'Models', end: false },
  { to: '/admin/farmers', icon: Users, label: 'Farmers', end: false },
]

export function AdminSidebar() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const handleSignOut = () => {
    useFarmStore.getState().resetFarmData()
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col w-[240px] shrink-0',
        'bg-surface dark:bg-surface-dark border-r border-border dark:border-border-dark',
        'h-screen sticky top-0'
      )}
    >
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border dark:border-border-dark">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-ek text-text-primary dark:text-text-dark-primary">
            FarmSense
          </p>
          <p className="text-[10px] text-text-muted dark:text-text-dark-muted truncate">Admin</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Admin navigation">
        {adminNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md min-h-[40px] text-sm tracking-ek',
                'transition-colors duration-200 ease-ek',
                isActive
                  ? 'bg-surface-alt dark:bg-surface-dark-alt text-text-primary dark:text-text-dark-primary font-medium'
                  : 'text-text-secondary dark:text-text-dark-secondary hover:bg-surface-alt/80 dark:hover:bg-surface-dark-alt/80'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive ? 'text-primary' : 'text-text-muted dark:text-text-dark-muted'
                  )}
                  strokeWidth={isActive ? 2.25 : 2}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border dark:border-border-dark">
        <p className="px-3 text-xs text-text-muted dark:text-text-dark-muted truncate mb-2">
          {user?.email}
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary dark:text-text-dark-secondary hover:bg-surface-alt dark:hover:bg-surface-dark-alt"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export function AdminBottomNav() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const handleSignOut = () => {
    useFarmStore.getState().resetFarmData()
    logout()
    navigate('/login')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex justify-center pointer-events-none px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <nav
        className={cn(
          'pointer-events-auto flex items-center justify-around gap-0.5',
          'h-[58px] px-2 min-w-[min(100%,360px)] max-w-md',
          'rounded-2xl border border-border dark:border-border-dark',
          'bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-xl',
          'shadow-dock dark:shadow-dock-dark'
        )}
        aria-label="Admin navigation"
      >
        {adminNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] px-0.5"
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg',
                    isActive
                      ? 'bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark'
                      : 'text-text-muted dark:text-text-dark-muted'
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} />
                </span>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          aria-label="Sign out"
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[72px] min-h-[48px] px-1 text-text-muted dark:text-text-dark-muted"
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-lg">
            <LogOut className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[10px] font-medium">Sign out</span>
        </button>
      </nav>
    </div>
  )
}
