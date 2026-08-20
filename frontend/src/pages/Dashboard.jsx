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
  FileText,
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { DemoTag } from '../components/shared/DemoTag'
import { EmptyState, ErrorState } from '../components/shared/EmptyState'
import { LazyBackground } from '../components/shared/LazyBackground'
import { useMockData } from '../hooks/useMockData'
import { useAuthStore } from '../store/authStore'
import { apiConfig } from '../api'
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
  const {
    loading,
    error,
    retry,
    topRecommendation,
    dashboardStats,
    hasSoilData: apiHasSoil,
    allSelectedCrops,
    plansOverview: dashOverview,
  } = useMockData()

  const name = user?.name || 'Farmer'
  const stats = dashboardStats || {}
  const overviewCrops = allSelectedCrops?.length
    ? allSelectedCrops
    : dashOverview?.allSelectedCrops || []
  const totalPlans = stats.totalPlans ?? dashOverview?.totalPlans ?? 0
  const draftCount = stats.draftCount ?? dashOverview?.draftCount ?? 0
  const finalizedCount = stats.finalizedCount ?? dashOverview?.finalizedCount ?? 0
  const showEmpty = !apiHasSoil && totalPlans === 0

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

  if (showEmpty) {
    return (
      <PageWrapper>
        <DashboardHero name={name}>
          <p className="mt-2 text-sm text-white/75 max-w-md leading-relaxed" data-detail>
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
        <p className="mt-2 text-sm text-white/75" data-detail>
          Overall farm view across {totalPlans || 'your'} plan
          {totalPlans === 1 ? '' : 's'}.
        </p>
      </DashboardHero>
      {apiConfig.useMock && (
        <div className="mb-4 flex items-center gap-2">
          <DemoTag />
          <p className="text-xs text-text-muted dark:text-text-dark-muted">
            This dashboard is using mock data for the prototype preview.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Plans', value: String(totalPlans), icon: FileText },
          { label: 'Finalized', value: String(finalizedCount), icon: Sprout },
          { label: 'Drafts', value: String(draftCount), icon: BarChart3 },
        ].map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
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

      {(overviewCrops.length > 0 || topRecommendation) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-secondary dark:text-text-dark-secondary">
              Crops across finalized plans
            </h2>
            <Link to="/plans" className="text-xs text-primary font-medium">
              View all plans
            </Link>
          </div>
          {overviewCrops.length > 0 ? (
            <div className="space-y-2">
              {overviewCrops.map((c) => (
                <Link key={`${c.planId}-${c.crop}`} to={`/plans/${c.planId}`}>
                  <Card variant="bordered" className="py-3 group mb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary dark:text-text-dark-primary truncate">
                          {c.crop}
                        </p>
                        <p className="text-xs text-text-muted truncate">{c.planTitle}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Link to={topRecommendation ? '/plans' : '/plan'}>
              <Card variant="featured" className="group">
                <Badge variant="primary" size="sm" className="mb-3">
                  Latest match
                </Badge>
                <h2 className="ek-headline text-3xl text-text-primary dark:text-text-dark-primary mb-1">
                  {topRecommendation?.crop}
                </h2>
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-4">
                  {topRecommendation?.confidence}% suitability
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-border dark:border-border-dark">
                  <p className="ek-mono-data text-xl text-text-primary dark:text-text-dark-primary">
                    {formatCurrency(topRecommendation?.profitEstimate)}
                  </p>
                  <ChevronRight className="h-4 w-4 text-text-muted group-hover:translate-x-0.5 transition-transform duration-200 ease-ek" />
                </div>
              </Card>
            </Link>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6" data-detail>
        {[
          { label: 'Top Score', value: `${stats.topCropScore ?? 0}%`, icon: BarChart3 },
          {
            label: 'Price Trend',
            value:
              stats.priceTrendIsPercent === false
                ? `${Math.round(stats.priceTrend ?? 0)} score`
                : formatPercent(Number(stats.priceTrend ?? 0)),
            icon: TrendingUp,
          },
          { label: 'Demand', value: stats.demandSignal || '—', icon: Sprout },
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

      {(stats.sellWindow?.label ||
        (stats.sellWindow?.start != null && stats.sellWindow?.end != null)) && (
        <Card variant="highlight" className="mb-4 border-l-accent">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="font-medium text-text-primary dark:text-text-dark-primary">
                Best sell window:{' '}
                {stats.sellWindow.label ||
                  `Week ${stats.sellWindow.start}–${stats.sellWindow.end}`}
              </p>
              <p className="text-sm text-text-secondary dark:text-text-dark-secondary" data-detail>
                {stats.sellHint ||
                  'Prices trending up — plan your harvest accordingly'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {stats.oversupplyWarning && (
        <Card className="mb-6 bg-error/5 border border-error/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-error shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-primary dark:text-text-dark-primary">
                Oversupply warning: {stats.oversupplyWarning.crop}
              </p>
              <p className="text-sm text-text-secondary dark:text-text-dark-secondary" data-detail>
                {stats.oversupplyWarning.message}
              </p>
            </div>
          </div>
        </Card>
      )}

      {Array.isArray(stats.recentActivity) && stats.recentActivity.length > 0 && (
        <div className="mb-6" data-detail>
          <h2 className="text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-3">
            Recent activity
          </h2>
          <div className="space-y-2">
            {stats.recentActivity.map((activity) => (
              <Card
                key={(activity.planId || '') + activity.date + activity.type + activity.message}
                variant="bordered"
                className="py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  {activity.planId ? (
                    <Link
                      to={`/plans/${activity.planId}`}
                      className="text-sm text-text-primary dark:text-text-dark-primary truncate hover:text-primary"
                    >
                      {activity.message}
                    </Link>
                  ) : (
                    <p className="text-sm text-text-primary dark:text-text-dark-primary">
                      {activity.message}
                    </p>
                  )}
                  <p className="text-xs text-text-muted dark:text-text-dark-muted shrink-0">
                    {activity.date}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/plan" className="flex-1">
          <Button variant="primary" className="w-full">
            New plan
          </Button>
        </Link>
        <Link to="/plans" className="flex-1">
          <Button variant="secondary" className="w-full">
            All plans
          </Button>
        </Link>
      </div>
    </PageWrapper>
  )
}
