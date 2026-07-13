import { motion } from 'framer-motion'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatCurrency } from '../../lib/utils'
import { Sprout, Check, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

export function CropCard({
  crop,
  confidence,
  profitEstimate,
  rank,
  compact = false,
  selected = false,
  selectable = false,
  onClick,
}) {
  const isTop = rank === 1

  return (
    <Card
      variant={isTop ? 'featured' : selected ? 'highlight' : 'elevated'}
      onClick={onClick}
      className={cn(
        compact ? 'py-3' : '',
        selectable && 'cursor-pointer',
        selectable && selected && 'ring-2 ring-primary/30 border-primary/30',
        isTop && 'relative overflow-hidden'
      )}
    >
      {isTop && (
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {selectable && (
            <motion.div
              animate={{ scale: selected ? 1 : 0.92 }}
              transition={spring.snappy}
              className={cn(
                'flex items-center justify-center w-5 h-5 rounded-md border shrink-0 mt-0.5',
                selected
                  ? 'bg-primary border-primary text-white'
                  : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark'
              )}
              aria-hidden="true"
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </motion.div>
          )}
          <div
            className={cn(
              'p-2 rounded-md shrink-0',
              isTop ? 'bg-primary/10' : 'bg-surface-alt dark:bg-surface-dark-alt'
            )}
          >
            <Sprout className={cn('h-4 w-4', 'text-primary')} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-ek text-text-primary dark:text-text-dark-primary truncate">
              {crop}
            </h3>
            {!compact && (
              <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
                Rank #{rank}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <Badge variant={isTop ? 'primary' : 'neutral'} size="sm">
            {confidence}%
          </Badge>
          {profitEstimate != null && (
            <p className="ek-mono-data text-xs mt-1.5 text-text-secondary dark:text-text-dark-secondary">
              {formatCurrency(profitEstimate)}
            </p>
          )}
        </div>
      </div>
      {isTop && !compact && (
        <div className="mt-3 pt-3 border-t border-border dark:border-border-dark flex items-center justify-between">
          <span className="ek-label">Top match</span>
          <ChevronRight className="h-4 w-4 text-text-muted" />
        </div>
      )}
    </Card>
  )
}
