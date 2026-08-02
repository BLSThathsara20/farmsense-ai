export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Agricultural price index (GOV.UK) — not a currency amount. */
export function formatPriceIndex(value, decimals = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(decimals)}`
}

/** Farm-gate / wholesale guide in pounds per kilogram. */
export function formatGbpPerKg(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

/** Same guide expressed per 100g (useful for tomatoes / veg). */
export function formatGbpPer100g(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (n < 0.1) {
    return `${Math.round(n * 100)}p`
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...options,
  })
}

export function formatShortDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatPercent(value, decimals = 1) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}
