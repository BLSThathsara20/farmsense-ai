import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, HelpCircle, Database } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { SectionHeader } from '../components/shared/SectionHeader'
import { SystemStatusPanel } from '../components/shared/SystemStatusPanel'
import { Badge } from '../components/ui/Badge'
import { useAuthStore } from '../store/authStore'
import { useFarmStore } from '../store/farmStore'
import { useTheme } from '../hooks/useTheme'
import { useToast } from '../hooks/useToast'
import { authService, apiConfig } from '../api'
import { cn, formatShortDate } from '../lib/utils'

export default function Settings() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const logout = useAuthStore((s) => s.logout)
  const toast = useToast()
  const { units, notifications, setUnits, setNotifications } = useFarmStore()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await authService.getProfile()
        if (!cancelled) {
          setProfile(data)
          if (data?.user) updateProfile(data.user)
        }
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [updateProfile])

  const handleSignOut = () => {
    useFarmStore.getState().resetFarmData()
    logout()
    toast.info('Signed out', 'See you next time.')
    navigate('/login')
  }

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]

  const saved = profile?.savedData
  const account = profile?.account

  return (
    <PageWrapper>
      <SectionHeader title="Settings" subtitle="Account, saved data & system health" />

      <SystemStatusPanel />

      <Card variant="bordered" className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="ek-label">Profile (from database)</h2>
          {!apiConfig.useMock && (
            <Badge variant="primary" size="sm">
              Live API
            </Badge>
          )}
        </div>
        <div className="space-y-3">
          {[
            ['Name', user?.name || profile?.user?.name || '—'],
            ['Email', account?.email || user?.email || '—'],
            ['Region', user?.region || profile?.farm?.region || '—'],
            [
              'Farm size',
              user?.farmSize || profile?.farm?.areaHectares
                ? `${user?.farmSize || profile?.farm?.areaHectares} ha`
                : '—',
            ],
            [
              'Member since',
              account?.createdAt ? formatShortDate(account.createdAt) : '—',
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm gap-4">
              <span className="text-text-secondary dark:text-text-dark-secondary shrink-0">
                {label}
              </span>
              <span className="font-medium text-text-primary dark:text-text-dark-primary text-right">
                {value}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="bordered" className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="ek-label">Saved data</h2>
        </div>
        {profileLoading ? (
          <p className="text-sm text-text-muted">Loading from server…</p>
        ) : saved ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Soil readings</span>
              <span className="ek-mono-data font-medium">{saved.soilReadingsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Recommendation runs</span>
              <span className="ek-mono-data font-medium">{saved.recommendationRunsCount}</span>
            </div>
            {saved.lastSoilReading?.lastUpdated && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Last soil update</span>
                <span>{formatShortDate(saved.lastSoilReading.lastUpdated)}</span>
              </div>
            )}
            {saved.lastRecommendation?.topCrop && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Last top crop</span>
                <span className="font-medium">{saved.lastRecommendation.topCrop}</span>
              </div>
            )}
            <p className="text-xs text-text-muted pt-2 border-t border-border dark:border-border-dark">
              Come back anytime — your data stays in PostgreSQL until you delete your account.
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Sign in with the live API to see saved counts. Add a soil reading under Plan first.
          </p>
        )}
      </Card>

      <Link to="/help" className="block mb-4">
        <Card variant="elevated" className="flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Help guide</p>
            <p className="text-xs text-text-muted">Register, connect backend, verify data saves</p>
          </div>
        </Card>
      </Link>

      <Card variant="bordered" className="mb-4">
        <h2 className="ek-label mb-4">Notifications</h2>
        <div className="space-y-1">
          <Toggle
            label="Sell window alerts"
            checked={notifications.sellAlerts}
            onChange={(v) => setNotifications({ sellAlerts: v })}
          />
          <Toggle
            label="Weather alerts"
            checked={notifications.weatherAlerts}
            onChange={(v) => setNotifications({ weatherAlerts: v })}
          />
          <Toggle
            label="Community updates"
            checked={notifications.communityUpdates}
            onChange={(v) => setNotifications({ communityUpdates: v })}
          />
        </div>
      </Card>

      <Card variant="bordered" className="mb-4">
        <h2 className="ek-label mb-4">Appearance</h2>
        <div className="flex gap-2">
          {themeOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 py-3 rounded-md text-sm font-medium min-h-[44px] transition-colors',
                theme === value
                  ? 'bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark'
                  : 'bg-surface-alt dark:bg-surface-dark-alt text-text-secondary'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card variant="bordered" className="mb-4">
        <h2 className="ek-label mb-4">Units</h2>
        <div className="flex gap-2">
          {['metric', 'imperial'].map((u) => (
            <button
              key={u}
              onClick={() => setUnits(u)}
              className={cn(
                'flex-1 py-3 rounded-md text-sm font-medium min-h-[44px] capitalize transition-colors',
                units === u
                  ? 'bg-text-primary dark:bg-text-dark-primary text-bg dark:text-bg-dark'
                  : 'bg-surface-alt dark:bg-surface-dark-alt text-text-secondary'
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </Card>

      <Card variant="bordered" className="mb-8 bg-primary/5">
        <h2 className="text-sm font-medium mb-2">Data &amp; privacy</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Farm data is stored securely per account. District community stats use anonymised counts
          only — never your name or email.
        </p>
      </Card>

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-4 text-error font-medium min-h-[48px] hover:bg-error/5 rounded-md transition-colors"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </PageWrapper>
  )
}
