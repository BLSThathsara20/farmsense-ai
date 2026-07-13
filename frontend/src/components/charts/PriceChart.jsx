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
import { formatCurrency, formatPriceIndex } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { cn } from '../../lib/utils'

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const fmt = unit === 'index' ? formatPriceIndex : formatCurrency

  return (
    <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-md px-3 py-2 shadow-card text-xs sm:text-sm max-w-[200px]">
      <p className="font-medium text-text-primary dark:text-text-dark-primary mb-1 truncate">
        {label}
      </p>
      {payload
        .filter((entry) => entry.value != null)
        .map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }} className="font-mono text-xs">
            {entry.name}: {fmt(entry.value)}
            {unit === 'index' ? ' idx' : ''}
          </p>
        ))}
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

  const chartData = data.map((d) => ({
    ...d,
    history: d.isForecast ? null : d.price,
    forecastLine: d.isForecast ? d.forecast ?? d.price : null,
  }))

  const chartHeight = isMobile ? 208 : 256
  const yAxisWidth = isMobile ? 40 : 48
  const tickSize = isMobile ? 10 : 11
  const fmtTick = (v) =>
    unit === 'index' ? `${Math.round(v)}` : isMobile ? `${v}` : formatCurrency(v)

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
            right: isMobile ? 4 : 12,
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
            width={yAxisWidth}
            tick={{ fontSize: tickSize, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtTick}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="#52B788"
            fillOpacity={0.1}
            connectNulls
            isAnimationActive={!isMobile}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="var(--color-background)"
            fillOpacity={1}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="history"
            name="Past"
            stroke="#2D6A4F"
            strokeWidth={isMobile ? 1.5 : 2}
            dot={false}
            connectNulls
            isAnimationActive={!isMobile}
          />
          <Line
            type="monotone"
            dataKey="forecastLine"
            name="Forecast"
            stroke="#F4A261"
            strokeWidth={isMobile ? 1.5 : 2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={!isMobile}
          />
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
