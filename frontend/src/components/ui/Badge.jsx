import { cn } from '../../lib/utils'

const variants = {
  success: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
  warning: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20',
  danger: 'bg-error/10 text-error ring-1 ring-inset ring-error/20',
  info: 'bg-info/10 text-info ring-1 ring-inset ring-info/20',
  neutral:
    'bg-surface-alt dark:bg-surface-dark-alt text-text-secondary dark:text-text-dark-secondary ring-1 ring-inset ring-border dark:ring-border-dark',
  primary: 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
  accent: 'bg-accent/10 text-accent ring-1 ring-inset ring-accent/25',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[11px] tracking-wide uppercase',
  md: 'px-2.5 py-1 text-xs font-medium',
}

export function Badge({ children, variant = 'neutral', size = 'md', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}
