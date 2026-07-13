import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function Toggle({ checked, onChange, label, id, className }) {
  const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label
      htmlFor={toggleId}
      className={cn('flex items-center gap-3 cursor-pointer min-h-[48px]', className)}
    >
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-border dark:bg-border-dark'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm',
            checked ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
      {label && (
        <span className="text-sm text-text-primary dark:text-text-dark-primary">{label}</span>
      )}
    </label>
  )
}
