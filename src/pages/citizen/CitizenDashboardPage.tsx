import { Bell, CheckCircle2, Compass, FilePlus2, MessageSquare, Search, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { CitizenLayout } from '../../layouts/CitizenLayout'
import { PageHeader } from '../../components/common/PageHeader'
import { PageContainer } from '../../components/common/PageContainer'
import { DashboardWelcome } from '../../components/dashboard/DashboardWelcome'
import { StatCard } from '../../components/common/StatCard'
import { QuickActionCard } from '../../components/dashboard/QuickActionCard'
import { SectionHeader } from '../../components/common/SectionHeader'
import { CitizenStatusBadge } from '../../components/citizen/CitizenStatusBadge'
import { AnnouncementBanner } from '../../components/notifications/AnnouncementBanner'
import { citizenNotifications } from '../../data/citizenNotifications'
import { useProblems } from '../../context/ProblemContext'

const activities = [
  'Problem reported with Track ID',
  'Dispatched to Jharkhand District Innovation Cell',
  'Problem evaluated by District Validator',
  'Recommended to BIT Mesra / NIT Jamshedpur',
  'Student Innovation Team mobilized',
]

export function CitizenDashboardPage() {
  const navigate = useNavigate()
  const { citizenProblems } = useProblems()

  const underReviewCount = citizenProblems.filter((p) => p.status === 'Under Review' || p.status === 'Submitted').length
  const validatedCount = citizenProblems.filter((p) => p.status === 'Validated' || p.status === 'Converted to Project').length
  const resolvedCount = citizenProblems.filter((p) => p.status === 'Resolved').length

  return (
    <CitizenLayout title="Citizen">
      <PageContainer className="space-y-6">
        <PageHeader
          title="Citizen"
          description="Report and track local problems in Jharkhand"
          action={
            <Link
              to="/citizen/submit-problem"
              className="inline-flex items-center gap-2 rounded-lg bg-[#12365a] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1a4a7a]"
            >
              <FilePlus2 size={16} />
              Report a Problem
            </Link>
          }
        />

        {/* Role-Filtered Announcement Banner */}
        <AnnouncementBanner />

        <DashboardWelcome
          name="Track Problem Overview"
          description="Report local challenges in Jharkhand, follow permanent Track IDs, and observe solutions built through university-partner collaboration."
        />

        <section>
          <SectionHeader
            title="Your Impact & Problem Tracking Overview"
            description="Jharkhand State Citizen Innovation metrics."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="My Reported Problems"
              value={String(citizenProblems.length)}
              description="Registered Track IDs"
              icon={FilePlus2}
            />
            <StatCard
              label="Under Govt Review"
              value={String(underReviewCount)}
              description="District Innovation Desk"
              icon={Search}
            />
            <StatCard
              label="Accepted Challenges"
              value={String(validatedCount)}
              description="Approved for HEI Matching"
              icon={ShieldCheck}
            />
            <StatCard
              label="Resolved Problems"
              value={String(resolvedCount)}
              description="Community Solutions"
              icon={CheckCircle2}
            />
          </div>
        </section>

        <section>
          <SectionHeader title="Quick Actions" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="Report Problem"
              description="Register a community challenge with geo-tagging."
              icon={FilePlus2}
              onClick={() => navigate('/citizen/submit-problem')}
            />
            <Link to="/citizen/problems">
              <QuickActionCard
                title="Track Problem"
                description="Review reported problems and follow live resolution progress."
                icon={Compass}
              />
            </Link>
            <Link to="/citizen/feedback">
              <QuickActionCard
                title="Feedback"
                description="Provide feedback on problem resolutions."
                icon={MessageSquare}
              />
            </Link>
            <Link to="/citizen/notifications">
              <QuickActionCard
                title="Alerts"
                description="Stay informed about problem updates and validations."
                icon={Bell}
              />
            </Link>
          </div>
        </section>

        <section>
          <SectionHeader
            title="Recent Reported Problems"
            actionText="View all"
            onAction={() => navigate('/citizen/problems')}
          />
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white">
            {citizenProblems.slice(0, 4).map((problem) => (
              <div
                key={problem.id}
                className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#12365a]">
                      {problem.trackId}
                    </span>
                    <span className="text-slate-300">•</span>
                    <h3 className="font-semibold text-[#13243b]">{problem.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {problem.category} · {problem.location} · {problem.submittedAt}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <CitizenStatusBadge status={problem.status} />
                  <Link
                    to={`/citizen/problems/${problem.id}`}
                    className="rounded-lg border border-[#12365a] px-3 py-1.5 text-xs font-bold text-[#12365a] transition hover:bg-slate-50"
                  >
                    Track Status
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <SectionHeader title="Recent Activity" />
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <ul className="space-y-4">
                {activities.map((activity, index) => (
                  <li key={activity} className="flex gap-3 text-sm text-slate-600">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1c91a1]" />
                    {activity}
                    <span className="ml-auto text-xs text-slate-400">{index + 1}d ago</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <SectionHeader
              title="Notifications"
              actionText="View all"
              onAction={() => navigate('/citizen/notifications')}
            />
            <div className="rounded-xl border border-slate-200 bg-white">
              {citizenNotifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className="flex gap-3 border-b border-slate-100 p-4 last:border-0"
                >
                  <Bell size={16} className="mt-0.5 shrink-0 text-[#187e8d]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{notification.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{notification.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </PageContainer>
    </CitizenLayout>
  )
}