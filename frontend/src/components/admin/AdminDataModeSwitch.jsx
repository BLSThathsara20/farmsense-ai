import { cn } from '../../lib/utils'

/**
 * Live = PostgreSQL farmers (excludes test accounts).
 * Dummy = sample data for demos / screenshots only.
 */
export function AdminDataModeSwitch({ mode, onChange, className }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-lg border border-border dark:border-border-dark',
        'bg-surface-alt/60 dark:bg-surface-dark-alt/60',
        className
      )}
      role="group"
      aria-label="Admin data source"
    >
      <button
        type="button"
        onClick={() => onChange('live')}
        className={cn(
          'px-3 py-1.5 rounded-md text-xs font-medium min-h-[36px] transition-colors',
          mode === 'live'
            ? 'bg-surface dark:bg-surface-dark text-text-primary dark:text-text-dark-primary shadow-sm'
            : 'text-text-muted dark:text-text-dark-muted hover:text-text-primary'
        )}
      >
        Live data
      </button>
      <button
        type="button"
        onClick={() => onChange('dummy')}
        className={cn(
          'px-3 py-1.5 rounded-md text-xs font-medium min-h-[36px] transition-colors',
          mode === 'dummy'
            ? 'bg-surface dark:bg-surface-dark text-text-primary dark:text-text-dark-primary shadow-sm'
            : 'text-text-muted dark:text-text-dark-muted hover:text-text-primary'
        )}
      >
        Dummy data
      </button>
    </div>
  )
}
