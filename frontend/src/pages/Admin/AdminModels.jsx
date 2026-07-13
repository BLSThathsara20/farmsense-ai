import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/shared/EmptyState'
import { adminService, getErrorMessage } from '../../api'
import { cn } from '../../lib/utils'

const LAYERS = [
  {
    id: 'soil',
    title: 'L1 Soil RF',
    blurb: 'Random Forest suitability from NPK + climate features.',
  },
  {
    id: 'weather',
    title: 'L2 Hybrid weather',
    blurb: 'LSTM outlook blended with free Open-Meteo agri (ET₀, soil moisture, rain).',
  },
  {
    id: 'price',
    title: 'L3 Crop price',
    blurb: 'GOV.UK crop-specific price index (falls back to LSTM weekly series).',
  },
  {
    id: 'demand',
    title: 'L4 Demand',
    blurb: 'Planting pressure plus optional live UK search-interest nudge.',
  },
  {
    id: 'trends',
    title: 'Trends API',
    blurb: 'Free Google Trends UK + Wikipedia pageviews.',
  },
  {
    id: 'recommendation',
    title: 'Full stack',
    blurb: 'Ranks crops with L1 + hybrid weather + GOV.UK price + demand/Trends.',
  },
]

const FALLBACK_DEFAULTS = {
  soil: {
    N: 90,
    P: 42,
    K: 43,
    temperature: 20.8,
    humidity: 82,
    ph: 6.5,
    rainfall: 202.9,
  },
  weather: {
    crop: 'Tomato',
    countryCode: 'GB',
    district: 'Northumberland',
    temperature: 18,
    rainfall: 40,
    humidity: 75,
  },
  price: { crop: 'Tomato', horizonWeeks: 4 },
  demand: { crop: 'Tomato', oversupplyRisk: 0.35, districtPlanShare: 22 },
  trends: { crop: 'Tomato' },
  recommendation: {
    N: 90,
    P: 42,
    K: 43,
    temperature: 20.8,
    humidity: 82,
    ph: 6.5,
    rainfall: 202.9,
    preferences: ['Tomato', 'Potato'],
    countryCode: 'GB',
    district: 'Northumberland',
  },
}

function pretty(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function ScoreChip({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="rounded-lg border border-border/70 dark:border-border-dark/70 px-2.5 py-2 min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-text-muted dark:text-text-dark-muted mb-0.5 truncate">
        {label}
      </p>
      <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary break-words">
        {value}
      </p>
    </div>
  )
}

function ResultPanel({ result, running, runError }) {
  if (running) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-text-muted py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Running model…
      </div>
    )
  }

  if (!result && !runError) {
    return (
      <p className="text-sm text-text-muted dark:text-text-dark-muted py-8 text-center">
        Edit the JSON on the left, then run to see live highlights and raw JSON.
      </p>
    )
  }

  const highlights = result?.highlights || []
  const recs = result?.recommendations || []
  const topCrops = result?.topCrops || []

  return (
    <>
      {runError && (
        <div className="mb-3 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {runError}
        </div>
      )}

      {result && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant={result.ok ? 'success' : 'danger'} size="sm">
              {result.ok ? 'OK — model responded' : 'Failed'}
            </Badge>
            {result.model && (
              <Badge variant="neutral" size="sm">
                {result.model}
              </Badge>
            )}
            {result.label && (
              <Badge variant="accent" size="sm">
                Predicted: {result.label}
              </Badge>
            )}
            {result.latencyMs != null && (
              <Badge variant="neutral" size="sm">
                {result.latencyMs} ms
              </Badge>
            )}
          </div>

          {result.summary && (
            <p className="text-sm text-text-primary dark:text-text-dark-primary mb-3 leading-relaxed">
              {result.summary}
            </p>
          )}

          {highlights.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {highlights.map((h) => (
                <ScoreChip key={`${h.label}-${h.value}`} label={h.label} value={h.value} />
              ))}
            </div>
          )}

          {topCrops.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-text-secondary mb-1.5">Top soil matches</p>
              <ul className="space-y-1">
                {topCrops.slice(0, 5).map((row) => (
                  <li
                    key={row.crop}
                    className="flex items-center justify-between text-xs font-mono gap-2"
                  >
                    <span className="truncate">{row.crop}</span>
                    <span className="text-text-muted">{(row.probability * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-text-secondary mb-1.5">Ranked recommendations</p>
              <ul className="space-y-2">
                {recs.slice(0, 5).map((rec) => (
                  <li
                    key={`${rec.rank}-${rec.crop}`}
                    className="rounded-lg border border-border/60 dark:border-border-dark/60 px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium">
                        #{rec.rank} {rec.crop}
                      </span>
                      <span className="text-xs font-mono text-primary">{rec.confidence}%</span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Soil {rec.soilMatch} · Weather {rec.weatherFit} · Price {rec.priceTrend} ·
                      Demand {rec.demandSignal}
                    </p>
                    {(rec.factors || [])
                      .filter((f) => ['weather', 'price', 'demand'].includes(f.key))
                      .map((f) => (
                        <p key={f.key} className="text-[10px] text-text-muted mt-1 leading-snug">
                          <span className="font-medium">{f.method}</span>
                          {f.detail ? ` — ${f.detail}` : ''}
                        </p>
                      ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="group">
            <summary className="cursor-pointer text-xs text-text-secondary dark:text-text-dark-secondary mb-2 select-none">
              Raw JSON response
            </summary>
            <pre
              className={cn(
                'overflow-auto max-h-[20rem] rounded-lg border p-3',
                'bg-surface-alt dark:bg-surface-dark-alt',
                'border-border dark:border-border-dark',
                'font-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre-wrap break-words'
              )}
            >
              {pretty(result)}
            </pre>
          </details>
        </>
      )}
    </>
  )
}

export default function AdminModels() {
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState('')
  const [statusLoading, setStatusLoading] = useState(true)
  const [active, setActive] = useState('soil')
  const [texts, setTexts] = useState(() =>
    Object.fromEntries(LAYERS.map((l) => [l.id, pretty(FALLBACK_DEFAULTS[l.id])]))
  )
  const [parseError, setParseError] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [runError, setRunError] = useState('')

  const loadStatus = useCallback(async () => {
    setStatusLoading(true)
    setStatusError('')
    try {
      const data = await adminService.getModelsStatus()
      setStatus(data)
      if (data?.defaults) {
        setTexts((prev) => {
          const next = { ...prev }
          for (const layer of LAYERS) {
            if (data.defaults[layer.id]) {
              next[layer.id] = pretty(data.defaults[layer.id])
            }
          }
          return next
        })
      }
    } catch (err) {
      setStatusError(getErrorMessage(err, 'Could not load model status'))
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const layerMeta = status?.layers?.[active]
  const activeDef = useMemo(() => LAYERS.find((l) => l.id === active), [active])

  const resetPayload = () => {
    const def = status?.defaults?.[active] || FALLBACK_DEFAULTS[active]
    setTexts((t) => ({ ...t, [active]: pretty(def) }))
    setParseError('')
    setRunError('')
    setResult(null)
  }

  const runTest = async () => {
    setParseError('')
    setRunError('')
    setResult(null)
    let payload
    try {
      payload = JSON.parse(texts[active] || '{}')
      if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Payload must be a JSON object')
      }
    } catch (err) {
      setParseError(err.message || 'Invalid JSON')
      return
    }

    setRunning(true)
    try {
      const data = await adminService.testModel(active, payload)
      setResult(data)
      if (!data?.ok) {
        setRunError(data?.error || 'Model returned an error')
      }
    } catch (err) {
      setRunError(getErrorMessage(err, 'Model test failed'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <PageWrapper>
      <header className="mb-5 sm:mb-6">
        <p className="ek-label mb-1 flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Model lab
        </p>
        <h1 className="ek-headline text-2xl sm:text-3xl">Test APIs & models</h1>
        <p className="mt-1.5 text-sm text-text-secondary dark:text-text-dark-secondary max-w-2xl">
          Live playground for each prediction layer — including Open-Meteo agri, GOV.UK crop
          indices, and UK Trends. Inspect scored highlights first; open raw JSON if you need
          everything.
        </p>
      </header>

      {statusLoading ? (
        <Skeleton variant="card" className="h-24 mb-5" />
      ) : statusError ? (
        <ErrorState message={statusError} onRetry={loadStatus} />
      ) : (
        <Card variant="bordered" className="!p-4 mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant={status?.heavy ? 'success' : 'warning'} size="sm">
              {status?.heavy ? 'Heavy mode (LSTM)' : 'Light mode'}
            </Badge>
            <span className="text-xs text-text-muted dark:text-text-dark-muted font-mono truncate">
              {status?.artifactsDir}
            </span>
          </div>
          {(status?.enrichment || []).length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {status.enrichment.map((item) => (
                <li key={item}>
                  <Badge variant="neutral" size="sm">
                    {item}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {LAYERS.map((layer) => {
              const meta = status?.layers?.[layer.id]
              const ready = meta?.ready
              return (
                <div
                  key={layer.id}
                  className="rounded-lg border border-border/70 dark:border-border-dark/70 px-2.5 py-2 min-w-0"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {ready ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-error shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">{layer.title}</span>
                  </div>
                  <p className="text-[10px] text-text-muted truncate font-mono">
                    {meta?.model || '—'}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-0.5 px-0.5">
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => {
              setActive(layer.id)
              setParseError('')
              setRunError('')
              setResult(null)
            }}
            className={cn(
              'shrink-0 px-3 py-2 rounded-md text-sm transition-colors',
              active === layer.id
                ? 'bg-primary text-white'
                : 'bg-surface-alt dark:bg-surface-dark-alt text-text-secondary dark:text-text-dark-secondary'
            )}
          >
            {layer.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        <Card variant="bordered" className="!p-4 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold">{activeDef?.title}</h2>
              <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
                {activeDef?.blurb}
              </p>
              {(active === 'demand' ||
                active === 'trends' ||
                active === 'weather' ||
                active === 'price') && (
                <p className="text-[11px] text-text-muted mt-1">
                  Valid crops: {(status?.knownCrops || ['Tomato', 'Potato', 'Onion', 'Cabbage', 'Carrot', 'Beans', 'Chili', 'Maize']).join(', ')}
                </p>
              )}
              {layerMeta?.artefact && (
                <p className="text-[11px] font-mono text-text-muted mt-1">
                  {layerMeta.artefact.file}
                  {layerMeta.artefact.exists
                    ? ` · ${(layerMeta.artefact.bytes / 1024).toFixed(0)} KB`
                    : ' · missing'}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={resetPayload} disabled={running}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          <label className="block text-xs font-medium text-text-secondary mb-1.5" htmlFor="model-json">
            Request JSON
          </label>
          <textarea
            id="model-json"
            value={texts[active]}
            onChange={(e) => setTexts((t) => ({ ...t, [active]: e.target.value }))}
            spellCheck={false}
            rows={16}
            className={cn(
              'w-full font-mono text-xs sm:text-sm rounded-lg border px-3 py-2.5',
              'bg-surface-alt dark:bg-surface-dark-alt',
              'border-border dark:border-border-dark',
              'text-text-primary dark:text-text-dark-primary',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[220px]'
            )}
          />
          {parseError && (
            <p className="mt-2 text-xs text-error" role="alert">
              {parseError}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="accent" size="md" onClick={runTest} loading={running} disabled={running}>
              {!running && <Play className="h-4 w-4" />}
              Run {activeDef?.title}
            </Button>
          </div>
        </Card>

        <Card variant="bordered" className="!p-4 min-w-0">
          <h2 className="font-display text-lg font-semibold mb-3">Response</h2>
          <ResultPanel result={result} running={running} runError={runError} />
        </Card>
      </div>
    </PageWrapper>
  )
}
