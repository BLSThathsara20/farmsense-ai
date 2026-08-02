import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sprout, Plus, ChevronRight, FileText } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { DemoTag } from '../components/shared/DemoTag'
import { EmptyState, ErrorState } from '../components/shared/EmptyState'
import { usePlansList } from '../hooks/useMockData'
import { useFarmStore } from '../store/farmStore'
import { apiConfig } from '../api'
import { formatShortDate } from '../lib/utils'

export default function PlansList() {
  const navigate = useNavigate()
  const { loading, error, retry, plans } = usePlansList()
  const setActivePlanId = useFarmStore((s) => s.setActivePlanId)
  const setPlans = useFarmStore((s) => s.setPlans)

  useEffect(() => {
    if (plans?.length) setPlans(plans)
  }, [plans, setPlans])

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

  if (!plans.length) {
    return (
      <PageWrapper>
        <header className="mb-6">
          <h1 className="ek-headline text-2xl sm:text-3xl text-text-primary dark:text-text-dark-primary">
            Your crop plans
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary" data-detail>
            One farm can hold many planting plans — each with its own soil match and forecasts.
          </p>
        </header>
        <EmptyState
          icon={Sprout}
          title="No plans yet"
          description="Add a soil reading to create your first crop plan. You can add more plans later for other plantings."
          actionLabel="Create first plan"
          onAction={() => navigate('/plan')}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="ek-headline text-2xl sm:text-3xl text-text-primary dark:text-text-dark-primary">
            Your crop plans
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} on this farm
          </p>
        </div>
        <Button onClick={() => navigate('/plan')} className="shrink-0">
          <Plus className="h-4 w-4" />
          New plan
        </Button>
      </header>
      {apiConfig.useMock && (
        <div className="mb-4 flex items-center gap-2">
          <DemoTag />
          <p className="text-xs text-text-muted dark:text-text-dark-muted">
            These plans are sample data from mock mode.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan, i) => {
          const finalized = plan.finalized || plan.planStatus === 'finalized'
          const crops =
            (plan.selectedCrops || []).map((c) => c.crop).filter(Boolean).join(', ') ||
            plan.topCrop ||
            'Draft matches'
          return (
            <motion.div
              key={plan.planId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/plans/${plan.planId}`}
                onClick={() => setActivePlanId(plan.planId)}
              >
                <Card variant="bordered" className="group hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-text-primary dark:text-text-dark-primary truncate">
                          {plan.title || `Plan · ${plan.topCrop || 'Crop'}`}
                        </p>
                        <Badge variant={finalized ? 'success' : 'warning'} size="sm">
                          {finalized ? 'Finalized' : 'Draft'}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary dark:text-text-dark-secondary truncate">
                        {crops}
                      </p>
                      <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
                        {plan.createdAt ? formatShortDate(plan.createdAt) : '—'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </PageWrapper>
  )
}
