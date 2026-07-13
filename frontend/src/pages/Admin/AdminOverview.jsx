import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Sprout, CheckCircle2, FileEdit, MapPin } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { SkeletonDashboard } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/shared/EmptyState'
import { AdminDataModeSwitch } from '../../components/admin/AdminDataModeSwitch'
import { adminService, getErrorMessage } from '../../api'
import { useAuthStore } from '../../store/authStore'
import { useAdminDataMode } from '../../hooks/useAdminDataMode'
import { formatDate, getGreeting } from '../../lib/utils'

export default function AdminOverview() {
  const user = useAuthStore((s) => s.user)
  const { mode, setMode } = useAdminDataMode()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const overview = await adminService.getOverview({ dataMode: mode })
      setData(overview)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load admin overview'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [mode])

  const totals = data?.totals || {}
  const cards = [
    { label: 'Farmers', value: totals.farmers ?? 0, icon: Users },
    { label: 'Active', value: totals.active ?? 0, icon: CheckCircle2 },
    { label: 'With soil data', value: totals.withSoilData ?? 0, icon: Sprout },
    { label: 'Finalized plans', value: totals.finalizedPlans ?? 0, icon: CheckCircle2 },
    { label: 'Draft plans', value: totals.draftPlans ?? 0, icon: FileEdit },
  ]

  return (
    <PageWrapper>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="ek-label mb-1">{formatDate(new Date())}</p>
          <h1 className="ek-headline text-2xl sm:text-3xl">
            {getGreeting()}, {user?.name || 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">
            Farmer activity overview. Soil chemistry and personal plan details stay private.
          </p>
        </div>
        <AdminDataModeSwitch mode={mode} onChange={setMode} className="shrink-0 self-start" />
      </div>

      {mode === 'dummy' && (
        <p className="mb-4 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          Showing sample dummy data. Switch to Live data for real farmers.
        </p>
      )}

      {loading ? (
        <SkeletonDashboard />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            {cards.map(({ label, value, icon: Icon }) => (
              <Card key={label} variant="bordered" className="!p-4">
                <div className="flex items-center gap-2 mb-2 text-text-muted dark:text-text-dark-muted">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <p className="font-display text-2xl font-semibold text-text-primary dark:text-text-dark-primary">
                  {value}
                </p>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Farmers by district</h2>
            <Link to="/admin/farmers" className="text-sm text-primary hover:underline">
              View all farmers
            </Link>
          </div>

          <Card variant="bordered" className="!p-0 overflow-hidden">
            {(data?.byDistrict || []).length === 0 ? (
              <p className="p-5 text-sm text-text-muted dark:text-text-dark-muted">
                No farmers registered yet.
              </p>
            ) : (
              <ul className="divide-y divide-border dark:divide-border-dark">
                {data.byDistrict.map((row) => (
                  <li
                    key={row.district}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                      <span className="text-sm font-medium truncate">{row.district}</span>
                    </div>
                    <span className="text-sm text-text-secondary dark:text-text-dark-secondary">
                      {row.farmers}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </PageWrapper>
  )
}
