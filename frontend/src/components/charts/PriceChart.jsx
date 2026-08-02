import {
  ResponsiveContainer,
  Line,
  Tooltip,
  Area,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency, formatPriceIndex, formatGbpPerKg } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { cn } from '../../lib/utils'

function CustomTooltip({ active, payload, label, showIndex, unit }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-md px-3 py-2 shadow-card text-xs sm:text-sm max-w-[240px]">
      <p className="font-medium text-text-primary dark:text-text-dark-primary mb-1 truncate">
        {label}
      </p>
      {payload
        .filter((entry) => entry.value != null && entry.dataKey !== 'upper')
        .map((entry) => {
          const isIndex = String(entry.dataKey).toLowerCase().includes('index')
          let formatted
          if (isIndex) {
            formatted = `${formatPriceIndex(entry.value)} idx`
          } else if (unit === 'gbp' || showIndex) {
            formatted = `${formatGbpPerKg(entry.value)}/kg`
          } else if (unit === 'index') {
            formatted = `${formatPriceIndex(entry.value)} idx`
          } else {
            formatted = formatCurrency(entry.value)
          }
          return (
            <p key={entry.dataKey} style={{ color: entry.color }} className="font-mono text-xs">
              {entry.name}: {formatted}
            </p>
          )
        })}
    </div>
  )
}

export function PriceChart({ data = [], className, unit = 'currency' }) {
  const isMobile = useIsMobile()

  if (!data.length) {
    return (
      <div
        className={cn(
          'w-full min-w-0 flex items-center justify-center text-sm text-text-muted dark:text-text-dark-muted',
          isMobile ? 'h-52' : 'h-64'
        )}
      >
        No price data available
      </div>
    )
  }

  const showDual = unit === 'gbp' && data.some((d) => d.indexPrice != null)
  const lastRealIdx = data.reduce((acc, d, i) => (d.isForecast ? acc : i), -1)

  const chartData = data.map((d, i) => {
    const gbpOrPrice = d.price
    const idx = d.indexPrice ?? (unit === 'index' ? d.price : null)
    return {
      ...d,
      history: d.isForecast ? null : gbpOrPrice,
      forecastLine: d.isForecast
        ? d.forecast ?? gbpOrPrice
        : i === lastRealIdx
          ? gbpOrPrice
          : null,
      indexHistory: d.isForecast ? null : idx,
      indexForecast: d.isForecast
        ? idx
        : i === lastRealIdx
          ? idx
          : null,
    }
  })

  const chartHeight = isMobile ? 220 : 280
  const leftWidth = unit === 'gbp' ? (isMobile ? 48 : 58) : isMobile ? 40 : 48
  const rightWidth = showDual ? (isMobile ? 36 : 44) : 0
  const tickSize = isMobile ? 10 : 11

  return (
    <div
      className={cn('w-full min-w-0 max-w-full overflow-hidden', className)}
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <ComposedChart
          data={chartData}
          margin={{
            top: 8,
            right: showDual ? (isMobile ? 8 : 12) : isMobile ? 4 : 12,
            left: isMobile ? 0 : 4,
            bottom: isMobile ? 4 : 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: tickSize, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            interval={isMobile ? 1 : 0}
            angle={isMobile ? -35 : 0}
            textAnchor={isMobile ? 'end' : 'middle'}
            height={isMobile ? 48 : 30}
          />
          <YAxis
            yAxisId="price"
            width={leftWidth}
            tick={{ fontSize: tickSize, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              unit === 'gbp'
                ? `£${Number(v).toFixed(2)}`
                : unit === 'index'
                  ? `${Math.round(v)}`
                  : `${v}`
            }
            domain={['auto', 'auto']}
          />
          {showDual && (
            <YAxis
              yAxisId="index"
              orientation="right"
              width={rightWidth}
              tick={{ fontSize: tickSize, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v)}`}
              domain={['auto', 'auto']}
            />
          )}
          <Tooltip
            content={(props) => (
              <CustomTooltip {...props} showIndex={showDual} unit={unit} />
            )}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="#52B788"
            fillOpacity={0.12}
            connectNulls
            isAnimationActive={!isMobile}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="history"
            name={unit === 'gbp' ? '£/kg (past)' : 'Past'}
            stroke="#2D6A4F"
            strokeWidth={isMobile ? 1.5 : 2}
            dot={false}
            connectNulls
            isAnimationActive={!isMobile}
            unit={unit}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="forecastLine"
            name={unit === 'gbp' ? '£/kg (forecast)' : 'Forecast'}
            stroke="#F4A261"
            strokeWidth={isMobile ? 1.5 : 2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={!isMobile}
            unit={unit}
          />
          {showDual && (
            <>
              <Line
                yAxisId="index"
                type="monotone"
                dataKey="indexHistory"
                name="Index (past)"
                stroke="#64748B"
                strokeWidth={1.25}
                strokeOpacity={0.85}
                dot={false}
                connectNulls
                isAnimationActive={!isMobile}
              />
              <Line
                yAxisId="index"
                type="monotone"
                dataKey="indexForecast"
                name="Index (forecast)"
                stroke="#94A3B8"
                strokeWidth={1.25}
                strokeDasharray="4 4"
                strokeOpacity={0.8}
                dot={false}
                connectNulls
                isAnimationActive={!isMobile}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RechartsWrapper({ children, height = 256 }) {
  return (
    <div
      style={{ width: '100%', height }}
      className="text-text-primary dark:text-text-dark-primary min-w-0"
    >
      {children}
    </div>
  )
}

export function PopularityBar({ crop, percentage }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <span className="text-sm text-text-primary dark:text-text-dark-primary w-16 sm:w-20 shrink-0 truncate">
        {crop}
      </span>
      <div className="flex-1 min-w-0 h-3 rounded-full bg-surface-alt dark:bg-surface-dark-alt overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-xs sm:text-sm text-text-secondary dark:text-text-dark-secondary w-8 sm:w-10 text-right shrink-0">
        {percentage}%
      </span>
    </div>
  )
}
