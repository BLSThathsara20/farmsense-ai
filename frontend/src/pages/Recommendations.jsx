import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Cloud,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { ErrorState } from '../components/shared/EmptyState'
import { CropCard } from '../components/shared/CropCard'
import { SuitabilityBar } from '../components/charts/SuitabilityBar'
import { useRecommendations } from '../hooks/useMockData'
import { useFarmStore } from '../store/farmStore'
import { useToast } from '../hooks/useToast'
import { formatCurrency, formatShortDate } from '../lib/utils'

const reasonIcons = [
  { key: 'soilMatch', label: 'Soil match', icon: Droplets },
  { key: 'weatherFit', label: 'Weather fit', icon: Cloud },
  { key: 'priceTrend', label: 'Price trend', icon: TrendingUp },
  { key: 'demandSignal', label: 'Demand signal', icon: Users },
]

export default function Recommendations() {
  const navigate = useNavigate()
  const toast = useToast()
  const { loading, error, retry, recommendations, topRecommendation, runDate } =
    useRecommendations()
  const selectedCrops = useFarmStore((s) => s.selectedCrops)
  const toggleSelectedCrop = useFarmStore((s) => s.toggleSelectedCrop)
  const setSelectedCrops = useFarmStore((s) => s.setSelectedCrops)
  const confirmCropPlan = useFarmStore((s) => s.confirmCropPlan)
  const cropPlanConfirmedAt = useFarmStore((s) => s.cropPlanConfirmedAt)

  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Pre-select top pick on first visit
  useEffect(() => {
    if (!loading && topRecommendation && selectedCrops.length === 0 && !cropPlanConfirmedAt) {
      setSelectedCrops([topRecommendation])
    }
  }, [loading, topRecommendation, selectedCrops.length, cropPlanConfirmedAt, setSelectedCrops])

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
    await new Promise((r) => setTimeout(r, 600))
    confirmCropPlan(selectedCrops)
    setConfirming(false)
    const names = selectedCrops.map((c) => c.crop).join(' & ')
    toast.success('Crop plan locked in', `You're going with ${names}.`)
    navigate('/dashboard')
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

  const top = activeRec || topRecommendation

  return (
    <div className="flex flex-col min-h-full">
      <PageWrapper className="pb-36">
        <div className="mb-6">
          <p className="ek-label mb-1">Generated {formatShortDate(runDate)}</p>
          <h1 className="ek-headline text-2xl text-text-primary dark:text-text-dark-primary">
            Your crop plan
          </h1>
          <p className="text-sm text-text-muted dark:text-text-dark-muted mt-1.5">
            Tap crops below to choose what you&apos;ll plant
          </p>
        </div>

        {cropPlanConfirmedAt && (
          <Card variant="highlight" className="mb-4 bg-primary/5">
            <p className="text-sm text-text-primary dark:text-text-dark-primary">
              <span className="font-medium">Plan confirmed</span> ·{' '}
              {selectedCrops.map((c) => c.crop).join(', ')} ·{' '}
              {formatShortDate(cropPlanConfirmedAt)}
            </p>
          </Card>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card variant="featured" className="mb-4">
            <Badge variant="primary" size="sm" className="mb-2">
              {selectedCrops.length > 1 ? 'Top of your selection' : 'Top pick'}
            </Badge>
            <h2 className="ek-headline text-3xl text-text-primary dark:text-text-dark-primary mb-1">
              {top.crop}
            </h2>
            <p className="ek-mono-data text-xl text-text-secondary dark:text-text-dark-secondary mb-4">
              {formatCurrency(top.profitEstimate)} est. profit
            </p>
            <SuitabilityBar score={top.confidence} label="Confidence" />
          </Card>
        </motion.div>

        <Card variant="bordered" className="mb-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between min-h-[48px]"
            aria-expanded={expanded}
          >
            <span className="font-medium text-text-primary dark:text-text-dark-primary">
              Why {top.crop}?
            </span>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-text-muted" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-muted" />
            )}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3 border-t border-border dark:border-border-dark pt-4 overflow-hidden"
              >
                {reasonIcons.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-text-secondary dark:text-text-dark-secondary flex-1">
                      {label}
                    </span>
                    <span className="font-mono text-sm font-medium">{top[key]}%</span>
                  </div>
                ))}
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary pt-2">
                  {top.reasoning}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Selectable crop list */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1">
            Choose your crops
          </h2>
          <p className="text-xs text-text-muted dark:text-text-dark-muted mb-3">
            Select one or more — mix if you have the space
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
                selectable
                selected={isSelected(rec.id)}
                onClick={() => toggleSelectedCrop(rec)}
              />
            ))}
          </div>
        </div>

        <Card variant="bordered" className="mb-6">
          <h3 className="font-medium text-text-primary dark:text-text-dark-primary mb-4">
            Planting timeline · {top.crop}
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Sow', value: top.plantingWindow.sow },
              { label: 'Harvest', value: top.plantingWindow.harvest },
              { label: 'Sell', value: top.plantingWindow.sell },
            ].map(({ label, value }) => (
              <div key={label}>
                <Badge variant="neutral" size="sm" className="mb-1">
                  {label}
                </Badge>
                <p className="font-mono text-sm text-text-primary dark:text-text-dark-primary">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {top.oversupplyRisk > 0.6 && (
          <Card className="mb-6 bg-accent/10 border border-accent/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium text-text-primary dark:text-text-dark-primary">
                  Oversupply risk · {top.crop}
                </p>
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
                  {Math.round(top.oversupplyRisk * 100)}% of farmers in your district may plant this.
                  Consider diversifying your selection.
                </p>
              </div>
            </div>
          </Card>
        )}
      </PageWrapper>

      {/* Confirm bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:pl-72 bg-surface/95 dark:bg-surface-dark/95 border-t border-border dark:border-border-dark backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate">
              {selectedCrops.length === 0
                ? 'No crops selected'
                : selectedCrops.map((c) => c.crop).join(', ')}
            </p>
            <p className="text-xs text-text-muted dark:text-text-dark-muted">
              {selectedCrops.length} crop{selectedCrops.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <Button
            onClick={handleConfirm}
            loading={confirming}
            disabled={selectedCrops.length === 0}
            className="shrink-0"
          >
            Confirm plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
