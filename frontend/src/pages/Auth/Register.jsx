import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Slider } from '../../components/ui/Slider'
import { Navbar } from '../../components/layout/Navbar'
import { LocationPicker } from '../../components/shared/LocationPicker'
import { useAuthStore } from '../../store/authStore'
import { authService, getErrorMessage } from '../../api'
import { useToast } from '../../hooks/useToast'

const step1Schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const step2Schema = z.object({
  farmSize: z.number().min(0.5).max(100),
})

export default function Register() {
  const navigate = useNavigate()
  const registerUser = useAuthStore((s) => s.register)
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ farmSize: 2 })
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState('')

  const step1Form = useForm({ resolver: zodResolver(step1Schema) })
  const step2Form = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: { farmSize: 2 },
  })

  const onStep1 = (data) => {
    setFormData((prev) => ({ ...prev, ...data }))
    setStep(2)
  }

  const onStep2 = async (data) => {
    if (!location?.label) {
      setLocationError('Please set your farm location')
      toast.warning('Location required', 'Use GPS, search, or enter a UK postcode.')
      return
    }

    const fullData = { ...formData, ...data }
    setLoading(true)
    try {
      const { user, token } = await authService.register({
        name: fullData.name,
        email: fullData.email,
        password: fullData.password,
        region: location.label,
        farmSize: fullData.farmSize,
        location,
      })
      registerUser(user, token)
      toast.success('Welcome to FarmSense!', `Your farm in ${location.label} is ready.`)
      navigate('/dashboard')
    } catch (err) {
      toast.error('Registration failed', getErrorMessage(err, 'Could not create your account'))
    } finally {
      setLoading(false)
    }
  }

  const handleLocationChange = (loc) => {
    setLocation(loc)
    if (loc) setLocationError('')
  }

  return (
    <div className="min-h-dvh bg-bg dark:bg-bg-dark">
      <Navbar />
      <div className="flex items-center justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-6">
            <p className="text-sm text-text-muted dark:text-text-dark-muted mb-2">
              Step {step} of 2
            </p>
            <div className="h-1 rounded-full bg-surface-alt dark:bg-surface-dark-alt overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          </div>

          <Card variant="elevated" className="p-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="font-display text-2xl font-semibold mb-1">Create your account</h1>
                  <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-6">
                    Let's start with the basics
                  </p>
                  <form onSubmit={step1Form.handleSubmit(onStep1)} className="space-y-4">
                    <Input
                      label="Full name"
                      icon={User}
                      error={step1Form.formState.errors.name?.message}
                      {...step1Form.register('name')}
                    />
                    <Input
                      label="Email"
                      type="email"
                      icon={Mail}
                      error={step1Form.formState.errors.email?.message}
                      {...step1Form.register('email')}
                    />
                    <Input
                      label="Password"
                      type="password"
                      icon={Lock}
                      error={step1Form.formState.errors.password?.message}
                      {...step1Form.register('password')}
                    />
                    <Button type="submit" className="w-full">
                      Continue
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="font-display text-2xl font-semibold mb-1">About your farm</h1>
                  <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-6">
                    This helps us tailor recommendations to your area
                  </p>
                  <form onSubmit={step2Form.handleSubmit(onStep2)} className="space-y-6">
                    <LocationPicker
                      value={location}
                      onChange={handleLocationChange}
                      error={locationError}
                    />
                    <Slider
                      label="Farm size (acres)"
                      min={0.5}
                      max={50}
                      step={0.5}
                      value={step2Form.watch('farmSize') || 2}
                      onChange={(v) => step2Form.setValue('farmSize', v)}
                      formatValue={(v) => `${v} ac`}
                    />
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </Button>
                      <Button type="submit" loading={loading} className="flex-1">
                        Get started
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-sm mt-6">
              <span className="text-text-secondary dark:text-text-dark-secondary">
                Already have an account?{' '}
              </span>
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
