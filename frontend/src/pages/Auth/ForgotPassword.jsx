import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Navbar } from '../../components/layout/Navbar'
import { authService, getErrorMessage } from '../../api'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
})

export default function ForgotPassword() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setLoading(true)
    setResult(null)
    setFormError('')
    try {
      const res = await authService.forgotPassword(data.email.trim())
      setResult(res)
      if (res.emailSent) {
        toast.success('Email sent', `Check ${data.email.trim()} for the reset link.`)
      } else if (res.devResetUrl) {
        toast.info('Account found', 'Email not configured — use the link below to reset.')
      } else {
        toast.success('Done', res.message)
      }
    } catch (err) {
      const message = getErrorMessage(
        err,
        'Could not send reset email. Check the address and try again.'
      )
      setFormError(message)
      toast.error('Reset failed', message)
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
            <h1 className="font-display text-2xl font-semibold mb-1">Forgot password</h1>
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-6">
              Enter the email you used to register. We only send a link if that account exists.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                icon={Mail}
                autoComplete="email"
                error={errors.email?.message}
                {...register('email', { onChange: () => setFormError('') })}
              />
              <Button type="submit" loading={loading} className="w-full">
                Send reset link
              </Button>
            </form>

            {formError && (
              <div
                className="mt-4 p-3 rounded-lg border border-error/30 bg-error/5 text-sm"
                role="alert"
              >
                <p className="text-error">{formError}</p>
                {/register|no account/i.test(formError) && (
                  <Link to="/register" className="inline-block mt-2 text-primary font-medium hover:underline">
                    Create an account
                  </Link>
                )}
              </div>
            )}

            {result && !formError && (
              <div
                className={cn(
                  'mt-4 p-3 rounded-lg text-sm border',
                  result.emailSent
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border dark:border-border-dark bg-surface-alt dark:bg-surface-dark-alt'
                )}
              >
                <p className="text-text-secondary dark:text-text-dark-secondary">{result.message}</p>
                {result.devResetUrl && (
                  <p className="mt-3">
                    <span className="text-xs text-text-muted block mb-1">Development reset link:</span>
                    <a
                      href={result.devResetUrl}
                      className="text-primary text-xs hover:underline break-all"
                    >
                      Open reset page
                    </a>
                  </p>
                )}
              </div>
            )}

            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
