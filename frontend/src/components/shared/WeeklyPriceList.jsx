import { Badge } from '../ui/Badge'
import { formatCurrency, formatPriceIndex } from '../../lib/utils'
import { cn } from '../../lib/utils'

export function WeeklyPriceList({ rows, className, unit = 'currency' }) {
  if (!rows?.length) return null
  const fmt = unit === 'index' ? formatPriceIndex : formatCurrency

  return (
    <ul className={cn('divide-y divide-border/60 dark:divide-border-dark/60', className)}>
      {rows.map((row) => {
        const price = row.isForecast ? row.forecast ?? row.price : row.price
        return (
          <li
            key={`${row.week}-${row.weekNum}`}
            className="flex items-center gap-2 py-3 min-w-0"
          >
            <span className="font-mono text-sm text-text-primary dark:text-text-dark-primary w-16 sm:w-20 shrink-0 truncate">
              {row.week}
            </span>
            <span className="font-mono text-sm font-medium text-text-primary dark:text-text-dark-primary flex-1 min-w-0 truncate">
              {price != null ? `${fmt(price)}${unit === 'index' ? ' idx' : ''}` : '—'}
            </span>
            <Badge
              variant={row.isForecast ? 'accent' : 'neutral'}
              size="sm"
              className="shrink-0 text-[10px] sm:text-xs"
            >
              {row.isForecast ? 'Forecast' : 'Actual'}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}
