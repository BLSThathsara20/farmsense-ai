import { cn } from '../../lib/utils'

export function SectionHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        <h2 className="text-lg font-semibold text-text-primary dark:text-text-dark-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
