import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState, EmptyState } from '../../components/shared/EmptyState'
import { AdminDataModeSwitch } from '../../components/admin/AdminDataModeSwitch'
import { adminService, getErrorMessage } from '../../api'
import { useAdminDataMode } from '../../hooks/useAdminDataMode'
import { formatDate } from '../../lib/utils'

function planBadge(farmer) {
  if (farmer.finalized || farmer.planStatus === 'finalized') {
    return <Badge variant="success">Finalized</Badge>
  }
  if (farmer.planStatus === 'draft') {
    return <Badge variant="warning">Draft</Badge>
  }
  return <Badge variant="neutral">No plan</Badge>
}

export default function AdminFarmers() {
  const { mode, setMode } = useAdminDataMode()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminService.listFarmers({
        q: search,
        page,
        limit: 20,
        dataMode: mode,
      })
      setData(result)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load farmers'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [search, page, mode])

  const onSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setSearch(q.trim())
  }

  return (
    <PageWrapper>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ek-headline text-2xl sm:text-3xl">Farmers</h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">
            District only — no full address or soil readings.
          </p>
        </div>
        <AdminDataModeSwitch mode={mode} onChange={setMode} className="shrink-0 self-start" />
      </div>

      {mode === 'dummy' && (
        <p className="mb-4 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          Showing sample dummy data. Switch to Live data for real farmers.
        </p>
      )}

      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <div className="flex-1">
          <Input
            label="Search"
            icon={Search}
            placeholder="Name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
      </form>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && !loading && (!data?.items || data.items.length === 0) && (
        <EmptyState
          title="No farmers found"
          description={
            search
              ? 'Try a different search.'
              : mode === 'dummy'
                ? 'No dummy farmers match.'
                : 'Farmers will appear here after they register.'
          }
        />
      )}

      {!error && data?.items?.length > 0 && (
        <Card variant="bordered" className="!p-0 overflow-hidden">
          <ul className="divide-y divide-border dark:divide-border-dark">
            {data.items.map((farmer) => (
              <li key={farmer.id}>
                <Link
                  to={`/admin/farmers/${farmer.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-alt/60 dark:hover:bg-surface-dark-alt/60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{farmer.name || 'Unnamed'}</p>
                      {!farmer.isActive && <Badge variant="danger">Inactive</Badge>}
                      {planBadge(farmer)}
                    </div>
                    <p className="text-xs text-text-muted dark:text-text-dark-muted truncate mt-0.5">
                      {farmer.email}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-text-dark-secondary mt-1">
                      {[farmer.district, farmer.farmSize ? `${farmer.farmSize} ha` : null]
                        .filter(Boolean)
                        .join(' · ') || 'No district'}
                      {farmer.createdAt ? ` · Joined ${formatDate(farmer.createdAt)}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-text-muted">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= data.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </PageWrapper>
  )
}
