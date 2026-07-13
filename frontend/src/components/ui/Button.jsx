import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

const variants = {
  primary:
    'bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark border border-transparent hover:opacity-90',
  secondary:
    'bg-surface dark:bg-surface-dark text-text-primary dark:text-text-dark-primary border border-border dark:border-border-dark hover:bg-surface-alt dark:hover:bg-surface-dark-alt',
  ghost:
    'bg-transparent text-text-secondary dark:text-text-dark-secondary border border-transparent hover:bg-surface-alt dark:hover:bg-surface-dark-alt hover:text-text-primary dark:hover:text-text-dark-primary',
  danger: 'bg-error text-white border border-transparent hover:opacity-90',
  accent:
    'bg-primary text-white border border-transparent hover:bg-primary-dark shadow-glow',
}

const sizes = {
  sm: 'h-9 px-3.5 text-sm rounded-md gap-1.5',
  md: 'h-11 px-5 text-sm rounded-md gap-2 min-h-[44px]',
  lg: 'h-12 px-6 text-[15px] rounded-lg gap-2 min-h-[48px] font-medium',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      whileHover={isDisabled ? undefined : { y: -1 }}
      transition={spring.snappy}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium tracking-ek',
        'transition-colors duration-200 ease-ek',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg dark:focus-visible:ring-offset-bg-dark',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  )
}
