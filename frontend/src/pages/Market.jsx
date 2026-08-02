import { useState, useMemo, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, Users, Sprout } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/shared/EmptyState'
import { WeeklyPriceList } from '../components/shared/WeeklyPriceList'
import { PriceChart } from '../components/charts/PriceChart'
import { useMarketData, useCrops } from '../hooks/useMockData'
import { useFarmStore } from '../store/farmStore'
import { apiConfig } from '../api'
import { DemoTag } from '../components/shared/DemoTag'
import { formatPercent, formatGbpPerKg, formatGbpPer100g } from '../lib/utils'
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
  const { crops: allCrops, loading: cropsLoading } = useCrops()
  const selectedCrops = useFarmStore((s) => s.selectedCrops)
  const cropPlanConfirmedAt = useFarmStore((s) => s.cropPlanConfirmedAt)
  const overviewCrops = useFarmStore((s) => s.plansOverview?.allSelectedCrops || [])

  const farmCropNames = useMemo(() => {
    const fromActive = selectedCrops.map((c) => c.crop).filter(Boolean)
    const fromAll = overviewCrops.map((c) => c.crop).filter(Boolean)
    return [...new Set([...fromActive, ...fromAll])]
  }, [selectedCrops, overviewCrops])

  const cropList = useMemo(() => {
    const rest = allCrops.filter((c) => !farmCropNames.includes(c))
    return [...farmCropNames, ...rest]
  }, [allCrops, farmCropNames])

  const defaultCrop = farmCropNames[0] || allCrops[0] || 'Tomato'
  const [selectedCrop, setSelectedCrop] = useState(defaultCrop)

  // Keep selection valid when the crop list changes — do not force back to default on every click.
  useEffect(() => {
    if (!cropList.length) return
    setSelectedCrop((current) => {
      if (cropList.includes(current)) return current
      if (cropList.includes(defaultCrop)) return defaultCrop
      return cropList[0]
    })
  }, [cropList, defaultCrop])

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
  const pageLoading = loading || cropsLoading || !data
  const priceUnit = data?.priceUnit === 'gbp' ? 'gbp' : data?.priceUnit === 'index' ? 'index' : 'currency'
  const chartTitle =
    priceUnit === 'gbp' ? 'Price (£/kg) and UK index' : 'Price index trend'
  const monthListTitle =
    priceUnit === 'gbp' ? 'Month by month (£/kg + index)' : 'Month by month'

  return (
    <PageWrapper className="market-page">
      <header className="mb-4 sm:mb-5">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs sm:text-sm text-text-secondary dark:text-text-dark-secondary">
            Market check
          </p>
          {(apiConfig.useMock || data?.demand?.plantingDemo || data?.demand?.demo) && <DemoTag />}
        </div>
        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl text-text-primary dark:text-text-dark-primary leading-tight">
          Is now a good time to sell?
        </h1>
        <p className="mt-1.5 text-xs text-text-muted dark:text-text-dark-muted" data-detail>
          Farm-gate guide in £/kg (DEFRA) plus GOV.UK index outlook — not supermarket shelf prices.
        </p>
      </header>

      <div className="market-chip-scroll mb-4 sm:mb-5">
        {farmCropNames.length > 0 && (
          <p
            className="text-xs text-text-muted dark:text-text-dark-muted mb-2 flex items-center gap-1 px-0.5"
            data-detail
          >
            <Sprout className="h-3.5 w-3.5 text-primary shrink-0" />
            Your plan crops shown first
            {cropPlanConfirmedAt ? ' (active plan)' : ''}
          </p>
        )}
        <div className="market-chip-track" role="tablist" aria-label="Select crop">
          {cropList.map((crop) => {
            const isYours = farmCropNames.includes(crop)
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

      {pageLoading ? (
        <div className="space-y-4 min-w-0">
          <Skeleton variant="card" className="h-36 sm:h-40" />
          <Skeleton variant="rectangle" className="h-52 sm:h-64" />
        </div>
      ) : (
        <div className="min-w-0 space-y-4 sm:space-y-5">
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
                {data.proxyNote && (
                  <p className="text-xs text-text-muted mt-2" data-detail>
                    {data.proxyNote}
                  </p>
                )}
                {data.dataLagNote && (
                  <p className="text-xs text-accent mt-2" data-detail>
                    {data.dataLagNote}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-text-muted dark:text-text-dark-muted mb-1 truncate">
              {selectedCrop} · guide price for farmers
              {data.farmerPrice?.asOf ? ` · DEFRA as of ${data.farmerPrice.asOf}` : ''}
            </p>

            {data.farmerPrice?.available ? (
              <div className="space-y-3 mb-5">
                <div className="flex flex-col xs:flex-row xs:items-end xs:gap-4 gap-2">
                  <div>
                    <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-medium text-text-primary dark:text-text-dark-primary leading-none">
                      {formatGbpPerKg(data.farmerPrice.gbpPerKg)}
                    </span>
                    <span className="text-base font-normal text-text-muted ml-1.5">/ kg</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary dark:text-text-dark-secondary">
                    <span>
                      <span className="ek-mono-data">
                        {formatGbpPer100g(data.farmerPrice.gbpPer100g)}
                      </span>
                      <span className="text-text-muted ml-1">per 100g</span>
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 font-mono text-xs sm:text-sm px-2.5 py-1 rounded-full',
                        data.trend >= 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      )}
                    >
                      {data.trend >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {formatPercent(data.trend)} outlook
                    </span>
                  </div>
                </div>

                <div
                  className="rounded-lg border border-border dark:border-border-dark bg-surface-alt/60 dark:bg-surface-dark-alt/60 px-3.5 py-3"
                  data-detail
                >
                  <p className="ek-label mb-1">Outlook in pounds</p>
                  <p className="text-sm text-text-primary dark:text-text-dark-primary">
                    About{' '}
                    <span className="ek-mono-data font-semibold">
                      {formatGbpPerKg(data.farmerPrice.forecastGbpPerKg)}/kg
                    </span>
                    <span className="text-text-muted">
                      {' '}
                      ({formatGbpPer100g(data.farmerPrice.forecastGbpPer100g)} / 100g)
                    </span>
                    <span className="text-text-secondary">
                      {' '}
                      if the market moves with the outlook ({formatPercent(data.trend)}).
                    </span>
                  </p>
                  {data.farmerPrice.proxyNote && (
                    <p className="text-[11px] text-text-muted mt-1.5">{data.farmerPrice.proxyNote}</p>
                  )}
                  <p className="text-[11px] text-text-muted mt-1">
                    Source · {data.farmerPrice.source}. Guide only — not a supermarket till receipt.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-5 space-y-2">
                <p className="text-sm text-text-muted">
                  {data.farmerPrice?.reason ||
                    'No DEFRA £/kg series for this crop yet. Price outlook still available on the chart.'}
                </p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-mono text-xs sm:text-sm px-2.5 py-1 rounded-full',
                    data.trend >= 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  )}
                >
                  {data.trend >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {formatPercent(data.trend)} outlook
                </span>
              </div>
            )}
          </div>

          <Card variant="elevated" className="!p-3 sm:!p-4 min-w-0 overflow-hidden">
            <h2 className="text-xs sm:text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-2 sm:mb-3">
              {chartTitle}
            </h2>
            {data.weeklyPrices?.length > 0 ? (
              <>
                <PriceChart data={data.weeklyPrices} unit={priceUnit} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 sm:mt-3 text-[10px] sm:text-xs text-text-muted dark:text-text-dark-muted" data-detail>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 sm:w-5 h-0.5 bg-primary rounded shrink-0" />
                    £/kg past
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 sm:w-5 h-0.5 bg-accent rounded shrink-0 opacity-80" />
                    £/kg forecast
                  </span>
                  {priceUnit === 'gbp' && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-4 sm:w-5 h-0.5 bg-slate-500 rounded shrink-0" />
                        Index past
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-4 sm:w-5 h-0.5 bg-slate-400 rounded shrink-0 opacity-80"
                          style={{ backgroundImage: 'repeating-linear-gradient(90deg,#94a3b8 0 3px,transparent 3px 6px)' }}
                        />
                        Index forecast
                      </span>
                    </>
                  )}
                </div>
                {priceUnit === 'gbp' && (
                  <p className="text-[11px] text-text-muted mt-2" data-detail>
                    Left axis: estimated £/kg for farmers. Right axis: GOV.UK index (not pounds).
                    £ values use DEFRA guide + index shape — not supermarket prices.
                  </p>
                )}
              </>
            ) : (
              <EmptyState
                title="No chart data"
                description="Price history isn't available for this crop yet."
              />
            )}
          </Card>

          {data.forecastAccuracy &&
            (data.forecastAccuracy.comparedCount > 0 || data.forecastAccuracy.pendingCount > 0) && (
              <Card variant="bordered" className="!p-3 sm:!p-4 min-w-0" data-detail>
                <h2 className="text-xs sm:text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1">
                  Forecast check (auto)
                </h2>
                <p className="text-[11px] text-text-muted dark:text-text-dark-muted mb-3">
                  We save each prediction, then compare it to the GOV.UK actual when that month is
                  published. No manual step.
                </p>
                {data.forecastAccuracy.avgMapePct != null && (
                  <p className="ek-mono-data text-sm text-text-primary dark:text-text-dark-primary mb-3">
                    Avg error on checked months:{' '}
                    <span className="font-semibold">{data.forecastAccuracy.avgMapePct}% MAPE</span>
                    <span className="text-text-muted text-xs ml-1">
                      ({data.forecastAccuracy.comparedCount} months)
                    </span>
                  </p>
                )}
                {data.forecastAccuracy.recent?.length > 0 && (
                  <ul className="space-y-1.5 mb-3">
                    {data.forecastAccuracy.recent.slice(0, 4).map((row) => (
                      <li
                        key={`${row.month}-${row.predicted}`}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
                      >
                        <span className="ek-mono-data text-text-secondary">{row.month}</span>
                        <span className="text-text-muted">
                          pred {row.predicted} → actual {row.actual}
                          {row.mapePct != null && (
                            <span
                              className={cn(
                                'ml-1.5 font-medium',
                                row.mapePct <= 10
                                  ? 'text-success'
                                  : row.mapePct <= 20
                                    ? 'text-accent'
                                    : 'text-error'
                              )}
                            >
                              {row.mapePct}% err
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {data.forecastAccuracy.pendingCount > 0 && (
                  <p className="text-[11px] text-accent">
                    {data.forecastAccuracy.pendingCount} month
                    {data.forecastAccuracy.pendingCount === 1 ? '' : 's'} saved and waiting for Defra
                    publish
                    {data.forecastAccuracy.pending?.length
                      ? ` (${data.forecastAccuracy.pending.map((p) => p.month).join(', ')})`
                      : ''}
                    .
                  </p>
                )}
              </Card>
            )}

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 min-w-0">
            <Card variant="bordered" className="!py-3 !px-3 sm:!px-4 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-text-muted dark:text-text-dark-muted truncate">
                  {data.demand?.googleTrendsLabel || 'UK search interest'}
                </span>
              </div>
              <p className="font-medium text-sm text-text-primary dark:text-text-dark-primary truncate">
                {data.demand?.googleTrends ?? '—'}
              </p>
              {data.demand?.googleTrendsDetail && (
                <p className="text-[11px] text-text-muted mt-1 leading-snug" data-detail>
                  {data.demand.googleTrendsDetail}
                </p>
              )}
            </Card>
            <Card variant="bordered" className="!py-3 !px-3 sm:!px-4 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-text-muted dark:text-text-dark-muted truncate">
                  {data.demand?.districtShareLabel || 'District planting share'}
                </span>
                {(data.demand?.plantingDemo || data.demand?.demo) && <DemoTag />}
              </div>
              <p className="font-medium text-sm text-text-primary dark:text-text-dark-primary truncate">
                {data.demand?.districtShare ?? '—'}
              </p>
              {data.demand?.districtShareDetail && (
                <p className="text-[11px] text-text-muted mt-1 leading-snug" data-detail>
                  {data.demand.districtShareDetail}
                </p>
              )}
            </Card>
          </div>

          <Card variant="bordered" className="min-w-0 !p-3 sm:!p-4">
            <h2 className="text-xs sm:text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1 px-0.5">
              {monthListTitle}
            </h2>
            <WeeklyPriceList rows={weeklyRows} unit={priceUnit} />
          </Card>

          {data.source && (
            <p className="text-[11px] text-text-muted dark:text-text-dark-muted px-0.5" data-detail>
              Source · {data.source}
              {data.category ? ` · series: ${String(data.category).replace(/_/g, ' ')}` : ''}
            </p>
          )}
        </div>
      )}
    </PageWrapper>
  )
}
