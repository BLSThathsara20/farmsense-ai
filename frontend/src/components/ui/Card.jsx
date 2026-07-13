import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

const variants = {
  default: 'bg-surface dark:bg-surface-dark shadow-card',
  elevated:
    'bg-surface dark:bg-surface-dark shadow-card ek-surface-interactive hover:shadow-card-hover',
  bordered:
    'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
  highlight:
    'bg-surface dark:bg-surface-dark shadow-card border border-border dark:border-border-dark border-l-2 border-l-primary',
  featured:
    'bg-surface dark:bg-surface-dark shadow-card border border-primary/20 ring-1 ring-primary/10',
  ghost: 'bg-transparent border border-transparent',
}

export function Card({
  children,
  variant = 'default',
  className,
  onClick,
  interactive = false,
  ...props
}) {
  const Component = onClick ? motion.button : motion.div
  const isInteractive = onClick || interactive

  return (
    <Component
      onClick={onClick}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={spring.snappy}
      className={cn(
        'rounded-lg p-[var(--card-padding,16px)]',
        variants[variant],
        isInteractive && 'ek-surface-interactive cursor-pointer text-left w-full',
        onClick && 'appearance-none',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
