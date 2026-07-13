import { Badge } from '../ui/Badge'
import { formatCurrency } from '../../lib/utils'
import { cn } from '../../lib/utils'

export function WeeklyPriceList({ rows, className }) {
  if (!rows?.length) return null

  return (
    <ul className={cn('divide-y divide-border/60 dark:divide-border-dark/60', className)}>
      {rows.map((row) => {
        const price = row.isForecast ? row.forecast ?? row.price : row.price
        return (
          <li
            key={`${row.week}-${row.weekNum}`}
            className="flex items-center gap-2 py-3 min-w-0"
          >
            <span className="font-mono text-sm text-text-primary dark:text-text-dark-primary w-10 sm:w-12 shrink-0">
              {row.week}
            </span>
            <span className="font-mono text-sm font-medium text-text-primary dark:text-text-dark-primary flex-1 min-w-0 truncate">
              {price != null ? formatCurrency(price) : '—'}
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
