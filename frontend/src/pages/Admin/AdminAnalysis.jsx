import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { SkeletonDashboard } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/shared/EmptyState'
import { AdminDataModeSwitch } from '../../components/admin/AdminDataModeSwitch'
import { adminService, getErrorMessage } from '../../api'
import { useAdminDataMode } from '../../hooks/useAdminDataMode'

const PLAN_COLORS = {
  Finalized: '#16a34a',
  Draft: '#d97706',
  'No plan': '#94a3b8',
}

function SimpleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-md px-3 py-2 shadow-card text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color || entry.fill }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

function RateCard({ label, value, hint }) {
  return (
    <Card variant="bordered" className="!p-4">
      <p className="text-xs font-medium text-text-muted dark:text-text-dark-muted mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-text-primary dark:text-text-dark-primary">
        {value}
        <span className="text-base font-normal text-text-muted">%</span>
      </p>
      {hint && (
        <p className="text-[11px] text-text-muted dark:text-text-dark-muted mt-1">{hint}</p>
      )}
    </Card>
  )
}

export default function AdminAnalysis() {
  const { mode, setMode } = useAdminDataMode()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const analytics = await adminService.getAnalytics({ dataMode: mode })
      setData(analytics)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load analytics'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [mode])

  const rates = data?.rates || {}
  const totals = data?.totals || {}
  const planStatus = data?.planStatus || []
  const byDistrict = (data?.byDistrict || []).slice(0, 10)
  const topCrops = data?.topCrops || []
  const signups = data?.signupsByMonth || []
  const farmSize = data?.farmSize || {}
  const insights = data?.insights || []

  return (
    <PageWrapper>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="ek-headline text-2xl sm:text-3xl">Analysis</h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">
            Platform adoption and crop-plan trends. Soil chemistry stays private.
          </p>
        </div>
        <AdminDataModeSwitch mode={mode} onChange={setMode} className="shrink-0 self-start" />
      </div>

      {mode === 'dummy' && (
        <p className="mb-4 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          Showing sample dummy analytics. Switch to Live data for real farmers.
        </p>
      )}

      {loading ? (
        <SkeletonDashboard />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <RateCard label="Soil adoption" value={rates.soilAdoptionPct ?? 0} hint={`${totals.withSoilData ?? 0} farmers`} />
            <RateCard label="Finalized plans" value={rates.finalizedPct ?? 0} hint={`${totals.finalizedPlans ?? 0} farms`} />
            <RateCard label="Draft plans" value={rates.draftPct ?? 0} hint={`${totals.draftPlans ?? 0} farms`} />
            <RateCard label="No plan yet" value={rates.noPlanPct ?? 0} hint={`${totals.noPlan ?? 0} farms`} />
            <RateCard label="Active accounts" value={rates.activePct ?? 0} hint={`${totals.active ?? 0} / ${totals.farmers ?? 0}`} />
          </div>

          {insights.length > 0 && (
            <Card variant="bordered" className="!p-5 mb-6">
              <h2 className="font-display text-base font-semibold mb-3">Key insights</h2>
              <ul className="space-y-2">
                {insights.map((line) => (
                  <li
                    key={line}
                    className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed pl-3 border-l-2 border-primary/40"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card variant="bordered" className="!p-5">
              <h2 className="font-display text-base font-semibold mb-1">Plan status</h2>
              <p className="text-xs text-text-muted mb-4">Where farmers are in the crop-plan flow</p>
              {planStatus.every((p) => !p.count) ? (
                <p className="text-sm text-text-muted py-10 text-center">No plan data yet</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planStatus}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {planStatus.map((entry) => (
                          <Cell key={entry.status} fill={PLAN_COLORS[entry.status] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip content={<SimpleTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 -mt-2">
                    {planStatus.map((p) => (
                      <span key={p.status} className="text-xs text-text-muted flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: PLAN_COLORS[p.status] }}
                        />
                        {p.status} ({p.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card variant="bordered" className="!p-5">
              <h2 className="font-display text-base font-semibold mb-1">Top finalized crops</h2>
              <p className="text-xs text-text-muted mb-4">Crop names from finalized plans only</p>
              {topCrops.length === 0 ? (
                <p className="text-sm text-text-muted py-10 text-center">No finalized crops yet</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCrops} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="crop"
                        width={72}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip content={<SimpleTooltip />} />
                      <Bar dataKey="farmers" name="Farms" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card variant="bordered" className="!p-5">
              <h2 className="font-display text-base font-semibold mb-1">Farmers by district</h2>
              <p className="text-xs text-text-muted mb-4">Top districts (short names only)</p>
              {byDistrict.length === 0 ? (
                <p className="text-sm text-text-muted py-10 text-center">No districts yet</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byDistrict} layout="vertical" margin={{ left: 4, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="district"
                        width={110}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip content={<SimpleTooltip />} />
                      <Bar dataKey="farmers" name="Farmers" fill="#0f766e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card variant="bordered" className="!p-5">
              <h2 className="font-display text-base font-semibold mb-1">Sign-ups over time</h2>
              <p className="text-xs text-text-muted mb-4">New farmer accounts by month</p>
              {signups.length === 0 ? (
                <p className="text-sm text-text-muted py-10 text-center">No sign-up history yet</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={signups} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={58} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<SimpleTooltip />} />
                      <Bar dataKey="farmers" name="Sign-ups" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card variant="bordered" className="!p-5">
            <h2 className="font-display text-base font-semibold mb-3">Farm size summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Average</p>
                <p className="font-display text-xl font-semibold">
                  {farmSize.avgHa != null ? `${farmSize.avgHa} ha` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Smallest</p>
                <p className="font-display text-xl font-semibold">
                  {farmSize.minHa != null ? `${farmSize.minHa} ha` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Largest</p>
                <p className="font-display text-xl font-semibold">
                  {farmSize.maxHa != null ? `${farmSize.maxHa} ha` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Reported</p>
                <p className="font-display text-xl font-semibold">{farmSize.reported ?? 0}</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </PageWrapper>
  )
}
