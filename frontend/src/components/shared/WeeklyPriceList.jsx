import { Badge } from '../ui/Badge'
import { formatCurrency, formatPriceIndex, formatGbpPerKg } from '../../lib/utils'
import { cn } from '../../lib/utils'

function formatRowPrice(price, unit) {
  if (price == null) return '—'
  if (unit === 'gbp') return `${formatGbpPerKg(price)}/kg`
  if (unit === 'index') return `${formatPriceIndex(price)} idx`
  return formatCurrency(price)
}

export function WeeklyPriceList({ rows, className, unit = 'currency' }) {
  if (!rows?.length) return null

  return (
    <ul className={cn('divide-y divide-border/60 dark:divide-border-dark/60', className)}>
      {rows.map((row) => {
        const price = row.isForecast ? row.forecast ?? row.price : row.price
        const badgeLabel = row.isEstimated
          ? 'Estimate'
          : row.isForecast
            ? 'Forecast'
            : 'Actual'
        const badgeVariant = row.isEstimated ? 'warning' : row.isForecast ? 'accent' : 'neutral'
        return (
          <li
            key={`${row.week}-${row.weekNum}`}
            className="flex items-center gap-2 py-3 min-w-0"
          >
            <span className="font-mono text-sm text-text-primary dark:text-text-dark-primary w-16 sm:w-20 shrink-0 truncate">
              {row.week}
            </span>
            <span className="font-mono text-sm font-medium text-text-primary dark:text-text-dark-primary flex-1 min-w-0 truncate">
              {formatRowPrice(price, unit)}
              {unit === 'gbp' && row.indexPrice != null && (
                <span className="text-text-muted font-normal ml-2">
                  · {formatPriceIndex(row.indexPrice)} idx
                </span>
              )}
            </span>
            <Badge
              variant={badgeVariant}
              size="sm"
              className="shrink-0 text-[10px] sm:text-xs"
            >
              {badgeLabel}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}
