import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '../../lib/utils'

export function Navbar({ showLogo = true, className, minimal = false }) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center justify-between',
        'h-14 px-5',
        minimal
          ? 'bg-transparent'
          : 'bg-surface/75 dark:bg-surface-dark/75 backdrop-blur-xl border-b border-border dark:border-border-dark',
        className
      )}
    >
      {showLogo ? (
        <Link to="/" className="flex items-center gap-2.5 min-h-[44px] group">
          <span className="text-[15px] font-semibold tracking-ek text-text-primary dark:text-text-dark-primary">
            FarmSense
          </span>
        </Link>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-1">
        {minimal && (
          <Link
            to="/login"
            className="text-sm font-medium text-text-secondary dark:text-text-dark-secondary hover:text-text-primary dark:hover:text-text-dark-primary px-3 min-h-[44px] flex items-center transition-colors duration-200"
          >
            Sign in
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
