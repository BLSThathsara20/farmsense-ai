import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
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
  CalendarDays,
  Scissors,
  Banknote,
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { DatePicker, isValidIsoDate, isoDateInRange } from '../components/ui/DatePicker'
import { Modal } from '../components/ui/Modal'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { DemoTag } from '../components/shared/DemoTag'
import { ErrorState, EmptyState } from '../components/shared/EmptyState'
import { CropCard } from '../components/shared/CropCard'
import {
  RecommendationsHero,
  RecommendationsVisualPanel,
  PLAN_ASIDE_RIGHT_CLASS,
} from '../components/shared/RecommendationsVisualPanel'
import { SuitabilityBar } from '../components/charts/SuitabilityBar'
import { useRecommendations } from '../hooks/useMockData'
import { useFarmStore } from '../store/farmStore'
import { useSimpleMode } from '../hooks/useSimpleMode'
import { useToast } from '../hooks/useToast'
import { recommendationsService, getErrorMessage, apiConfig } from '../api'
import { formatCurrency, formatShortDate, cn } from '../lib/utils'

const FACTOR_META = {
  soil: { icon: Droplets, fallbackTitle: 'Soil status' },
  weather: { icon: Cloud, fallbackTitle: 'Weather forecast' },
  price: { icon: TrendingUp, fallbackTitle: 'Future price (£)' },
  demand: { icon: Users, fallbackTitle: 'Demand and community pressure' },
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
      title: 'Future price (£)',
      score: rec?.priceTrend ?? 0,
      detail: 'Expected farm-gate guide price around harvest / sell time.',
    },
    {
      key: 'demand',
      title: 'Demand and community pressure',
      score: rec?.demandSignal ?? 0,
      detail: 'Public search interest and district planting pressure for this crop.',
    },
  ]
}

export function RecommendationsRedirect() {
  const activePlanId = useFarmStore((s) => s.activePlanId)
  if (activePlanId) return <Navigate to={`/plans/${activePlanId}`} replace />
  return <Navigate to="/plans" replace />
}

export default function Recommendations() {
  const { planId: routePlanId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const simpleMode = useSimpleMode()
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
    planId: loadedPlanId,
    title: planTitle,
    plantedDate: plantedDateFromServer,
    effectivePlantedDate,
    generatedPlantedDate,
    plantedDateSource,
    reminders: remindersFromServer,
  } = useRecommendations(routePlanId)
  const planId = routePlanId || loadedPlanId
  const selectedCrops = useFarmStore((s) => s.selectedCrops)
  const toggleSelectedCrop = useFarmStore((s) => s.toggleSelectedCrop)
  const setSelectedCrops = useFarmStore((s) => s.setSelectedCrops)
  const confirmCropPlan = useFarmStore((s) => s.confirmCropPlan)
  const cropPlanConfirmedAt = useFarmStore((s) => s.cropPlanConfirmedAt)
  const setActivePlanId = useFarmStore((s) => s.setActivePlanId)
  const notifications = useFarmStore((s) => s.notifications)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [plantedDate, setPlantedDate] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [dateTouched, setDateTouched] = useState(false)

  const plantDateMin = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 2)
    return d
  }, [])
  const plantDateMax = useMemo(() => new Date(), [])

  const baselinePlantedDate = useMemo(() => {
    const stored = plantedDateFromServer ? String(plantedDateFromServer).slice(0, 10) : ''
    if (stored) return stored
    const effective = effectivePlantedDate ? String(effectivePlantedDate).slice(0, 10) : ''
    if (effective) return effective
    const generated = generatedPlantedDate ? String(generatedPlantedDate).slice(0, 10) : ''
    if (generated) return generated
    return runDate ? String(runDate).slice(0, 10) : ''
  }, [plantedDateFromServer, effectivePlantedDate, generatedPlantedDate, runDate])

  const dateError = useMemo(() => {
    if (!dateTouched && !plantedDate) return ''
    if (!plantedDate) return 'Pick the day you planted.'
    if (!isValidIsoDate(plantedDate)) return 'That date is not valid.'
    if (!isoDateInRange(plantedDate, { minDate: plantDateMin, maxDate: plantDateMax })) {
      return 'Use a date from the last 2 years, not in the future.'
    }
    return ''
  }, [dateTouched, plantedDate, plantDateMin, plantDateMax])

  const canUpdateDates =
    Boolean(planId) &&
    Boolean(plantedDate) &&
    !dateError &&
    plantedDate !== baselinePlantedDate

  const isFinalized = finalized || planStatus === 'finalized'

  useEffect(() => {
    if (planId) setActivePlanId(planId)
  }, [planId, setActivePlanId])

  useEffect(() => {
    // Prefer farmer-set date; otherwise show plan generated date as planted date
    setPlantedDate(baselinePlantedDate || '')
    setDateTouched(false)
  }, [baselinePlantedDate, planId])

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

    if (!finalized && selectedCrops.length === 0) {
      setSelectedCrops([topRecommendation])
      useFarmStore.setState({ cropPlanConfirmedAt: null })
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
    planId,
  ])

  const activeRec = useMemo(() => {
    if (selectedCrops.length === 0) return topRecommendation
    return selectedCrops.reduce(
      (best, c) => (c.confidence > best.confidence ? c : best),
      selectedCrops[0]
    )
  }, [selectedCrops, topRecommendation])

  // Prefer live server window (after schedule save) over stale store selection
  const top = useMemo(() => {
    const base = activeRec || topRecommendation
    if (!base) return null
    const fresh =
      recommendations.find((r) => r.id === base.id) ||
      selectedCropsFromServer.find((r) => r.id === base.id) ||
      (topRecommendation?.id === base.id ? topRecommendation : null)
    if (!fresh) return base
    return {
      ...base,
      ...fresh,
      plantingWindow: fresh.plantingWindow || base.plantingWindow,
      reminders: fresh.reminders || base.reminders,
    }
  }, [activeRec, topRecommendation, recommendations, selectedCropsFromServer])

  const reminders = useMemo(() => {
    const fromServer = remindersFromServer || []
    if (fromServer.length) return fromServer
    return top?.reminders || []
  }, [remindersFromServer, top])

  const isSelected = (id) => selectedCrops.some((c) => c.id === id)

  const handleSaveSchedule = async () => {
    setDateTouched(true)
    if (!planId) {
      toast.warning('Open a saved plan first', 'Create or open a plan, then set the plant date.')
      return
    }
    if (!plantedDate || dateError) {
      toast.warning('Pick a plant date', 'Choose a day in the calendar first.')
      return
    }
    setSavingSchedule(true)
    try {
      await recommendationsService.updatePlanSchedule(planId, plantedDate)
      await retry()
      toast.success('Dates updated', 'Harvest and sell windows now use your plant date.')
    } catch (err) {
      toast.error('Could not save plant date', getErrorMessage(err, 'Please try again.'))
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleConfirm = async () => {
    if (selectedCrops.length === 0) {
      toast.warning('Pick at least one crop', 'Tap the crops you want to plant this season.')
      return
    }
    setConfirming(true)
    try {
      const result = await recommendationsService.confirmPlan(
        selectedCrops.map((c) => c.id),
        planId
      )
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
      await recommendationsService.deletePlan(planId)
      useFarmStore.setState({
        selectedCrops: [],
        cropPlanConfirmedAt: null,
        lastRecommendation: null,
        activePlanId: null,
      })
      setShowDeleteModal(false)
      toast.success('Plan deleted', 'This crop plan was permanently removed.')
      navigate('/plans')
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

  if (!recommendations.length || !topRecommendation || !top) {
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

  const factors = getDecisionFactors(top)
  const confirmedStamp = finalizedAt || (isFinalized ? cropPlanConfirmedAt : null)
  const showAside = !simpleMode

  return (
    <div className="flex w-full min-w-0 flex-col lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <RecommendationsHero
          crop={top.crop}
          confidence={top.confidence}
          profitEstimate={top.profitEstimate}
          isFinalized={isFinalized}
          runLabel={planTitle || `Generated ${formatShortDate(runDate)}`}
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

        <PageWrapper className="!pb-36 md:!pb-32 lg:!max-w-none">
          {apiConfig.useMock && (
            <div className="mb-4 flex items-center gap-2">
              <DemoTag />
              <p className="text-xs text-text-muted dark:text-text-dark-muted">
                Sample plan for demo — not live farm data.
              </p>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/plans')}
              className="text-sm text-primary font-medium min-h-[44px]"
            >
              ← All plans
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="inline-flex shrink-0 text-error hover:bg-error/10"
              onClick={() => setShowDeleteModal(true)}
              aria-label="Delete plan permanently"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="hidden lg:block mb-5"
          >
            <p className="ek-label mb-1">{planTitle || `Generated ${formatShortDate(runDate)}`}</p>
            <h1 className="ek-headline text-2xl xl:text-3xl text-text-primary dark:text-text-dark-primary">
              Plant {top.crop}
            </h1>
            <p className="mt-1 text-base text-text-secondary dark:text-text-dark-secondary">
              About {formatCurrency(top.profitEstimate)} estimated · {top.confidence}% match
            </p>
          </motion.div>

          {isFinalized && confirmedStamp ? (
            <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-text-primary dark:text-text-dark-primary">
                <span className="font-medium">Saved plan</span>
                <span className="text-text-muted"> · </span>
                {selectedCrops.map((c) => c.crop).join(', ')}
                <span className="text-text-muted"> · {formatShortDate(confirmedStamp)}</span>
              </p>
            </div>
          ) : (
            <p className="mb-4 text-sm text-text-secondary dark:text-text-dark-secondary">
              Not saved yet. Check the times below, pick your crop, then tap{' '}
              <span className="font-medium text-text-primary dark:text-text-dark-primary">
                Finalize plan
              </span>
              .
            </p>
          )}

          {/* MAIN for farmers: when to sow / harvest / sell */}
          <section className="mb-6" aria-labelledby="plan-times-heading">
            <div className="mb-3">
              <h2
                id="plan-times-heading"
                className="text-lg font-semibold text-text-primary dark:text-text-dark-primary"
              >
                Your next steps · {top.crop}
              </h2>
              <p className="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">
                Three times that matter most on the farm.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  key: 'sow',
                  label: 'When to sow',
                  hint: 'Put seed in the ground',
                  value: top.plantingWindow?.sow,
                  Icon: CalendarDays,
                  tone: 'bg-primary/10 text-primary border-primary/20',
                },
                {
                  key: 'harvest',
                  label: 'When to harvest',
                  hint: 'Take the crop out',
                  value: top.plantingWindow?.harvest,
                  Icon: Scissors,
                  tone: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/20',
                },
                {
                  key: 'sell',
                  label: 'When to sell',
                  hint: 'Best window for money',
                  value: top.plantingWindow?.sell,
                  Icon: Banknote,
                  tone: 'bg-accent/10 text-accent border-accent/25',
                },
              ].map(({ key, label, hint, value, Icon, tone }) => (
                <div
                  key={key}
                  className={`rounded-xl border px-4 py-4 min-h-[112px] flex flex-col min-w-0 ${tone}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <p className="text-sm font-semibold">{label}</p>
                  </div>
                  <p className="font-mono text-lg sm:text-xl font-medium text-text-primary dark:text-text-dark-primary leading-snug break-words">
                    {value || '—'}
                  </p>
                  <p className="text-xs mt-2 opacity-80" data-detail>
                    {hint}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border dark:border-border-dark px-4 py-4">
              <p className="text-sm font-semibold text-text-primary dark:text-text-dark-primary">
                I planted on
              </p>
              <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5 mb-3">
                {plantedDateSource === 'user'
                  ? `Using your plant date for ${top.crop}. Change it if the real sow day was different.`
                  : `No plant date set yet — using the plan date (${formatShortDate(baselinePlantedDate || runDate)}) as sow day for ${top.crop}. Change it if you planted on another day.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <DatePicker
                  id="planted-date"
                  value={plantedDate}
                  placeholder="Pick plant date"
                  minDate={plantDateMin}
                  maxDate={plantDateMax}
                  error={dateError}
                  onChange={(next) => {
                    setPlantedDate(next)
                    setDateTouched(true)
                  }}
                  className="sm:max-w-[260px]"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveSchedule}
                    loading={savingSchedule}
                    disabled={!canUpdateDates}
                    className="min-h-[48px]"
                  >
                    Update dates
                  </Button>
                  {plantedDateFromServer && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[48px]"
                      disabled={savingSchedule || !planId}
                      onClick={() => {
                        setDateTouched(false)
                        recommendationsService
                          .updatePlanSchedule(planId, null)
                          .then(() => retry())
                          .then(() =>
                            toast.success(
                              'Back to plan date',
                              'Sow day uses the plan generated date again.'
                            )
                          )
                          .catch((err) =>
                            toast.error(
                              'Could not clear date',
                              getErrorMessage(err, 'Please try again.')
                            )
                          )
                      }}
                    >
                      Use plan date
                    </Button>
                  )}
                </div>
              </div>
              {plantedDateSource !== 'user' && plantedDate && !dateError && (
                <p className="mt-2 text-xs text-text-muted dark:text-text-dark-muted">
                  Harvest and sell below already use this plan date. Tap Update dates only if you
                  change the day.
                </p>
              )}
              {notifications.harvestReminders !== false && reminders.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border dark:border-border-dark pt-3">
                  {reminders.map((rem) => (
                    <li
                      key={`${rem.type}-${rem.crop}-${rem.date}`}
                      className="text-sm text-text-secondary dark:text-text-dark-secondary"
                    >
                      <span className="font-medium text-text-primary dark:text-text-dark-primary">
                        {rem.type === 'sell' ? 'Sell' : 'Harvest'} reminder
                      </span>
                      <span className="text-text-muted"> · </span>
                      {rem.label}
                      {rem.date ? (
                        <span className="font-mono text-xs text-text-muted"> · {rem.date}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/market')}
              className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-lg border border-border dark:border-border-dark text-sm font-medium text-text-primary dark:text-text-dark-primary hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors"
            >
              Check sell prices now
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>

          {top.oversupplyRisk > 0.6 && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-text-primary dark:text-text-dark-primary">
                  Watch out · many farms may plant {top.crop}
                </p>
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-0.5">
                  About {Math.round(top.oversupplyRisk * 100)}% risk in your area. Consider mixing
                  another crop.
                </p>
              </div>
            </div>
          )}

          <section className="mb-8">
            <h2 className="text-base font-semibold text-text-primary dark:text-text-dark-primary mb-1">
              {isFinalized ? 'Crops in this plan' : '1. Pick your crop'}
            </h2>
            <p className="text-sm text-text-muted dark:text-text-dark-muted mb-3">
              {isFinalized
                ? 'Locked. Start a new plan if you want to change.'
                : 'Tap one or more. Times above follow your top pick.'}
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

          {/* Trust / detail second — farmers decide action first */}
          <section className="mb-8" data-detail>
            <h2 className="text-base font-semibold text-text-primary dark:text-text-dark-primary mb-1">
              2. Why {top.crop}?
            </h2>
            <p className="text-xs text-text-muted dark:text-text-dark-muted mb-4">
              Four checks — soil, weather, price, and demand. Read this if you want to trust the tip.
            </p>

            <div className="mb-5">
              <SuitabilityBar score={top.confidence} label="Overall confidence" />
            </div>

            <div className="space-y-5">
              {factors.map((factor) => {
                const meta = FACTOR_META[factor.key] || FACTOR_META.soil
                const Icon = meta.icon
                const isFallbackDemand =
                  factor.key === 'demand' &&
                  String(factor.detail || '')
                    .toLowerCase()
                    .includes('fallback community-pressure')
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
                          <div className="flex items-center gap-2 shrink-0">
                            {isFallbackDemand && <DemoTag />}
                            <span className="text-[11px] font-medium text-text-muted dark:text-text-dark-muted">
                              {scoreTone(factor.score)}
                            </span>
                          </div>
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

          <div className="h-4" aria-hidden />
        </PageWrapper>

        <div
          className={cn(
            'fixed z-30 px-5 py-3',
            'bottom-16 md:bottom-0',
            'left-0 md:left-[240px]',
            'right-0',
            showAside && PLAN_ASIDE_RIGHT_CLASS,
            'pb-[calc(12px+env(safe-area-inset-bottom))]',
            'bg-surface/95 dark:bg-surface-dark/95',
            'border-t border-border dark:border-border-dark backdrop-blur-md'
          )}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3 lg:max-w-none">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary dark:text-text-dark-primary">
                {selectedCrops.length === 0
                  ? 'Pick a crop above'
                  : selectedCrops.map((c) => c.crop).join(', ')}
              </p>
              <p className="text-xs text-text-muted dark:text-text-dark-muted">
                {isFinalized
                  ? 'Plan saved'
                  : selectedCrops.length === 0
                    ? 'Then save your plan'
                    : `Sow ${top.plantingWindow?.sow || '—'} · Sell ${top.plantingWindow?.sell || '—'}`}
              </p>
            </div>
            {isFinalized ? (
              <Button variant="secondary" className="shrink-0" onClick={() => navigate('/plans')}>
                All plans
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                loading={confirming}
                disabled={selectedCrops.length === 0}
                className="shrink-0 min-h-[48px]"
              >
                Finalize plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {showAside && (
        <RecommendationsVisualPanel
          crop={top.crop}
          confidence={top.confidence}
          profitEstimate={top.profitEstimate}
          isFinalized={isFinalized}
          plantingWindow={top.plantingWindow}
        />
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Delete crop plan?"
      >
        <p className="mb-5 text-sm leading-relaxed text-text-secondary dark:text-text-dark-secondary">
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
