import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  MapPin,
  Leaf,
  Droplets,
  Sprout,
  ClipboardCheck,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InfoTip } from '../components/ui/InfoTip'
import { Slider, getNutrientLabel, getPhColor } from '../components/ui/Slider'
import { LocationPicker } from '../components/shared/LocationPicker'
import { PlanVisualPanel } from '../components/shared/PlanVisualPanel'
import { useFarmStore } from '../store/farmStore'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { farmService, getErrorMessage, soilService } from '../api'
import { cn } from '../lib/utils'
import { spring } from '../lib/motion'

const textureOptions = farmService.getTextureOptions()

const cropPreferences = farmService.getCropPreferences()

const STEPS = [
  {
    id: 1,
    label: 'Where',
    title: 'Your farm',
    info: 'We start with your saved farm location. Change it only if this plan is for another place.',
    icon: MapPin,
  },
  {
    id: 2,
    label: 'Food',
    title: 'Soil food',
    info: 'Choose Low, Average, or High. Got a report number? Match it to under 30 / 30–60 / over 60.',
    icon: Leaf,
  },
  {
    id: 3,
    label: 'Feel',
    title: 'Soil feel',
    info: 'Set pH and how soil feels in your hand. Unsure? Use 6.5.',
    icon: Droplets,
  },
  {
    id: 4,
    label: 'Crops',
    title: 'Crops you like',
    info: 'Optional. Skip this and we’ll pick the best soil match.',
    icon: Sprout,
  },
  {
    id: 5,
    label: 'Check',
    title: 'Check',
    info: 'Tap a row to change it, then build your plan.',
    icon: ClipboardCheck,
  },
]

const LEVEL_INFO =
  'Got a soil report number? Under 30 = Low, 30–60 = Average, over 60 = High. No report? Use how last season’s plants looked, or tap Use average.'

const NUTRIENT_LEVELS = [
  { key: 'low', label: 'Low', value: 20, range: 'under 30' },
  { key: 'medium', label: 'Average', value: 50, range: '30–60' },
  { key: 'high', label: 'High', value: 100, range: 'over 60' },
]

const NUTRIENTS = [
  {
    key: 'nitrogen',
    short: 'N',
    title: 'Nitrogen',
    info: 'Green leaf food. On a report look for “N”. Example: N = 60 → tap Average.',
  },
  {
    key: 'phosphorus',
    short: 'P',
    title: 'Phosphorus',
    info: 'Root and fruit food. On a report look for “P”. Example: P = 25 → tap Low.',
  },
  {
    key: 'potassium',
    short: 'K',
    title: 'Potassium',
    info: 'Plant strength. On a report look for “K”. Example: K = 80 → tap High.',
  },
]

function levelFromValue(value) {
  if (value <= 33) return 'low'
  if (value <= 66) return 'medium'
  return 'high'
}

function phPlainLabel(ph) {
  if (ph < 5.5) return 'Too acidic for most crops'
  if (ph < 6.0) return 'A bit acidic'
  if (ph <= 7.2) return 'Good for most crops'
  if (ph <= 7.8) return 'A bit alkaline'
  return 'Quite alkaline'
}

export default function SoilInput() {
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const { soilData, updateSoilData, submitSoilData } = useFarmStore()
  const [step, setStep] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [textureError, setTextureError] = useState('')

  // Default to the farmer’s saved registration location (most farms have one place)
  useEffect(() => {
    const saved =
      user?.location?.label
        ? {
            ...user.location,
            source: user.location.source || 'saved',
          }
        : user?.region
          ? {
              id: `user-${user.id}`,
              label: user.region,
              fullLabel: user.district || user.region,
              country: user.countryCode || 'GB',
              source: 'saved',
            }
          : null

    if (!saved?.label) return

    const current = useFarmStore.getState().soilData
    // Only auto-fill when Plan has no location yet
    if (current.region || current.location?.label) return

    const patch = {
      region: saved.label,
      location: saved,
    }
    if (user?.farmSize && Number(user.farmSize) > 0) {
      patch.area = Number(user.farmSize)
    }
    updateSoilData(patch)
  }, [user, updateSoilData])

  const current = STEPS[step - 1]
  const progress = (maxReached / STEPS.length) * 100

  const isStepComplete = (n) => {
    if (n === 1) return Boolean(soilData.region)
    if (n === 3) return Boolean(soilData.texture)
    return true
  }

  const canContinue = useMemo(() => isStepComplete(step), [step, soilData.region, soilData.texture])

  const canVisitStep = (n) => n >= 1 && n <= maxReached

  const goToStep = (n) => {
    if (!canVisitStep(n)) return
    setStep(n)
  }

  const handleLocationChange = (loc) => {
    if (loc) {
      updateSoilData({ region: loc.label, location: loc })
      setLocationError('')
    } else {
      updateSoilData({ region: '', location: null })
    }
  }

  const setNutrientLevel = (key, level) => {
    const found = NUTRIENT_LEVELS.find((l) => l.key === level)
    if (found) updateSoilData({ [key]: found.value })
  }

  const useAverageNutrients = () => {
    updateSoilData({ nitrogen: 50, phosphorus: 50, potassium: 50 })
    toast.info('Using average', 'Safe starting point if you don’t have a soil report.')
  }

  const useTypicalPh = () => {
    updateSoilData({ ph: 6.5 })
    toast.info('pH set to 6.5', 'Good for most crops if you’re unsure.')
  }

  const togglePreference = (crop) => {
    const currentPrefs = soilData.preferences || []
    if (crop === 'No preference') {
      updateSoilData({ preferences: [] })
      return
    }
    const updated = currentPrefs.includes(crop)
      ? currentPrefs.filter((c) => c !== crop)
      : [...currentPrefs, crop]
    updateSoilData({ preferences: updated })
  }

  const next = () => {
    if (step === 1 && !soilData.region) {
      setLocationError('Please set your farm location first')
      toast.warning('Location needed', 'Use GPS, search, or a UK postcode.')
      return
    }
    if (step === 3 && !soilData.texture) {
      setTextureError('Pick the soil that feels most like yours')
      toast.warning('Soil type needed', 'Choose sandy, loamy, clay, or silty.')
      return
    }
    if (step < STEPS.length) {
      const nextStep = step + 1
      setStep(nextStep)
      setMaxReached((m) => Math.max(m, nextStep))
    }
  }

  const back = () => {
    if (step > 1) setStep(step - 1)
    else navigate('/dashboard')
  }

  const jumpToStep = (n) => goToStep(n)

  const handleSubmit = async () => {
    if (!soilData.region) {
      setStep(1)
      setLocationError('Please set your farm location first')
      return
    }
    if (!soilData.texture) {
      setStep(3)
      setTextureError('Pick the soil that feels most like yours')
      return
    }

    setLoading(true)
    try {
      const idempotencyKey = `soil-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const result = await soilService.submitSoil(
        {
          region: soilData.region,
          area: soilData.area,
          nitrogen: soilData.nitrogen,
          phosphorus: soilData.phosphorus,
          potassium: soilData.potassium,
          ph: soilData.ph,
          texture: soilData.texture,
          preferences: soilData.preferences || [],
          location: soilData.location,
        },
        idempotencyKey
      )
      submitSoilData(soilData)
      // New soil run creates a draft — clear any previous finalized local state
      useFarmStore.setState({
        cropPlanConfirmedAt: null,
        selectedCrops: [],
      })
      if (result?.recommendations?.topRecommendation) {
        useFarmStore.getState().setLastRecommendation(result.recommendations.topRecommendation)
      }
      toast.success('Draft crop matches ready', 'Confirm your picks on the next screen to finalize.')
      navigate('/recommendations')
    } catch (err) {
      toast.error('Could not build your plan', getErrorMessage(err, 'Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-bg dark:bg-bg-dark">
      <header className="sticky top-0 z-30 shrink-0 bg-bg/95 dark:bg-bg-dark/95 backdrop-blur-md border-b border-border/60 dark:border-border-dark/60">
        <div className="h-1 bg-surface-alt dark:bg-surface-dark-alt">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={spring.gentle}
          />
        </div>

        <div className="flex items-center gap-2 px-5 lg:px-8 h-14">
          <button
            type="button"
            onClick={back}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-1 rounded-md hover:bg-surface-alt dark:hover:bg-surface-dark-alt"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="ek-label">
              Step {step} of {STEPS.length} · {current.label}
            </p>
            <p className="text-sm font-medium truncate text-text-primary dark:text-text-dark-primary">
              Build your crop plan
            </p>
          </div>
        </div>

        <nav className="flex gap-1 px-5 lg:px-8 pb-3 overflow-x-auto" aria-label="Plan steps">
          {STEPS.map((s) => {
            const reachable = canVisitStep(s.id)
            const done = s.id < maxReached && isStepComplete(s.id)
            const active = s.id === step
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(s.id)}
                disabled={!reachable}
                title={
                  reachable
                    ? `Go to ${s.label}`
                    : 'Finish earlier steps first'
                }
                className={cn(
                  'flex-1 min-w-[56px] max-w-[120px] py-2 px-1 rounded-md text-center transition-colors',
                  active && 'bg-surface-alt dark:bg-surface-dark-alt',
                  reachable && !active && 'cursor-pointer hover:bg-surface-alt/70 dark:hover:bg-surface-dark-alt/70',
                  !reachable && 'opacity-40 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                    active && 'bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark',
                    done && !active && 'bg-primary text-white',
                    !active && !done && reachable && 'bg-border dark:bg-border-dark text-text-primary dark:text-text-dark-primary',
                    !reachable && 'bg-border dark:bg-border-dark text-text-muted'
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.id}
                </span>
                <span
                  className={cn(
                    'block text-[10px] font-medium tracking-wide',
                    active
                      ? 'text-text-primary dark:text-text-dark-primary'
                      : 'text-text-muted dark:text-text-dark-muted'
                  )}
                >
                  {s.label}
                </span>
              </button>
            )
          })}
        </nav>
      </header>

      {/* Split layout: form left · visual story right (desktop) */}
      <div className="flex-1 grid lg:grid-cols-2 min-h-0">
        <div className="relative flex flex-col min-h-0 min-w-0 border-r border-transparent lg:border-border/50 dark:lg:border-border-dark/50">
          <div className="flex-1 overflow-y-auto px-5 lg:px-8 py-6 pb-36 md:pb-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={spring.gentle}
                className="space-y-6 max-w-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <current.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h1 className="ek-headline text-2xl text-text-primary dark:text-text-dark-primary truncate">
                      {current.title}
                    </h1>
                    <InfoTip text={current.info} />
                  </div>
                </div>

                {step === 1 && (
                  <div className="space-y-6">
                    <p className="text-sm text-text-secondary dark:text-text-dark-secondary -mt-2">
                      Your saved farm is selected by default. Tap “Use a different location” only if needed.
                    </p>
                    <LocationPicker
                      value={soilData.location}
                      onChange={handleLocationChange}
                      error={locationError}
                    />
                    <Card variant="bordered" className="!p-4">
                      <div className="flex items-center gap-1 mb-3">
                        <span className="text-sm font-medium">Farm size</span>
                        <InfoTip text="A rough size is fine — we use it for profit estimates." />
                      </div>
                      <Slider
                        min={0.5}
                        max={50}
                        step={0.5}
                        value={soilData.area}
                        onChange={(v) => updateSoilData({ area: v })}
                        formatValue={(v) => `${v} acres`}
                      />
                    </Card>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-end gap-1">
                      <InfoTip text={LEVEL_INFO} align="right" />
                      <Button type="button" variant="secondary" size="sm" onClick={useAverageNutrients}>
                        Use average
                      </Button>
                    </div>

                    {NUTRIENTS.map((nutrient) => {
                      const level = levelFromValue(soilData[nutrient.key])
                      return (
                        <Card key={nutrient.key} variant="bordered" className="!p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <p className="text-sm font-semibold">
                                {nutrient.title}{' '}
                                <span className="text-text-muted font-normal">({nutrient.short})</span>
                              </p>
                              <InfoTip text={nutrient.info} />
                            </div>
                            <span className="ek-mono-data text-sm text-primary shrink-0">
                              {getNutrientLabel(soilData[nutrient.key])}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {NUTRIENT_LEVELS.map((opt) => {
                              const selected = level === opt.key
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => setNutrientLevel(nutrient.key, opt.key)}
                                  className={cn(
                                    'min-h-[52px] rounded-md border px-2 py-2.5 text-center transition-colors',
                                    selected
                                      ? 'border-text-primary dark:border-text-dark-primary bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark'
                                      : 'border-border dark:border-border-dark hover:border-primary/40'
                                  )}
                                >
                                  <span className="block text-sm font-semibold">{opt.label}</span>
                                  <span
                                    className={cn(
                                      'block text-[10px] mt-0.5',
                                      selected
                                        ? 'text-bg/70 dark:text-bg-dark/70'
                                        : 'text-text-muted dark:text-text-dark-muted'
                                    )}
                                  >
                                    {opt.range}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <Card variant="bordered" className="!p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold">pH</p>
                          <InfoTip text="Acidity on your soil report. Most crops like about 6.5." />
                        </div>
                        <span
                          className="ek-mono-data text-sm font-medium"
                          style={{ color: getPhColor(soilData.ph) }}
                        >
                          {soilData.ph.toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        min={4}
                        max={9}
                        step={0.1}
                        value={soilData.ph}
                        onChange={(v) => updateSoilData({ ph: v })}
                        formatValue={(v) => v.toFixed(1)}
                        showLabels={false}
                      />
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background:
                            'linear-gradient(to right, #C1121F, #E76F51, #40916C, #52B788, #4895EF)',
                        }}
                        aria-hidden
                      />
                      <div className="flex justify-between text-[10px] text-text-muted">
                        <span>Acid</span>
                        <span>OK</span>
                        <span>Alkali</span>
                      </div>
                      <p
                        className="text-sm text-center font-medium"
                        style={{ color: getPhColor(soilData.ph) }}
                      >
                        {phPlainLabel(soilData.ph)}
                      </p>
                      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={useTypicalPh}>
                        Use 6.5
                      </Button>
                    </Card>

                    <div>
                      <div className="flex items-center gap-1 mb-3">
                        <p className="text-sm font-semibold">Texture</p>
                        <InfoTip text="After rain, rub soil in your hand. Sandy=gritty, Loamy=soft, Clay=sticky, Silty=smooth." />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {textureOptions.map((opt) => {
                          const selected = soilData.texture === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                updateSoilData({ texture: opt.value })
                                setTextureError('')
                              }}
                              className={cn(
                                'text-left p-4 rounded-lg border min-h-[64px] transition-colors',
                                selected
                                  ? 'border-text-primary dark:border-text-dark-primary bg-surface-alt dark:bg-surface-dark-alt ring-1 ring-text-primary/20 dark:ring-text-dark-primary/20'
                                  : 'border-border dark:border-border-dark hover:border-primary/40'
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-text-primary dark:text-text-dark-primary">
                                  {opt.label}
                                </p>
                                {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {textureError && (
                        <p className="mt-2 text-xs text-error" role="alert">
                          {textureError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {cropPreferences.map((crop) => {
                      const selected =
                        crop === 'No preference'
                          ? !soilData.preferences?.length
                          : soilData.preferences?.includes(crop)
                      return (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => togglePreference(crop)}
                          className={cn(
                            'min-h-[52px] rounded-md border px-3 py-3 text-sm font-medium text-left transition-colors',
                            selected
                              ? 'border-text-primary dark:border-text-dark-primary bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark'
                              : 'border-border dark:border-border-dark text-text-secondary hover:border-primary/40'
                          )}
                        >
                          {crop === 'No preference' ? 'Any crop' : crop}
                        </button>
                      )
                    })}
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-4">
                    <Card
                      variant="bordered"
                      className="!p-0 overflow-hidden divide-y divide-border dark:divide-border-dark"
                    >
                      {[
                        { step: 1, label: 'Location', value: soilData.region || 'Not set' },
                        { step: 1, label: 'Farm size', value: `${soilData.area} acres` },
                        { step: 2, label: 'Nitrogen', value: getNutrientLabel(soilData.nitrogen) },
                        { step: 2, label: 'Phosphorus', value: getNutrientLabel(soilData.phosphorus) },
                        { step: 2, label: 'Potassium', value: getNutrientLabel(soilData.potassium) },
                        { step: 3, label: 'pH', value: soilData.ph.toFixed(1) },
                        { step: 3, label: 'Texture', value: soilData.texture || 'Not set' },
                        {
                          step: 4,
                          label: 'Crops',
                          value: soilData.preferences?.length
                            ? soilData.preferences.join(', ')
                            : 'Any',
                        },
                      ].map((row) => (
                        <button
                          key={row.label}
                          type="button"
                          onClick={() => jumpToStep(row.step)}
                          className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left min-h-[52px] hover:bg-surface-alt/80 dark:hover:bg-surface-dark-alt/80 transition-colors"
                        >
                          <span className="text-sm text-text-secondary dark:text-text-dark-secondary shrink-0">
                            {row.label}
                          </span>
                          <span className="text-sm font-medium text-right text-text-primary dark:text-text-dark-primary">
                            {row.value}
                          </span>
                        </button>
                      ))}
                    </Card>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* CTA docks under the form column only — balanced with the visual panel */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 lg:px-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6 lg:pb-6">
            <div className="pointer-events-auto max-w-xl">
              <div className="flex gap-3 rounded-xl border border-border dark:border-border-dark bg-surface/95 dark:bg-surface-dark/95 backdrop-blur-xl p-3 shadow-dock dark:shadow-dock-dark">
                {step > 1 ? (
                  <Button variant="secondary" size="lg" className="flex-1" onClick={back}>
                    Back
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={() => navigate('/dashboard')}
                  >
                    Cancel
                  </Button>
                )}
                {step < STEPS.length ? (
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-[1.4]"
                    onClick={next}
                    disabled={!canContinue}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="lg"
                    className="flex-[1.4]"
                    loading={loading}
                    onClick={handleSubmit}
                  >
                    <Check className="h-5 w-5" />
                    Get my crop plan
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <PlanVisualPanel step={step} soilData={soilData} />
      </div>
    </div>
  )
}
