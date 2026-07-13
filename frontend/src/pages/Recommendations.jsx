import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Droplets,
  Cloud,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowRight,
  Sprout,
  Trash2,
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { ErrorState, EmptyState } from '../components/shared/EmptyState'
import { CropCard } from '../components/shared/CropCard'
import {
  RecommendationsHero,
  RecommendationsVisualPanel,
} from '../components/shared/RecommendationsVisualPanel'
import { SuitabilityBar } from '../components/charts/SuitabilityBar'
import { useRecommendations } from '../hooks/useMockData'
import { useFarmStore } from '../store/farmStore'
import { useToast } from '../hooks/useToast'
import { recommendationsService, getErrorMessage } from '../api'
import { formatCurrency, formatShortDate } from '../lib/utils'

const FACTOR_META = {
  soil: { icon: Droplets, fallbackTitle: 'Soil status' },
  weather: { icon: Cloud, fallbackTitle: 'Weather forecast' },
  price: { icon: TrendingUp, fallbackTitle: 'Future price' },
  demand: { icon: Users, fallbackTitle: 'Market demand' },
}

function scoreTone(score) {
  if (score >= 80) return 'Good'
  if (score >= 65) return 'OK'
  return 'Watch'
}

function getDecisionFactors(rec) {
  if (rec?.factors?.length) return rec.factors
  return [
    {
      key: 'soil',
      title: 'Soil status',
      score: rec?.soilMatch ?? rec?.confidence ?? 0,
      detail: 'Checked N, P, K, pH and texture against what this crop needs.',
    },
    {
      key: 'weather',
      title: 'Weather forecast',
      score: rec?.weatherFit ?? 0,
      detail: 'Current and near-future growing conditions for your area.',
    },
    {
      key: 'price',
      title: 'Future price',
      score: rec?.priceTrend ?? 0,
      detail: 'Expected market price around harvest / sell time.',
    },
    {
      key: 'demand',
      title: 'Market demand',
      score: rec?.demandSignal ?? 0,
      detail: 'Local demand and risk that too many farms plant the same crop.',
    },
  ]
}

export default function Recommendations() {
  const navigate = useNavigate()
  const toast = useToast()
  const {
    loading,
    error,
    retry,
    recommendations,
    topRecommendation,
    runDate,
    planStatus,
    finalized,
    selectedCropsFromServer,
    finalizedAt,
  } = useRecommendations()
  const selectedCrops = useFarmStore((s) => s.selectedCrops)
  const toggleSelectedCrop = useFarmStore((s) => s.toggleSelectedCrop)
  const setSelectedCrops = useFarmStore((s) => s.setSelectedCrops)
  const confirmCropPlan = useFarmStore((s) => s.confirmCropPlan)
  const cropPlanConfirmedAt = useFarmStore((s) => s.cropPlanConfirmedAt)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isFinalized = finalized || planStatus === 'finalized' || Boolean(cropPlanConfirmedAt)

  useEffect(() => {
    if (loading || !topRecommendation || recommendations.length === 0) return

    if (finalized && selectedCropsFromServer.length > 0) {
      const same =
        selectedCrops.length === selectedCropsFromServer.length &&
        selectedCrops.every((c, i) => c.id === selectedCropsFromServer[i]?.id)
      if (!same) setSelectedCrops(selectedCropsFromServer)
      if (!cropPlanConfirmedAt) {
        useFarmStore.setState({
          cropPlanConfirmedAt: finalizedAt || new Date().toISOString(),
          lastRecommendation: selectedCropsFromServer[0] || topRecommendation,
        })
      }
      return
    }

    if (!finalized && !cropPlanConfirmedAt && selectedCrops.length === 0) {
      setSelectedCrops([topRecommendation])
    }
  }, [
    loading,
    topRecommendation,
    recommendations.length,
    finalized,
    selectedCropsFromServer,
    selectedCrops,
    cropPlanConfirmedAt,
    finalizedAt,
    setSelectedCrops,
  ])

  const activeRec = useMemo(() => {
    if (selectedCrops.length === 0) return topRecommendation
    return selectedCrops.reduce(
      (best, c) => (c.confidence > best.confidence ? c : best),
      selectedCrops[0]
    )
  }, [selectedCrops, topRecommendation])

  const isSelected = (id) => selectedCrops.some((c) => c.id === id)

  const handleConfirm = async () => {
    if (selectedCrops.length === 0) {
      toast.warning('Pick at least one crop', 'Tap the crops you want to plant this season.')
      return
    }
    setConfirming(true)
    try {
      const result = await recommendationsService.confirmPlan(selectedCrops.map((c) => c.id))
      const locked = result?.selectedCrops?.length ? result.selectedCrops : selectedCrops
      confirmCropPlan(locked, result?.finalizedAt)
      const names = locked.map((c) => c.crop).join(' & ')
      toast.success('Plan finalized', `Saved ${names} as your crop plan.`)
      navigate('/dashboard')
    } catch (err) {
      toast.error('Could not finalize plan', getErrorMessage(err, 'Please try again.'))
    } finally {
      setConfirming(false)
    }
  }

  const handleDeletePlan = async () => {
    setDeleting(true)
    try {
      await recommendationsService.deletePlan()
      useFarmStore.setState({
        selectedCrops: [],
        cropPlanConfirmedAt: null,
        lastRecommendation: null,
      })
      setShowDeleteModal(false)
      toast.success('Plan deleted', 'Your crop plan was permanently removed.')
      navigate('/plan')
    } catch (err) {
      toast.error('Could not delete plan', getErrorMessage(err, 'Please try again.'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <SkeletonDashboard />
      </PageWrapper>
    )
  }

  if (error) {
    return (
      <PageWrapper>
        <ErrorState message={error} onRetry={retry} />
      </PageWrapper>
    )
  }

  if (!recommendations.length || !topRecommendation) {
    return (
      <PageWrapper>
        <EmptyState
          icon={Sprout}
          title="No crop plan yet"
          description="Add a soil reading first and we’ll recommend crops that fit your farm."
          actionLabel="Add soil reading"
          onAction={() => navigate('/plan')}
        />
      </PageWrapper>
    )
  }

  const top = activeRec || topRecommendation
  const factors = getDecisionFactors(top)
  const confirmedStamp = cropPlanConfirmedAt || finalizedAt

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-0 flex-1">
      <div className="flex-1 min-w-0 flex flex-col min-h-full">
        <RecommendationsHero
          crop={top.crop}
          confidence={top.confidence}
          profitEstimate={top.profitEstimate}
          isFinalized={isFinalized}
          runLabel={`Generated ${formatShortDate(runDate)}`}
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 !text-white/90 hover:!bg-white/10"
              onClick={() => setShowDeleteModal(true)}
              aria-label="Delete plan permanently"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        />

        <PageWrapper className="!pb-48 md:!pb-36 lg:!max-w-none">
          <div className="hidden lg:flex mb-6 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="ek-label mb-1">Generated {formatShortDate(runDate)}</p>
              <h1 className="ek-headline text-2xl xl:text-3xl text-text-primary dark:text-text-dark-primary">
                Your crop plan
              </h1>
              <p className="text-sm text-text-muted dark:text-text-dark-muted mt-1.5 max-w-xl">
                {isFinalized
                  ? 'This plan is finalized. Run Plan again to get a new draft.'
                  : 'Draft — choose crops, then tap Finalize to save.'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-error hover:bg-error/10"
              onClick={() => setShowDeleteModal(true)}
              aria-label="Delete plan permanently"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>

          <p className="lg:hidden text-sm text-text-muted dark:text-text-dark-muted mb-4 -mt-1">
            {isFinalized
              ? 'Finalized plan — run Plan again for a new draft.'
              : 'Draft — choose crops, then finalize below.'}
          </p>

          {isFinalized && confirmedStamp ? (
            <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-text-primary dark:text-text-dark-primary">
                <span className="font-medium">Plan finalized</span>
                <span className="text-text-muted"> · </span>
                {selectedCrops.map((c) => c.crop).join(', ')}
                <span className="text-text-muted"> · {formatShortDate(confirmedStamp)}</span>
              </p>
            </div>
          ) : (
            <p className="mb-5 text-sm text-text-secondary dark:text-text-dark-secondary">
              Soil steps are saved. Recommendations stay a{' '}
              <span className="font-medium text-text-primary dark:text-text-dark-primary">draft</span>{' '}
              until you confirm.
            </p>
          )}

          {/* Desktop top pick summary (mobile uses hero) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden lg:block mb-6"
          >
            <div className="border-b border-border dark:border-border-dark pb-5">
              <p className="ek-label mb-2">
                {isFinalized
                  ? 'Finalized pick'
                  : selectedCrops.length > 1
                    ? 'Top of your selection'
                    : 'Top pick'}
              </p>
              <h2 className="ek-headline text-3xl xl:text-4xl text-text-primary dark:text-text-dark-primary mb-1">
                {top.crop}
              </h2>
              <p className="ek-mono-data text-lg text-text-secondary dark:text-text-dark-secondary mb-4">
                {formatCurrency(top.profitEstimate)} est. profit
              </p>
              <SuitabilityBar score={top.confidence} label="Overall confidence" />
            </div>
          </motion.div>

          <section className="mb-8">
            <h2 className="font-medium text-text-primary dark:text-text-dark-primary mb-1">
              Why {top.crop}?
            </h2>
            <p className="text-xs text-text-muted dark:text-text-dark-muted mb-4">
              Four checks combined — not soil alone.
            </p>

            <div className="space-y-5">
              {factors.map((factor) => {
                const meta = FACTOR_META[factor.key] || FACTOR_META.soil
                const Icon = meta.icon
                return (
                  <div key={factor.key} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-700 dark:text-emerald-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary dark:text-text-dark-primary">
                            {factor.title || meta.fallbackTitle}
                          </p>
                          <span className="text-[11px] font-medium text-text-muted dark:text-text-dark-muted shrink-0">
                            {scoreTone(factor.score)}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary dark:text-text-dark-secondary mt-0.5 leading-relaxed">
                          {factor.detail}
                        </p>
                        {factor.source && (
                          <p className="text-[10px] text-text-muted dark:text-text-dark-muted mt-1 font-mono">
                            Source · {factor.source}
                          </p>
                        )}
                      </div>
                    </div>
                    <SuitabilityBar score={factor.score} label="" />
                  </div>
                )
              })}
            </div>

            {top.reasoning && (
              <p className="text-xs text-text-muted dark:text-text-dark-muted border-t border-border dark:border-border-dark pt-3 mt-5">
                {top.reasoning}
              </p>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1">
              {isFinalized ? 'Your finalized crops' : 'Choose your crops'}
            </h2>
            <p className="text-xs text-text-muted dark:text-text-dark-muted mb-3">
              {isFinalized
                ? 'Locked in — change only by running a new Plan'
                : 'Select one or more — mix if you have the space'}
            </p>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <CropCard
                  key={rec.id}
                  crop={rec.crop}
                  confidence={rec.confidence}
                  profitEstimate={rec.profitEstimate}
                  rank={rec.rank}
                  compact
                  selectable={!isFinalized}
                  selected={isSelected(rec.id)}
                  onClick={isFinalized ? undefined : () => toggleSelectedCrop(rec)}
                />
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h3 className="font-medium text-text-primary dark:text-text-dark-primary mb-4">
              Planting timeline · {top.crop}
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Sow', value: top.plantingWindow?.sow },
                { label: 'Harvest', value: top.plantingWindow?.harvest },
                { label: 'Sell', value: top.plantingWindow?.sell },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="py-3 border-t border-border dark:border-border-dark"
                >
                  <Badge variant="neutral" size="sm" className="mb-1.5">
                    {label}
                  </Badge>
                  <p className="font-mono text-sm text-text-primary dark:text-text-dark-primary">
                    {value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {top.oversupplyRisk > 0.6 && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-text-primary dark:text-text-dark-primary">
                  Oversupply risk · {top.crop}
                </p>
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-0.5">
                  {Math.round(top.oversupplyRisk * 100)}% of farmers in your district may plant this.
                  Consider diversifying your selection.
                </p>
              </div>
            </div>
          )}

          <div className="h-24 md:h-20" aria-hidden />
        </PageWrapper>

        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:pl-72 lg:pr-[min(42%,440px)] bg-surface/95 dark:bg-surface-dark/95 border-t border-border dark:border-border-dark backdrop-blur-md">
          <div className="max-w-3xl lg:max-w-none mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate">
                {selectedCrops.length === 0
                  ? 'No crops selected'
                  : selectedCrops.map((c) => c.crop).join(', ')}
              </p>
              <p className="text-xs text-text-muted dark:text-text-dark-muted">
                {isFinalized
                  ? 'Finalized plan'
                  : `${selectedCrops.length} crop${selectedCrops.length !== 1 ? 's' : ''} selected · draft`}
              </p>
            </div>
            {isFinalized ? (
              <Button variant="secondary" className="shrink-0" onClick={() => navigate('/plan')}>
                New plan
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                loading={confirming}
                disabled={selectedCrops.length === 0}
                className="shrink-0"
              >
                Finalize plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <RecommendationsVisualPanel
        crop={top.crop}
        confidence={top.confidence}
        profitEstimate={top.profitEstimate}
        isFinalized={isFinalized}
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Delete crop plan?"
      >
        <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-5 leading-relaxed">
          This permanently deletes your draft or finalized recommendations. Soil readings stay saved
          so you can build a new plan anytime.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={deleting}
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1" variant="danger" loading={deleting} onClick={handleDeletePlan}>
            Delete forever
          </Button>
        </div>
      </Modal>
    </div>
  )
}
