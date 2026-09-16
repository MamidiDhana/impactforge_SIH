import { useState, useEffect } from 'react'
import { CheckCircle2, Clock3, Info, MapPin } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CitizenLayout } from '../../layouts/CitizenLayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { CitizenStatusBadge } from '../../components/citizen/CitizenStatusBadge'
import { ResponsiveCard } from '../../components/common/ResponsiveCard'
import { EmptyState } from '../../components/common/EmptyState'
import { JharkhandMapPreview } from '../../components/citizen/JharkhandMapPreview'
import { getReportByTrackId, type BackendReportResponse } from '../../services/reportService'
import { useProblems } from '../../context/ProblemContext'

export function CitizenProblemDetailsPage() {
  const { id } = useParams()
  const { getProblemById, getProblemByTrackId, citizenProblems } = useProblems()

  const problem =
    getProblemById(id || '') ||
    getProblemByTrackId(id || '') ||
    citizenProblems.find((item) => item.id === id || item.trackId === id)

  const [liveReport, setLiveReport] = useState<BackendReportResponse | null>(null)

  useEffect(() => {
    const trackIdToFetch = problem?.trackId
    if (trackIdToFetch) {
      getReportByTrackId(trackIdToFetch)
        .then((data) => setLiveReport(data))
        .catch(() => {
          // Keep problem fallback
        })
    }
  }, [problem?.trackId])

  if (!problem) {
    return (
      <CitizenLayout title="Problem Details">
        <PageContainer>
          <EmptyState
            title="Problem not found"
            description="This citizen problem is not available in your records."
            action={
              <Link
                to="/citizen/problems"
                className="rounded-lg bg-[#12365a] px-4 py-2 text-sm font-semibold text-white"
              >
                Back to Track Problem
              </Link>
            }
          />
        </PageContainer>
      </CitizenLayout>
    )
  }

  const timeline = problem.timelineStages || []

  const isPendingGovVerification =
    (liveReport?.verification_status || problem.verification_status || 'Pending Verification') === 'Pending Verification' &&
    problem.status !== 'Validated' &&
    problem.status !== 'Rejected'

  return (
    <CitizenLayout title="Problem Details">
      <PageContainer>
        <PageHeader
          title={problem.title}
          description="Your reported problem, Jharkhand geo-location, and current governance review context."
          breadcrumbs={[
            { label: 'Citizen', href: '/citizen/dashboard' },
            { label: 'Track Problem', href: '/citizen/problems' },
            { label: problem.trackId || 'Details' },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white">
                {problem.trackId}
              </span>
              <CitizenStatusBadge status={problem.status} />
              {isPendingGovVerification && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-300 shadow-sm">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Pending Government Verification
                </span>
              )}
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <ResponsiveCard>
              <h2 className="font-[Manrope] text-base font-bold text-[#13243b]">
                Description & Impact
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600">{problem.description}</p>
              <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:grid-cols-2">
                <span className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#187e8d]" />
                  {problem.district}, Jharkhand
                </span>
                <span>
                  Category: <strong>{problem.category}</strong>
                </span>
                <span>
                  Affected People: <strong>{problem.affectedPeople.toLocaleString()}</strong>
                </span>
                <span>
                  Urgency: <strong>{problem.urgency}</strong>
                </span>
                <span>
                  Submitted: <strong>{problem.submittedAt}</strong>
                </span>
                <span>
                  State: <strong>Jharkhand, India</strong>
                </span>
              </div>
            </ResponsiveCard>

            <ResponsiveCard>
              <div className="flex items-center justify-between">
                <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                  Tracking Summary
                </h2>
              </div>

              <ol className="mt-5 space-y-4">
                {timeline.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full ${
                        item.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'In Progress'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {item.status === 'Completed' ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Clock3 size={15} />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {item.date || item.status} · {item.responsibleRole}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </ResponsiveCard>
          </section>

          <aside className="space-y-6">
            <ResponsiveCard>
              <h2 className="font-[Manrope] font-bold text-[#13243b]">Review Information</h2>
              {problem.governmentComment ? (
                <p className="mt-3 flex gap-2 text-sm leading-6 text-slate-600">
                  <Info className="mt-1 shrink-0 text-[#187e8d]" size={16} />
                  {problem.governmentComment}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Pending evaluation by the Jharkhand District Innovation Cell.
                </p>
              )}
              <h3 className="mt-5 text-sm font-bold text-slate-700">Required Capabilities</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {problem.requiredCapabilities.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {item}
                  </span>
                ))}
              </div>
            </ResponsiveCard>

            {/* Map Preview */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Jharkhand Location Site
              </h3>
              <JharkhandMapPreview
                district={problem.district}
                locality={problem.locality}
                landmark={problem.landmark}
                latitude={problem.latitude}
                longitude={problem.longitude}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/citizen/problems"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#12365a] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1a4a7a]"
              >
                <span>Back to Track Problem</span>
              </Link>
            </div>
          </aside>
        </div>
      </PageContainer>
    </CitizenLayout>
  )
}