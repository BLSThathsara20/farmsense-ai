import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Navbar } from '../../components/layout/Navbar'
import { authService, getErrorMessage } from '../../api'
import { useToast } from '../../hooks/useToast'

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string().min(6, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

export default function ResetPassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  const password = watch('password') || ''
  const confirm = watch('confirm') || ''
  const confirmMismatch = confirm.length > 0 && password !== confirm
  const confirmMatch = confirm.length > 0 && password.length >= 6 && password === confirm
  const confirmLiveError =
    errors.confirm?.message || (confirmMismatch ? 'Passwords do not match' : undefined)

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid link', 'This reset link is missing a token. Request a new one.')
      return
    }
    setLoading(true)
    try {
      const res = await authService.resetPassword({ token, password: data.password })
      toast.success('Password updated', res.message || 'You can sign in now.')
      navigate('/login')
    } catch (err) {
      toast.error('Could not reset password', getErrorMessage(err, 'Invalid or expired reset link'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-dvh bg-bg dark:bg-bg-dark">
        <Navbar />
        <div className="flex items-center justify-center px-5 py-12">
          <Card variant="elevated" className="p-6 max-w-[400px] w-full">
            <h1 className="font-display text-2xl font-semibold mb-2">Invalid reset link</h1>
            <p className="text-sm text-text-secondary mb-6">
              This page needs a valid token from your email. Request a new reset link.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full">Request new link</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
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
            <h1 className="font-display text-2xl font-semibold mb-1">Set new password</h1>
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-6">
              Choose a new password for your FarmSense account.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="New password"
                type="password"
                icon={Lock}
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                label="Confirm password"
                type="password"
                icon={Lock}
                autoComplete="new-password"
                error={confirmLiveError}
                success={confirmMatch ? 'Passwords match' : undefined}
                {...register('confirm')}
              />
              <Button
                type="submit"
                loading={loading}
                className="w-full"
                disabled={confirmMismatch || !isValid}
              >
                Update password
              </Button>
            </form>

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
