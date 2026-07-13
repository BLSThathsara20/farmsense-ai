import { useEffect, useState } from 'react'
import { RefreshCw, Server, Wifi } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { systemService } from '../../api'
import { cn } from '../../lib/utils'

function StatusRow({ label, ok, detail }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border dark:border-border-dark last:border-0">
      <span className="text-sm text-text-secondary dark:text-text-dark-secondary">{label}</span>
      <div className="flex items-center gap-2">
        {detail && (
          <span className="text-xs text-text-muted dark:text-text-dark-muted">{detail}</span>
        )}
        <Badge variant={ok ? 'success' : 'danger'} size="sm">
          {ok ? 'OK' : 'Fail'}
        </Badge>
      </div>
    </div>
  )
}

export function SystemStatusPanel({ className }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await systemService.getStatus()
      setStatus(data)
    } catch (e) {
      setError(e.message || 'Could not reach backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const apiOk = status?.api?.status === 'healthy'
  const dbOk = status?.ready?.database === true
  const mlOk = status?.ready?.ml_model === true
  const liveApi = !status?.mockMode

  return (
    <Card variant="bordered" className={cn('mb-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-ek text-text-primary dark:text-text-dark-primary">
            System status
          </h2>
          <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
            Backend, database &amp; ML model health
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} loading={loading} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="text-sm text-error mb-3" role="alert">
          {error}
        </p>
      )}

      {status && (
        <>
          <StatusRow
            label="API mode"
            ok={liveApi}
            detail={liveApi ? 'Live backend' : 'Mock data'}
          />
          <StatusRow label="API /health" ok={apiOk} />
          <StatusRow label="PostgreSQL" ok={dbOk} />
          <StatusRow label="ML model (RF)" ok={mlOk} />
          <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
            <p className="text-[11px] text-text-muted dark:text-text-dark-muted flex items-center gap-1.5">
              <Server className="h-3 w-3" />
              {status.backendUrl}
            </p>
            <p className="text-[11px] text-text-muted dark:text-text-dark-muted mt-1 flex items-center gap-1.5">
              <Wifi className="h-3 w-3" />
              Checked {new Date(status.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        </>
      )}

      {!status && !error && loading && (
        <p className="text-sm text-text-muted">Checking services…</p>
      )}
    </Card>
  )
}
