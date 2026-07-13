import { Link, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Sprout,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/shared/EmptyState'
import { LazyBackground } from '../components/shared/LazyBackground'
import { useMockData } from '../hooks/useMockData'
import { useAuthStore } from '../store/authStore'
import { useFarmStore } from '../store/farmStore'
import { formatDate, getGreeting, formatPercent, formatCurrency } from '../lib/utils'

const loadDashboardTopBg = () => import('../assets/backgrounds/dashboard-top.webp')

function DashboardHero({ name, children }) {
  const loader = useCallback(() => loadDashboardTopBg(), [])
  return (
    <LazyBackground
      loader={loader}
      alt=""
      className="rounded-xl mb-6 border border-border dark:border-border-dark min-h-[148px]"
      imageClassName="object-cover object-top"
      overlayClassName="bg-gradient-to-r from-black/70 via-black/45 to-black/25"
    >
      <div className="px-5 py-6 sm:px-6 sm:py-7">
        <p className="ek-label mb-1 !text-white/60">{formatDate(new Date())}</p>
        <h1 className="ek-headline text-2xl sm:text-3xl text-white drop-shadow-sm">
          {getGreeting()}, {name}
        </h1>
        {children}
      </div>
    </LazyBackground>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const selectedCrops = useFarmStore((s) => s.selectedCrops)
  const cropPlanConfirmedAt = useFarmStore((s) => s.cropPlanConfirmedAt)
  const { loading, error, retry, topRecommendation, dashboardStats, hasSoilData: apiHasSoil } =
    useMockData()

  const name = user?.name || 'Farmer'
  const hasSoilData = apiHasSoil
  const showEmpty = !loading && !error && !apiHasSoil
  const primaryCrop = apiHasSoil ? selectedCrops[0] || topRecommendation : null

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

  if (showEmpty || !primaryCrop) {
    return (
      <PageWrapper>
        <DashboardHero name={name}>
          <p className="mt-2 text-sm text-white/75 max-w-md leading-relaxed">
            Add a soil reading and we’ll build a crop plan for your land.
          </p>
        </DashboardHero>
        <EmptyState
          icon={Sprout}
          title="Start by telling us about your farm"
          description="Enter your soil readings to get personalised crop recommendations tailored to your land."
          actionLabel="Add soil reading"
          onAction={() => navigate('/plan')}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <DashboardHero name={name}>
        <p className="mt-2 text-sm text-white/75">
          Here’s what looks strongest for your farm today.
        </p>
      </DashboardHero>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <Link to="/recommendations">
          <Card variant="featured" className="mb-6 group">
            <Badge variant="primary" size="sm" className="mb-3">
              {cropPlanConfirmedAt ? 'Finalized plan' : hasSoilData ? 'Draft matches' : "Today's priority"}
            </Badge>
            <h2 className="ek-headline text-3xl text-text-primary dark:text-text-dark-primary mb-1">
              {primaryCrop.crop}
            </h2>
            {selectedCrops.length > 1 && (
              <p className="text-text-muted dark:text-text-dark-muted text-xs mb-2">
                + {selectedCrops.slice(1).map((c) => c.crop).join(', ')}
              </p>
            )}
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-4">
              {primaryCrop.confidence}% suitability · Best match for your soil
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-border dark:border-border-dark">
              <p className="ek-mono-data text-xl text-text-primary dark:text-text-dark-primary">
                {formatCurrency(primaryCrop.profitEstimate)}
              </p>
              <ChevronRight className="h-4 w-4 text-text-muted group-hover:translate-x-0.5 transition-transform duration-200 ease-ek" />
            </div>
          </Card>
        </Link>
      </motion.div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Top Score', value: `${dashboardStats.topCropScore}%`, icon: BarChart3 },
          {
            label: 'Price Trend',
            value: formatPercent(dashboardStats.priceTrend),
            icon: TrendingUp,
          },
          { label: 'Demand', value: dashboardStats.demandSignal, icon: Sprout },
        ].map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Card variant="bordered" className="text-center py-3">
              <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="font-mono text-sm font-medium text-text-primary dark:text-text-dark-primary">
                {value}
              </p>
              <p className="text-[10px] text-text-muted dark:text-text-dark-muted">{label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {dashboardStats.sellWindow && (
        <Card variant="highlight" className="mb-4 border-l-accent">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="font-medium text-text-primary dark:text-text-dark-primary">
                Best sell window: Week {dashboardStats.sellWindow.start}–
                {dashboardStats.sellWindow.end}
              </p>
              <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
                Prices trending up — plan your harvest accordingly
              </p>
            </div>
          </div>
        </Card>
      )}

      {dashboardStats.oversupplyWarning && (
        <Card className="mb-6 bg-error/5 border border-error/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-error shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-primary dark:text-text-dark-primary">
                Oversupply warning: {dashboardStats.oversupplyWarning.crop}
              </p>
              <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
                {dashboardStats.oversupplyWarning.message}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-3">
          Recent activity
        </h2>
        <div className="space-y-2">
          {dashboardStats.recentActivity.map((activity) => (
            <Card key={activity.date + activity.type} variant="bordered" className="py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-primary dark:text-text-dark-primary">
                  {activity.message}
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted">
                  {activity.date}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/plan" className="flex-1">
          <Button variant="primary" className="w-full">
            Run new plan
          </Button>
        </Link>
        <Link to="/market" className="flex-1">
          <Button variant="secondary" className="w-full">
            Check market
          </Button>
        </Link>
      </div>
    </PageWrapper>
  )
}
