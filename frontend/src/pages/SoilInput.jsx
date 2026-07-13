import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Slider, getNutrientLabel, getPhColor } from '../components/ui/Slider'
import { LocationPicker } from '../components/shared/LocationPicker'
import { useFarmStore } from '../store/farmStore'
import { useToast } from '../hooks/useToast'
import { farmService, getErrorMessage, soilService } from '../api'
import { cn } from '../lib/utils'

const textureOptions = farmService.getTextureOptions()
const cropPreferences = farmService.getCropPreferences()
const TOTAL_STEPS = 4

export default function SoilInput() {
  const navigate = useNavigate()
  const toast = useToast()
  const { soilData, updateSoilData, submitSoilData } = useFarmStore()
  const [step, setStep] = useState(1)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  const progress = showConfirm ? 100 : (step / TOTAL_STEPS) * 100

  const next = () => {
    if (step === 1 && !soilData.region) {
      setLocationError('Please set your farm location')
      toast.warning('Location required', 'Use GPS, search, or enter a UK postcode.')
      return
    }
    if (step < TOTAL_STEPS) setStep(step + 1)
    else setShowConfirm(true)
  }

  const handleLocationChange = (loc) => {
    if (loc) {
      updateSoilData({ region: loc.label, location: loc })
      setLocationError('')
    } else {
      updateSoilData({ region: '', location: null })
    }
  }

  const back = () => {
    if (showConfirm) setShowConfirm(false)
    else if (step > 1) setStep(step - 1)
    else navigate(-1)
  }

  const togglePreference = (crop) => {
    const current = soilData.preferences || []
    if (crop === 'No preference') {
      updateSoilData({ preferences: [] })
      return
    }
    const updated = current.includes(crop)
      ? current.filter((c) => c !== crop)
      : [...current, crop]
    updateSoilData({ preferences: updated })
  }

  const handleSubmit = async () => {
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
      if (result?.recommendations?.topRecommendation) {
        useFarmStore.getState().setLastRecommendation(result.recommendations.topRecommendation)
      }
      toast.success('Crop plan ready', 'Your personalised recommendations are being generated.')
      navigate('/recommendations')
    } catch (err) {
      toast.error('Could not save soil data', getErrorMessage(err, 'Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="sticky top-0 z-30 bg-bg dark:bg-bg-dark">
        <div className="h-1 bg-surface-alt dark:bg-surface-dark-alt">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center px-5 h-14">
          <button
            onClick={back}
            className="flex items-center justify-center min-h-[48px] min-w-[48px] -ml-2 rounded-md hover:bg-surface-alt dark:hover:bg-surface-dark-alt"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      <PageWrapper className="flex-1">
        <AnimatePresence mode="wait">
          {!showConfirm ? (
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="font-display text-2xl font-semibold mb-2">
                      What's your farm like?
                    </h1>
                    <p className="text-text-secondary dark:text-text-dark-secondary">
                      We'll use this to match crops to your climate
                    </p>
                  </div>
                  <LocationPicker
                    value={soilData.location}
                    onChange={handleLocationChange}
                    error={locationError}
                  />
                  <Slider
                    label="Farm area"
                    min={0.5}
                    max={50}
                    step={0.5}
                    value={soilData.area}
                    onChange={(v) => updateSoilData({ area: v })}
                    formatValue={(v) => `${v} acres`}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="font-display text-2xl font-semibold mb-2">
                      Tell us about your soil
                    </h1>
                    <p className="text-text-secondary dark:text-text-dark-secondary">
                      Drag the sliders to match your latest soil test
                    </p>
                  </div>
                  {[
                    { key: 'nitrogen', label: 'Nitrogen (N)' },
                    { key: 'phosphorus', label: 'Phosphorus (P)' },
                    { key: 'potassium', label: 'Potassium (K)' },
                  ].map(({ key, label }) => (
                    <Slider
                      key={key}
                      label={label}
                      value={soilData[key]}
                      onChange={(v) => updateSoilData({ [key]: v })}
                      formatValue={(v) => getNutrientLabel(v)}
                    />
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="font-display text-2xl font-semibold mb-2">
                      Soil pH and texture
                    </h1>
                    <p className="text-text-secondary dark:text-text-dark-secondary">
                      pH affects which nutrients your plants can absorb
                    </p>
                  </div>
                  <div>
                    <Slider
                      label="Soil pH"
                      min={4}
                      max={9}
                      step={0.1}
                      value={soilData.ph}
                      onChange={(v) => updateSoilData({ ph: v })}
                      formatValue={(v) => v.toFixed(1)}
                    />
                    <div
                      className="h-2 rounded-full mt-3"
                      style={{
                        background: `linear-gradient(to right, #C1121F, #E76F51, #40916C, #52B788, #4895EF)`,
                      }}
                    />
                    <p
                      className="text-sm font-mono mt-2 text-center"
                      style={{ color: getPhColor(soilData.ph) }}
                    >
                      pH {soilData.ph.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Soil texture</label>
                    <div className="grid grid-cols-2 gap-3">
                      {textureOptions.map(({ value, label, description }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateSoilData({ texture: value })}
                          className={cn(
                            'p-4 rounded-lg border text-left min-h-[80px] transition-colors',
                            soilData.texture === value
                              ? 'border-primary bg-primary/10'
                              : 'border-border dark:border-border-dark hover:border-primary/50'
                          )}
                        >
                          <p className="font-medium text-text-primary dark:text-text-dark-primary">
                            {label}
                          </p>
                          <p className="text-xs text-text-muted dark:text-text-dark-muted mt-1">
                            {description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="font-display text-2xl font-semibold mb-2">
                      Any crop preferences?
                    </h1>
                    <p className="text-text-secondary dark:text-text-dark-secondary">
                      Optional — we'll still recommend the best fit
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                            'px-4 py-2 rounded-full text-sm font-medium min-h-[48px] transition-colors',
                            selected
                              ? 'bg-primary text-white'
                              : 'bg-surface-alt dark:bg-surface-dark-alt text-text-secondary dark:text-text-dark-secondary'
                          )}
                        >
                          {crop}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-6">
                <h1 className="font-display text-2xl font-semibold mb-2">Review your inputs</h1>
                <p className="text-text-secondary dark:text-text-dark-secondary">
                  Check everything looks right before we generate your plan
                </p>
              </div>
              <Card variant="bordered" className="space-y-4 mb-6">
                {[
                  ['Region', soilData.region || 'Not set'],
                  ['Farm area', `${soilData.area} acres`],
                  ['Nitrogen', getNutrientLabel(soilData.nitrogen)],
                  ['Phosphorus', getNutrientLabel(soilData.phosphorus)],
                  ['Potassium', getNutrientLabel(soilData.potassium)],
                  ['pH', soilData.ph.toFixed(1)],
                  ['Texture', soilData.texture || 'Not set'],
                  [
                    'Preferences',
                    soilData.preferences?.length
                      ? soilData.preferences.join(', ')
                      : 'None',
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-text-secondary dark:text-text-dark-secondary">
                      {label}
                    </span>
                    <span className="font-medium text-text-primary dark:text-text-dark-primary">
                      {value}
                    </span>
                  </div>
                ))}
              </Card>
              <Button loading={loading} onClick={handleSubmit} className="w-full">
                <Check className="h-5 w-5" />
                Generate crop plan
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!showConfirm && (
          <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-5 max-w-3xl mx-auto">
            <Button onClick={next} className="w-full" disabled={step === 1 && !soilData.region}>
              {step === TOTAL_STEPS ? 'Review' : 'Next'}
            </Button>
          </div>
        )}
      </PageWrapper>
    </div>
  )
}
