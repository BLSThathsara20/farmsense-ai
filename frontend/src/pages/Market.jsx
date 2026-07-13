import { useState, useMemo, useEffect } from 'react'
import { TrendingUp, TrendingDown, Search, MessageCircle, Sprout } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/shared/EmptyState'
import { WeeklyPriceList } from '../components/shared/WeeklyPriceList'
import { PriceChart } from '../components/charts/PriceChart'
import { useMarketData, useCrops } from '../hooks/useMockData'
import { useFarmStore } from '../store/farmStore'
import { formatCurrency, formatPercent } from '../lib/utils'
import { cn } from '../lib/utils'

const verdictConfig = {
  good: {
    variant: 'success',
    label: 'Good time to sell',
    shortLabel: 'Sell now',
    emoji: '✓',
    bg: 'bg-success/8 border-success/25',
  },
  wait: {
    variant: 'warning',
    label: 'Hold — wait a bit',
    shortLabel: 'Wait',
    emoji: '⏳',
    bg: 'bg-accent/8 border-accent/25',
  },
  avoid: {
    variant: 'danger',
    label: 'Avoid selling now',
    shortLabel: 'Hold off',
    emoji: '✕',
    bg: 'bg-error/8 border-error/25',
  },
}

export default function Market() {
  const allCrops = useCrops()
  const selectedCrops = useFarmStore((s) => s.selectedCrops)
  const cropPlanConfirmedAt = useFarmStore((s) => s.cropPlanConfirmedAt)

  const cropList = useMemo(() => {
    const planted = selectedCrops.map((c) => c.crop)
    const rest = allCrops.filter((c) => !planted.includes(c))
    return [...planted, ...rest]
  }, [allCrops, selectedCrops])

  const defaultCrop = selectedCrops[0]?.crop || 'Tomato'
  const [selectedCrop, setSelectedCrop] = useState(defaultCrop)

  useEffect(() => {
    if (cropList.includes(defaultCrop)) {
      setSelectedCrop(defaultCrop)
    }
  }, [defaultCrop, cropList])

  const { loading, error, retry, data } = useMarketData(selectedCrop)

  if (error) {
    return (
      <PageWrapper>
        <ErrorState message={error} onRetry={retry} />
      </PageWrapper>
    )
  }

  const verdict = data ? verdictConfig[data.sellVerdict] || verdictConfig.wait : verdictConfig.wait
  const weeklyRows = data?.weeklyPrices?.slice(-8) ?? []

  return (
    <PageWrapper className="market-page">
      {/* Header */}
      <header className="mb-4 sm:mb-5">
        <p className="text-xs sm:text-sm text-text-secondary dark:text-text-dark-secondary mb-1">
          Market check
        </p>
        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl text-text-primary dark:text-text-dark-primary leading-tight">
          Is now a good time to sell?
        </h1>
      </header>

      {/* Crop chips — full-bleed horizontal scroll */}
      <div className="market-chip-scroll mb-4 sm:mb-5">
        {cropPlanConfirmedAt && selectedCrops.length > 0 && (
          <p className="text-xs text-text-muted dark:text-text-dark-muted mb-2 flex items-center gap-1 px-0.5">
            <Sprout className="h-3.5 w-3.5 text-primary shrink-0" />
            Your crops shown first
          </p>
        )}
        <div
          className="market-chip-track"
          role="tablist"
          aria-label="Select crop"
        >
          {cropList.map((crop) => {
            const isYours = selectedCrops.some((c) => c.crop === crop)
            const isActive = selectedCrop === crop
            return (
              <button
                key={crop}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCrop(crop)}
                className={cn(
                  'market-chip shrink-0 snap-start',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-alt dark:bg-surface-dark-alt text-text-secondary dark:text-text-dark-secondary',
                  isYours && !isActive && 'ring-1 ring-primary/30'
                )}
              >
                {isYours && (
                  <span className="mr-1 text-[10px] opacity-80" aria-hidden="true">
                    ●
                  </span>
                )}
                {crop}
              </button>
            )
          })}
        </div>
      </div>

      {loading || !data ? (
        <div className="space-y-4 min-w-0">
          <Skeleton variant="card" className="h-36 sm:h-40" />
          <Skeleton variant="rectangle" className="h-52 sm:h-64" />
        </div>
      ) : (
        <div className="min-w-0 space-y-4 sm:space-y-5">
          {/* Verdict */}
          <Card variant="bordered" className={cn('border-2 !p-4 sm:!p-5', verdict.bg)}>
            <div className="flex flex-col xs:flex-row xs:items-start gap-3 sm:gap-4">
              <span
                className={cn(
                  'flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full text-lg sm:text-xl shrink-0',
                  verdict.bg
                )}
                aria-hidden="true"
              >
                {verdict.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <Badge variant={verdict.variant} size="md" className="mb-2">
                  <span className="hidden sm:inline">{verdict.label}</span>
                  <span className="sm:hidden">{verdict.shortLabel}</span>
                </Badge>
                <p className="text-sm sm:text-base text-text-primary dark:text-text-dark-primary leading-relaxed break-words">
                  {data.sellMessage}
                </p>
              </div>
            </div>
          </Card>

          {/* Price block */}
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-text-muted dark:text-text-dark-muted mb-1 truncate">
              {selectedCrop} · per unit
            </p>
            <div className="flex flex-col xs:flex-row xs:items-end xs:gap-3 gap-2">
              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-medium text-text-primary dark:text-text-dark-primary leading-none">
                {formatCurrency(data.currentPrice)}
              </span>
              <span
                className={cn(
                  'inline-flex items-center self-start xs:self-auto gap-1 font-mono text-xs sm:text-sm px-2.5 py-1 rounded-full',
                  data.trend >= 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                )}
              >
                {data.trend >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                )}
                {formatPercent(data.trend)} this week
              </span>
            </div>
          </div>

          {/* Chart */}
          <Card variant="elevated" className="!p-3 sm:!p-4 min-w-0 overflow-hidden">
            <h2 className="text-xs sm:text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-2 sm:mb-3">
              Price trend
            </h2>
            {data.weeklyPrices?.length > 0 ? (
              <>
                <PriceChart data={data.weeklyPrices} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 sm:mt-3 text-[10px] sm:text-xs text-text-muted dark:text-text-dark-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 sm:w-5 h-0.5 bg-primary rounded shrink-0" />
                    Past
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 sm:w-5 h-0.5 bg-accent rounded shrink-0 opacity-80" />
                    Forecast
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                title="No chart data"
                description="Price history isn't available for this crop yet."
              />
            )}
          </Card>

          {/* Demand — stack on narrow screens */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 min-w-0">
            <Card variant="bordered" className="!py-3 !px-3 sm:!px-4 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <Search className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-text-muted dark:text-text-dark-muted truncate">
                  Search interest
                </span>
              </div>
              <p className="font-medium text-sm text-text-primary dark:text-text-dark-primary truncate">
                {data.demand?.googleTrends ?? '—'}
              </p>
            </Card>
            <Card variant="bordered" className="!py-3 !px-3 sm:!px-4 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-text-muted dark:text-text-dark-muted truncate">
                  Community buzz
                </span>
              </div>
              <p className="font-medium text-sm text-text-primary dark:text-text-dark-primary truncate">
                {data.demand?.reddit ?? '—'}
              </p>
            </Card>
          </div>

          {/* Weekly list — no horizontal table scroll */}
          <Card variant="bordered" className="min-w-0 !p-3 sm:!p-4">
            <h2 className="text-xs sm:text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1 px-0.5">
              Week by week
            </h2>
            <WeeklyPriceList rows={weeklyRows} />
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}
