import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ErrorState } from '../../components/shared/EmptyState'
import { AdminDataModeSwitch } from '../../components/admin/AdminDataModeSwitch'
import { adminService, getErrorMessage } from '../../api'
import { useToast } from '../../hooks/useToast'
import { useAdminDataMode } from '../../hooks/useAdminDataMode'
import { formatDate } from '../../lib/utils'

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border dark:border-border-dark last:border-0">
      <span className="text-sm text-text-muted dark:text-text-dark-muted">{label}</span>
      <span className="text-sm font-medium text-right text-text-primary dark:text-text-dark-primary">
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function AdminFarmerDetail() {
  const { farmerId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { mode, setMode } = useAdminDataMode()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')
  const [farmer, setFarmer] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.getFarmer(farmerId, { dataMode: mode })
      setFarmer(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load farmer'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [farmerId, mode])

  const toggleActive = async () => {
    if (!farmer) return
    setSaving(true)
    try {
      const updated = await adminService.setFarmerActive(farmer.id, !farmer.isActive, {
        dataMode: mode,
      })
      setFarmer(updated)
      toast.success(
        updated.isActive ? 'Account activated' : 'Account deactivated',
        updated.isActive
          ? 'This farmer can sign in again.'
          : 'They will see a message to contact admin when signing in.'
      )
    } catch (err) {
      toast.error('Update failed', getErrorMessage(err, 'Could not update account'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!farmer) return
    setDeleting(true)
    try {
      await adminService.deleteFarmer(farmer.id, { dataMode: mode })
      setShowDeleteModal(false)
      toast.success('Farmer deleted', `${farmer.name || farmer.email} was permanently removed.`)
      navigate('/admin/farmers')
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err, 'Could not delete farmer'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-end mb-4">
          <AdminDataModeSwitch mode={mode} onChange={setMode} />
        </div>
        <p className="text-sm text-text-muted">Loading farmer…</p>
      </PageWrapper>
    )
  }

  if (error || !farmer) {
    return (
      <PageWrapper>
        <div className="flex justify-end mb-4">
          <AdminDataModeSwitch mode={mode} onChange={setMode} />
        </div>
        <ErrorState message={error || 'Not found'} onRetry={load} />
        <Link to="/admin/farmers" className="inline-flex items-center gap-1 mt-4 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to farmers
        </Link>
      </PageWrapper>
    )
  }

  const planLabel =
    farmer.finalized || farmer.planStatus === 'finalized'
      ? 'Finalized'
      : farmer.planStatus === 'draft'
        ? 'Draft'
        : 'None'

  return (
    <PageWrapper>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <Link
          to="/admin/farmers"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> Farmers
        </Link>
        <AdminDataModeSwitch mode={mode} onChange={setMode} />
      </div>

      {mode === 'dummy' && (
        <p className="mb-4 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          Showing sample dummy data. Switch to Live data for real farmers.
        </p>
      )}

      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="ek-headline text-2xl sm:text-3xl">{farmer.name || 'Unnamed farmer'}</h1>
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1">
            {farmer.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {farmer.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="danger">Inactive</Badge>
          )}
          <Badge variant={planLabel === 'Finalized' ? 'success' : 'neutral'}>{planLabel}</Badge>
        </div>
      </div>

      <Card variant="bordered" className="!p-5 mb-4">
        <h2 className="font-display text-base font-semibold mb-2">Account</h2>
        <Row label="Joined" value={farmer.createdAt ? formatDate(farmer.createdAt) : null} />
        <Row label="Last login" value={farmer.lastLoginAt ? formatDate(farmer.lastLoginAt) : 'Never'} />
        <Row label="District" value={farmer.district} />
        <Row label="Farm size" value={farmer.farmSize != null ? `${farmer.farmSize} ha` : null} />
        <Row label="Country" value={farmer.countryCode} />
      </Card>

      <Card variant="bordered" className="!p-5 mb-6">
        <h2 className="font-display text-base font-semibold mb-2">Plan summary</h2>
        <p className="text-xs text-text-muted dark:text-text-dark-muted mb-3">
          Soil NPK, pH, and recommendation scores are not shown for privacy.
        </p>
        <Row label="Has soil data" value={farmer.hasSoilData ? 'Yes' : 'No'} />
        <Row label="Soil readings" value={String(farmer.soilReadingsCount ?? 0)} />
        <Row label="Plan status" value={planLabel} />
        <Row label="Top crop" value={farmer.topCrop} />
        <Row label="Last plan" value={farmer.lastPlanAt ? formatDate(farmer.lastPlanAt) : null} />
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant={farmer.isActive ? 'secondary' : 'primary'}
          loading={saving}
          onClick={toggleActive}
          disabled={mode === 'dummy' || deleting}
          className="sm:flex-1"
        >
          {farmer.isActive ? 'Deactivate account' : 'Reactivate account'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowDeleteModal(true)}
          disabled={mode === 'dummy' || saving}
          className="sm:flex-1 !text-error border-error/30 hover:!bg-error/5"
        >
          Delete farmer
        </Button>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Delete this farmer?"
      >
        <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-5 leading-relaxed">
          This permanently removes <strong>{farmer.name || farmer.email}</strong>, including their
          farm profile, soil readings, and crop plans. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={deleting}
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 !bg-error hover:!bg-error/90"
            loading={deleting}
            onClick={confirmDelete}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
