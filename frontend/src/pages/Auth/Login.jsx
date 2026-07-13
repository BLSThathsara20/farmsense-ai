import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Navbar } from '../../components/layout/Navbar'
import { useAuthStore } from '../../store/authStore'
import { authService, getErrorMessage } from '../../api'
import { useToast } from '../../hooks/useToast'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setLoading(true)
    setFormError('')
    try {
      const { user, token } = await authService.login(data)
      login(user, token)
      toast.success('Welcome back!', 'Good to see you again.')
      navigate('/dashboard')
    } catch (err) {
      const message = getErrorMessage(err, 'Could not sign in. Please try again.')
      setFormError(message)
      toast.error('Sign in failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg dark:bg-bg-dark">
      <Navbar />
      <div className="flex items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <Card variant="elevated" className="p-6">
            <h1 className="font-display text-2xl font-semibold text-text-primary dark:text-text-dark-primary mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-6">
              Sign in to your crop plan
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                icon={Mail}
                error={errors.email?.message}
                {...register('email', { onChange: () => setFormError('') })}
              />
              <Input
                label="Password"
                type="password"
                icon={Lock}
                error={errors.password?.message}
                {...register('password', { onChange: () => setFormError('') })}
              />
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline inline-flex items-center min-h-[48px]"
                >
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>

            {formError && (
              <div
                className="mt-4 p-3 rounded-lg border border-error/30 bg-error/5 text-sm"
                role="alert"
              >
                <p className="text-error">{formError}</p>
                {/no account|register/i.test(formError) && (
                  <Link
                    to="/register"
                    className="inline-block mt-2 text-primary font-medium hover:underline"
                  >
                    Create an account
                  </Link>
                )}
                {/incorrect password|forgot password/i.test(formError) && (
                  <Link
                    to="/forgot-password"
                    className="inline-block mt-2 text-primary font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
            )}

            <p className="text-center text-sm text-text-muted dark:text-text-dark-muted mt-6">
              Trusted by farmers across 12 countries
            </p>
            <p className="text-center text-sm mt-4">
              <span className="text-text-secondary dark:text-text-dark-secondary">
                New here?{' '}
              </span>
              <Link to="/register" className="text-primary font-medium hover:underline">
                Create account
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
