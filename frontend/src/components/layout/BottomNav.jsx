import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Sprout, TrendingUp, Users, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/plan', icon: Sprout, label: 'Plan' },
  { to: '/market', icon: TrendingUp, label: 'Market' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function NavIcon({ isActive, Icon, label }) {
  return (
    <>
      <motion.span
        layout
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200',
          isActive
            ? 'bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark'
            : 'bg-transparent text-text-muted dark:text-text-dark-muted'
        )}
        transition={spring.snappy}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} aria-hidden="true" />
      </motion.span>
      <span
        className={cn(
          'text-[10px] font-medium tracking-wide transition-colors duration-200',
          isActive
            ? 'text-text-primary dark:text-text-dark-primary'
            : 'text-text-muted dark:text-text-dark-muted'
        )}
      >
        {label}
      </span>
    </>
  )
}

export function BottomNav() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex justify-center pointer-events-none px-4 pb-[max(12px,env(safe-area-inset-bottom))]"
      aria-hidden={false}
    >
      <nav
        className={cn(
          'pointer-events-auto flex items-center justify-around gap-0.5',
          'h-[58px] px-2 min-w-[min(100%,360px)] max-w-md',
          'rounded-2xl border border-border dark:border-border-dark',
          'bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-xl',
          'shadow-dock dark:shadow-dock-dark'
        )}
        aria-label="Main navigation"
      >
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[48px] px-1"
          >
            {({ isActive }) => <NavIcon isActive={isActive} Icon={Icon} label={label} />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Sidebar() {
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
          <Sprout className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-semibold tracking-ek text-text-primary dark:text-text-dark-primary">
          FarmSense
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Sidebar navigation">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
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
    </aside>
  )
}
