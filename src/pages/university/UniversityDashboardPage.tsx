import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  GraduationCap,
  Building2,
  Handshake,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Cpu,
  Activity,
  ShieldCheck,
  Award,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { HEILayout } from '../../layouts/HEILayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { DashboardWelcome } from '../../components/dashboard/DashboardWelcome'
import { SectionHeader } from '../../components/common/SectionHeader'
import { ErrorState } from '../../components/common/ErrorState'
import { EmptyState } from '../../components/common/EmptyState'
import { AnnouncementBanner } from '../../components/notifications/AnnouncementBanner'
import { useAuth } from '../../context/AuthContext'
import {
  getReports,
  getFacultyAssignments,
  getUniversityResources,
  getUniversityCollaborations,
  getUniversityGovernmentFeedback,
  type BackendReportResponse,
  type FacultyAssignmentItem,
  type UniversityResourceRequestItem,
  type UniversityCollaborationItem,
  type UniversityGovernmentFeedbackItem,
} from '../../services/reportService'

export function UniversityDashboardPage() {
  const { currentUser } = useAuth()

  // Live Backend State
  const [reports, setReports] = useState<BackendReportResponse[]>([])
  const [facultyAssignments, setFacultyAssignments] = useState<FacultyAssignmentItem[]>([])
  const [resources, setResources] = useState<UniversityResourceRequestItem[]>([])
  const [collaborations, setCollaborations] = useState<UniversityCollaborationItem[]>([])
  const [governmentFeedback, setGovernmentFeedback] = useState<UniversityGovernmentFeedbackItem[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text })
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  // Active Tab for Recent Activity Section
  const [activityTab, setActivityTab] = useState<'assignments' | 'feedback' | 'collaborations' | 'resources'>('assignments')

  // Fetch all live data from PostgreSQL APIs concurrently
  const loadDashboardData = useCallback(async (isManual = false) => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const [reportsData, assignmentsData, resourcesData, collabsData, feedbackData] = await Promise.all([
        getReports({ target_dashboard: 'university' }).catch(() => [] as BackendReportResponse[]),
        getFacultyAssignments().catch(() => [] as FacultyAssignmentItem[]),
        getUniversityResources().catch(() => [] as UniversityResourceRequestItem[]),
        getUniversityCollaborations().catch(() => [] as UniversityCollaborationItem[]),
        getUniversityGovernmentFeedback().catch(() => [] as UniversityGovernmentFeedbackItem[]),
      ])

      const verifiedHEI = reportsData.filter(
        (r) =>
          r.verification_status?.toLowerCase() === 'verified' &&
          (r.routing_target === 'university' || r.routing_target === 'both' || !r.routing_target)
      )

      setReports(verifiedHEI.length > 0 ? verifiedHEI : reportsData)
      setFacultyAssignments(assignmentsData)
      setResources(resourcesData)
      setCollaborations(collabsData)
      setGovernmentFeedback(feedbackData)

      if (isManual) {
        notify('University metrics synchronized with live database.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch live university dashboard data.'
      setFetchError(msg)
      if (isManual) {
        notify(msg, 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // -------------------------------------------------------------------------
  // 1. Live Core Metrics Calculation
  // -------------------------------------------------------------------------
  const metrics = useMemo(() => {
    // Total validated problems received
    const totalValidated = reports.length

    // Problems currently assigned to faculty
    const facultyAssigned = facultyAssignments.length

    // Problems under analysis (stage Problem Analysis or status In Progress without completed solution)
    const underAnalysis = facultyAssignments.filter(
      (a) =>
        a.current_project_stage?.toLowerCase().includes('analysis') ||
        a.assignment_status?.toLowerCase().includes('analysis') ||
        (a.overall_progress > 0 && a.overall_progress <= 25)
    ).length

    // Solutions proposed (has solution_title or stage is Proposed Solution / Prototype)
    const solutionsProposed = facultyAssignments.filter(
      (a) =>
        (a.solution_title && a.solution_title.trim().length > 0) ||
        ['proposed solution', 'prototype / pilot', 'project progress', 'impact / deployment'].includes(
          a.current_project_stage?.toLowerCase()
        )
    ).length

    // Prototypes/Pilots in progress
    const prototypesInProgress = facultyAssignments.filter(
      (a) =>
        a.current_project_stage?.toLowerCase().includes('prototype') ||
        a.current_project_stage?.toLowerCase().includes('pilot') ||
        (a.overall_progress > 25 && a.overall_progress <= 75)
    ).length

    // Problems awaiting Government feedback
    const awaitingGovernmentFeedback = governmentFeedback.filter(
      (f) =>
        f.feedback_status?.toLowerCase().includes('action') ||
        f.feedback_status?.toLowerCase().includes('pending') ||
        !f.university_response
    ).length

    // Industry/CSR collaborations
    const industryCollaborations = collaborations.length

    // Problems deployed/resolved
    const deployedResolved = facultyAssignments.filter(
      (a) =>
        a.current_project_stage?.toLowerCase().includes('deployment') ||
        a.current_project_stage?.toLowerCase().includes('impact') ||
        a.overall_progress >= 90 ||
        a.assignment_status?.toLowerCase() === 'completed'
    ).length + reports.filter((r) => r.status?.toLowerCase() === 'resolved').length

    // Average overall project progress
    const avgProgress =
      facultyAssignments.length > 0
        ? Math.round(
            facultyAssignments.reduce((acc, a) => acc + (a.overall_progress || 0), 0) / facultyAssignments.length
          )
        : 0

    return {
      totalValidated,
      facultyAssigned,
      underAnalysis,
      solutionsProposed,
      prototypesInProgress,
      awaitingGovernmentFeedback,
      industryCollaborations,
      deployedResolved,
      avgProgress,
    }
  }, [reports, facultyAssignments, governmentFeedback, collaborations])

  // -------------------------------------------------------------------------
  // 2. Visualizations Calculations
  // -------------------------------------------------------------------------

  // A. Problems by Category Breakdown
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    reports.forEach((r) => {
      const cat = r.category?.trim() || 'General'
      counts[cat] = (counts[cat] || 0) + 1
    })

    const total = reports.length || 1
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)

    const colorPalette = [
      { bg: 'bg-[#187e8d]', text: 'text-[#187e8d]', stroke: '#187e8d' },
      { bg: 'bg-[#12365a]', text: 'text-[#12365a]', stroke: '#12365a' },
      { bg: 'bg-emerald-500', text: 'text-emerald-600', stroke: '#10b981' },
      { bg: 'bg-purple-500', text: 'text-purple-600', stroke: '#8b5cf6' },
      { bg: 'bg-amber-500', text: 'text-amber-600', stroke: '#f59e0b' },
      { bg: 'bg-rose-500', text: 'text-rose-600', stroke: '#f43f5e' },
      { bg: 'bg-indigo-500', text: 'text-indigo-600', stroke: '#6366f1' },
    ]

    return sorted.map((item, index) => ({
      ...item,
      color: colorPalette[index % colorPalette.length],
    }))
  }, [reports])

  // B. Problems by Status Lifecycle Breakdown
  const statusDistribution = useMemo(() => {
    const verifiedOpen = reports.filter(
      (r) =>
        (r.status?.toLowerCase() === 'open' || r.status?.toLowerCase() === 'verified') &&
        !facultyAssignments.some((a) => a.track_id === r.track_id)
    ).length

    const activeAssigned = facultyAssignments.filter(
      (a) => a.overall_progress < 85 && a.assignment_status?.toLowerCase() !== 'completed'
    ).length

    const pilotTesting = facultyAssignments.filter(
      (a) =>
        a.current_project_stage?.toLowerCase().includes('prototype') ||
        a.current_project_stage?.toLowerCase().includes('pilot')
    ).length

    const resolved = metrics.deployedResolved

    const total = reports.length || 1

    return [
      {
        label: 'Verified / Queue',
        count: verifiedOpen,
        percentage: Math.round((verifiedOpen / total) * 100),
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        badgeBg: 'bg-blue-50',
      },
      {
        label: 'Active Research',
        count: activeAssigned,
        percentage: Math.round((activeAssigned / total) * 100),
        color: 'bg-[#187e8d]',
        textColor: 'text-[#187e8d]',
        badgeBg: 'bg-teal-50',
      },
      {
        label: 'Prototype & Pilot',
        count: pilotTesting,
        percentage: Math.round((pilotTesting / total) * 100),
        color: 'bg-amber-500',
        textColor: 'text-amber-700',
        badgeBg: 'bg-amber-50',
      },
      {
        label: 'Resolved / Deployed',
        count: resolved,
        percentage: Math.round((resolved / total) * 100),
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50',
      },
    ]
  }, [reports, facultyAssignments, metrics.deployedResolved])

  // C. Project Stage Progress Funnel Breakdown
  const stageBreakdown = useMemo(() => {
    const stages = [
      { name: 'Problem Analysis', count: 0, color: 'bg-sky-500' },
      { name: 'Proposed Solution', count: 0, color: 'bg-indigo-500' },
      { name: 'Prototype / Pilot', count: 0, color: 'bg-purple-500' },
      { name: 'Project Progress', count: 0, color: 'bg-amber-500' },
      { name: 'Impact / Deployment', count: 0, color: 'bg-emerald-500' },
    ]

    facultyAssignments.forEach((a) => {
      const st = a.current_project_stage?.toLowerCase() || ''
      if (st.includes('analysis')) stages[0].count++
      else if (st.includes('solution')) stages[1].count++
      else if (st.includes('pilot') || st.includes('prototype')) stages[2].count++
      else if (st.includes('progress') || st.includes('validation')) stages[3].count++
      else if (st.includes('deployment') || st.includes('impact')) stages[4].count++
      else stages[0].count++
    })

    const total = facultyAssignments.length || 1
    return stages.map((s) => ({
      ...s,
      percentage: Math.round((s.count / total) * 100),
    }))
  }, [facultyAssignments])

  // D. Government Feedback Status Breakdown
  const feedbackBreakdown = useMemo(() => {
    const actionReq = governmentFeedback.filter(
      (f) =>
        f.feedback_status?.toLowerCase().includes('action') ||
        f.feedback_status?.toLowerCase().includes('pending') ||
        !f.university_response
    ).length
    const responded = governmentFeedback.filter(
      (f) => f.feedback_status?.toLowerCase() === 'responded' || Boolean(f.university_response)
    ).length

    const deptCounts: Record<string, number> = {}
    governmentFeedback.forEach((f) => {
      const dept = f.government_department?.trim() || 'State Department'
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
    })

    return {
      total: governmentFeedback.length,
      actionReq,
      responded,
      deptCounts: Object.entries(deptCounts).map(([name, count]) => ({ name, count })),
    }
  }, [governmentFeedback])

  // E. Industry / CSR Collaboration Status Breakdown
  const collaborationBreakdown = useMemo(() => {
    const typeCounts: Record<string, number> = {}
    collaborations.forEach((c) => {
      const t = c.partner_type?.trim() || 'Corporate CSR'
      typeCounts[t] = (typeCounts[t] || 0) + 1
    })

    const activeCount = collaborations.filter((c) => c.collaboration_status?.toLowerCase() === 'active').length
    const avgCollabProgress =
      collaborations.length > 0
        ? Math.round(collaborations.reduce((acc, c) => acc + (c.current_progress || 0), 0) / collaborations.length)
        : 0

    return {
      total: collaborations.length,
      activeCount,
      avgCollabProgress,
      typeCounts: Object.entries(typeCounts).map(([name, count]) => ({ name, count })),
    }
  }, [collaborations])

  return (
    <HEILayout title="University Dashboard">
      <PageContainer>
        <PageHeader
          title="University Academic Innovation Command Center"
          description="Real-time operational dashboard monitoring citizen challenge intake, faculty research allocation, laboratory infrastructure, industry CSR co-sponsorships, and government directives across Jharkhand."
          breadcrumbs={[{ label: 'University', href: '/university' }]}
          action={
            <button
              type="button"
              onClick={() => loadDashboardData(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'}
              />
              <span>{isLoading ? 'Syncing...' : 'Sync Live Data'}</span>
            </button>
          }
        />

        <div className="space-y-6">
          {/* Announcement Banner */}
          <AnnouncementBanner />

          {/* Welcome Banner */}
          <DashboardWelcome
            name={currentUser?.name || 'Higher Education Institution Partner'}
            description="Welcome to the University Academic Innovation Hub. Drive multidisciplinary research to solve ground-level civic challenges verified by Jharkhand District Administrations."
          />

          {/* Error State if fetch failed */}
          {fetchError && (
            <ErrorState
              title="Failed to Load Dashboard Data"
              description={fetchError}
              onRetry={() => loadDashboardData(true)}
            />
          )}

          {/* Feedback Toast */}
          {feedbackMessage && (
            <div
              role="status"
              className={`flex items-center gap-2 rounded-xl p-4 text-xs font-bold shadow-sm animate-in fade-in ${
                feedbackMessage.type === 'error'
                  ? 'border border-red-200 bg-red-50 text-red-900'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {feedbackMessage.type === 'error' ? (
                <AlertCircle size={16} className="text-red-600 shrink-0" />
              ) : (
                <Sparkles size={16} className="text-emerald-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* 1. Live Primary Core Metrics Grid (8 Interactive Clickable Cards) */}
          {/* ----------------------------------------------------------------- */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                  Live Problem-Solving Metrics
                </h2>
                <p className="text-xs text-slate-500">
                  Calculated dynamically from live PostgreSQL database records. Click any metric to navigate directly to its module.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Synced</span>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                    <div className="mt-3 h-7 w-12 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Metric 1: Total Validated Problems */}
                <Link
                  to="/university/problem-queue"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#187e8d] hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Validated Problems
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-[#187e8d]">
                        {metrics.totalValidated}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-[#187e8d] transition group-hover:scale-110">
                      <Layers size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Problem Queue</span>
                    <ChevronRight size={13} className="text-[#187e8d] transition group-hover:translate-x-1" />
                  </div>
                </Link>

                {/* Metric 2: Problems Assigned to Faculty */}
                <Link
                  to="/university/faculty-assigned"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#12365a] hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Faculty Assigned
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-[#12365a]">
                        {metrics.facultyAssigned}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#12365a] transition group-hover:scale-110">
                      <GraduationCap size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Faculty Worklist</span>
                    <ChevronRight size={13} className="text-[#12365a] transition group-hover:translate-x-1" />
                  </div>
                </Link>

                {/* Metric 3: Problems Under Analysis */}
                <Link
                  to="/university/faculty-assigned"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-500 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Under Analysis
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-sky-600">
                        {metrics.underAnalysis}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:scale-110">
                      <Activity size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Root Cause & Specs</span>
                    <ChevronRight size={13} className="text-sky-600 transition group-hover:translate-x-1" />
                  </div>
                </Link>

                {/* Metric 4: Solutions Proposed */}
                <Link
                  to="/university/faculty-assigned"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-500 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Solutions Proposed
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-indigo-600">
                        {metrics.solutionsProposed}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:scale-110">
                      <Zap size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Architectures Formulated</span>
                    <ChevronRight size={13} className="text-indigo-600 transition group-hover:translate-x-1" />
                  </div>
                </Link>

                {/* Metric 5: Prototypes / Pilots in Progress */}
                <Link
                  to="/university/problem-queue"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-500 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Prototypes / Pilots
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-purple-600">
                        {metrics.prototypesInProgress}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600 transition group-hover:scale-110">
                      <Cpu size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Hardware & Field Testing</span>
                    <ChevronRight size={13} className="text-purple-600 transition group-hover:translate-x-1" />
                  </div>
                </Link>

                {/* Metric 6: Problems Awaiting Government Feedback */}
                <Link
                  to="/university/feedback"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-500 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Govt Feedback Pending
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-amber-600">
                        {metrics.awaitingGovernmentFeedback}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:scale-110">
                      <MessageSquareQuote size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Directives & Reviews</span>
                    <ChevronRight size={13} className="text-amber-600 transition group-hover:translate-x-1" />
                  </div>
                </Link>

                {/* Metric 7: Industry / CSR Collaborations */}
                <Link
                  to="/university/collaborations"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-500 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Industry / CSR Support
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-emerald-600">
                        {metrics.industryCollaborations}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-110">
                      <Handshake size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>CSR Co-Sponsorships</span>
                    <ChevronRight size={13} className="text-emerald-600 transition group-hover:translate-x-1" />
                  </div>
                </Link>

                {/* Metric 8: Problems Deployed / Resolved */}
                <Link
                  to="/university/problem-queue"
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-600 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Deployed / Resolved
                      </p>
                      <p className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#13243b] group-hover:text-teal-700">
                        {metrics.deployedResolved}
                      </p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:scale-110">
                      <Award size={19} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Field Impact Achieved</span>
                    <ChevronRight size={13} className="text-teal-700 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </div>
            )}
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* 2. Visualizations Section (Category, Status, Progress, CSR, Govt) */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Visual 1: Problems by Category Breakdown */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-[Manrope] text-base font-bold text-[#13243b]">
                    Problems by Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live distribution across Jharkhand challenge domains
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {reports.length} Total
                </span>
              </div>

              {categoryDistribution.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No category data available.</p>
              ) : (
                <div className="space-y-3">
                  {categoryDistribution.map((cat) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className={`size-2.5 rounded-full ${cat.color.bg}`} />
                          <span className="font-semibold text-slate-800">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="font-bold text-slate-700">{cat.count} problems</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${cat.color.bg} transition-all duration-500`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual 2: Problems by Lifecycle Status & Pipeline */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-[Manrope] text-base font-bold text-[#13243b]">
                    Problems by Lifecycle Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pipeline from citizen intake to university field resolution
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-[#187e8d]">
                  {metrics.avgProgress}% Avg Progress
                </span>
              </div>

              {/* Multi-segment Progress Pipeline Bar */}
              <div className="space-y-2">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5">
                  {statusDistribution.map((st) => (
                    <div
                      key={st.label}
                      title={`${st.label}: ${st.count} (${st.percentage}%)`}
                      className={`h-full rounded-full ${st.color} transition-all duration-500`}
                      style={{ width: `${Math.max(4, st.percentage)}%` }}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-2">
                  {statusDistribution.map((st) => (
                    <div
                      key={st.label}
                      className={`rounded-xl border border-slate-100 ${st.badgeBg} p-3 space-y-1`}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {st.label}
                      </p>
                      <div className="flex items-baseline justify-between">
                        <span className={`text-xl font-extrabold ${st.textColor}`}>
                          {st.count}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {st.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Progress Gauge */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TrendingUp size={18} className="text-[#187e8d]" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Overall Project Execution Velocity</p>
                    <p className="text-[11px] text-slate-500">Based on live milestones recorded by assigned faculty</p>
                  </div>
                </div>
                <span className="text-base font-extrabold text-[#12365a]">
                  {metrics.avgProgress}%
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Visual 3: Stage Distribution & Prototype Status & CSR/Govt Status */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Stage Breakdown Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                  Project Stage Funnel
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  {facultyAssignments.length} Assignments
                </span>
              </div>
              <div className="space-y-2.5 pt-1">
                {stageBreakdown.map((s) => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">{s.name}</span>
                      <span className="font-bold text-slate-800">{s.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${s.color}`}
                        style={{ width: `${Math.max(5, s.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Government Feedback Directives Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                  Government Feedback Status
                </h3>
                <Link
                  to="/university/feedback"
                  className="text-[11px] font-bold text-[#187e8d] hover:underline"
                >
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl bg-amber-50 p-3 border border-amber-200/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Action Required
                  </p>
                  <p className="text-xl font-extrabold text-amber-900 mt-1">
                    {feedbackBreakdown.actionReq}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-0.5">Pending Response</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Responded
                  </p>
                  <p className="text-xl font-extrabold text-emerald-900 mt-1">
                    {feedbackBreakdown.responded}
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Addressed by HEI</p>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-500 border-t border-slate-100">
                <p className="font-semibold text-slate-700 text-[11px] mb-1">State Departments Engaged:</p>
                <div className="flex flex-wrap gap-1">
                  {feedbackBreakdown.deptCounts.slice(0, 3).map((d) => (
                    <span
                      key={d.name}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                    >
                      {d.name} ({d.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Industry / CSR Collaboration Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                  Industry / CSR Status
                </h3>
                <Link
                  to="/university/collaborations"
                  className="text-[11px] font-bold text-[#187e8d] hover:underline"
                >
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl bg-purple-50 p-3 border border-purple-200/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    Active Co-Pilots
                  </p>
                  <p className="text-xl font-extrabold text-purple-900 mt-1">
                    {collaborationBreakdown.activeCount}
                  </p>
                  <p className="text-[10px] text-purple-700 mt-0.5">Joint Projects</p>
                </div>
                <div className="rounded-xl bg-teal-50 p-3 border border-teal-200/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Collab Progress
                  </p>
                  <p className="text-xl font-extrabold text-teal-900 mt-1">
                    {collaborationBreakdown.avgCollabProgress}%
                  </p>
                  <p className="text-[10px] text-teal-700 mt-0.5">Milestone Rate</p>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-500 border-t border-slate-100">
                <p className="font-semibold text-slate-700 text-[11px] mb-1">Partner Types:</p>
                <div className="flex flex-wrap gap-1">
                  {collaborationBreakdown.typeCounts.map((t) => (
                    <span
                      key={t.name}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                    >
                      {t.name} ({t.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 3. Primary Module Quick Navigation Cards                          */}
          {/* ----------------------------------------------------------------- */}
          <section className="space-y-4">
            <SectionHeader
              title="University Portal Modules"
              description="Access institutional research, faculty assignment, laboratory testing equipment, industry partnerships, and government communications."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Module 1: Problem Queue */}
              <Link
                to="/university/problem-queue"
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#187e8d] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-[#187e8d]">
                      <Layers size={20} />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {reports.length} Validated
                    </span>
                  </div>
                  <h3 className="mt-4 font-[Manrope] text-base font-bold text-[#13243b] group-hover:text-[#187e8d]">
                    Problem Queue
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    Browse, filter, and triage government-validated community challenges assigned to higher education institutions.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#187e8d]">
                  <span>Explore Problem Queue</span>
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Module 2: Faculty Assigned */}
              <Link
                to="/university/faculty-assigned"
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#12365a] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#12365a]">
                      <GraduationCap size={20} />
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                      {facultyAssignments.length} Assigned
                    </span>
                  </div>
                  <h3 className="mt-4 font-[Manrope] text-base font-bold text-[#13243b] group-hover:text-[#187e8d]">
                    Faculty Assigned
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    View assigned faculty mentors, departmental specializations, milestone progress, and proposed solutions.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#12365a]">
                  <span>Manage Assignments</span>
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Module 3: Resources & Support */}
              <Link
                to="/university/resources-support"
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-600 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Building2 size={20} />
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      {resources.length} Requests
                    </span>
                  </div>
                  <h3 className="mt-4 font-[Manrope] text-base font-bold text-[#13243b] group-hover:text-[#187e8d]">
                    Resources & Support
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    Track and requisition laboratory equipment, testing rigs, IoT sensor nodes, and computational clusters.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <span>View Equipment & Labs</span>
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Module 4: Industry / CSR Collaboration */}
              <Link
                to="/university/collaborations"
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-600 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
                      <Handshake size={20} />
                    </span>
                    <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                      {collaborations.length} Active Partners
                    </span>
                  </div>
                  <h3 className="mt-4 font-[Manrope] text-base font-bold text-[#13243b] group-hover:text-[#187e8d]">
                    Industry / CSR Collaboration
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    Connect with corporate CSR foundations, state industry wings, and technical vendors for pilot funding.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-700">
                  <span>Explore CSR Partnerships</span>
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Module 5: Government Feedback */}
              <Link
                to="/university/feedback"
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-600 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                      <MessageSquareQuote size={20} />
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      {governmentFeedback.length} Directives
                    </span>
                  </div>
                  <h3 className="mt-4 font-[Manrope] text-base font-bold text-[#13243b] group-hover:text-[#187e8d]">
                    Government Feedback
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    Official directives, validation remarks, requested changes, and submit institutional responses.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-700">
                  <span>Review Govt Directives</span>
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Module 6: Problem Details Navigator */}
              <Link
                to="/university/problem-queue"
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#187e8d] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                      <ShieldCheck size={20} />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      Deep Dive
                    </span>
                  </div>
                  <h3 className="mt-4 font-[Manrope] text-base font-bold text-[#13243b] group-hover:text-[#187e8d]">
                    Problem Details Hub
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    Complete end-to-end problem analysis, proposed solution, pilot testing, and deployment metrics.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700">
                  <span>Explore Problem Details</span>
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* 4. Live Problem Activity Feed & Tabs                              */}
          {/* ----------------------------------------------------------------- */}
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                  Active University Engagements
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time problem assignments, government communications, and industry co-pilots.
                </p>
              </div>

              {/* Activity Tab Buttons */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActivityTab('assignments')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    activityTab === 'assignments'
                      ? 'bg-white text-[#12365a] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Faculty Projects ({facultyAssignments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab('feedback')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    activityTab === 'feedback'
                      ? 'bg-white text-[#12365a] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Directives ({governmentFeedback.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab('collaborations')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    activityTab === 'collaborations'
                      ? 'bg-white text-[#12365a] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CSR ({collaborations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab('resources')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    activityTab === 'resources'
                      ? 'bg-white text-[#12365a] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Resources ({resources.length})
                </button>
              </div>
            </div>

            {/* Tab 1: Faculty Assignments */}
            {activityTab === 'assignments' && (
              facultyAssignments.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="No Faculty Problem Assignments Found"
                  description="When problems in the Problem Queue are assigned to faculty mentors, they will be tracked here."
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-3.5">Track ID</th>
                          <th className="px-5 py-3.5">Problem Title</th>
                          <th className="px-5 py-3.5">Assigned Faculty</th>
                          <th className="px-5 py-3.5">Department</th>
                          <th className="px-5 py-3.5">Stage</th>
                          <th className="px-5 py-3.5">Progress</th>
                          <th className="px-5 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {facultyAssignments.slice(0, 6).map((a) => (
                          <tr key={a.id} className="transition hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
                                {a.track_id}
                              </span>
                            </td>
                            <td className="px-5 py-4 max-w-xs">
                              <p className="font-bold text-[#13243b] line-clamp-1">{a.problem_title}</p>
                              <p className="text-xs text-slate-400">{a.district} · {a.category}</p>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-slate-700">
                              {a.assigned_faculty_name}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                              {a.faculty_department}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                                {a.current_project_stage}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#187e8d]"
                                    style={{ width: `${a.overall_progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-[#187e8d]">{a.overall_progress}%</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <Link
                                to={`/university/problems/${encodeURIComponent(a.track_id)}`}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#12365a] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1a4a7a]"
                              >
                                <span>Problem Details</span>
                                <ChevronRight size={12} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {/* Tab 2: Government Feedback Directives */}
            {activityTab === 'feedback' && (
              governmentFeedback.length === 0 ? (
                <EmptyState
                  icon={MessageSquareQuote}
                  title="No Government Directives Found"
                  description="Official feedback from district nodal officers will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {governmentFeedback.slice(0, 4).map((f) => (
                    <div
                      key={f.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition hover:border-[#187e8d]/40"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#12365a] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                            {f.track_id}
                          </span>
                          <span className="text-xs font-bold text-slate-700">{f.problem_title}</span>
                          <span className="text-xs text-slate-400">· {f.government_department}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 italic">
                          "{f.feedback}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/university/problems/${encodeURIComponent(f.track_id)}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <span>Problem Details</span>
                          <ChevronRight size={12} />
                        </Link>
                        <Link
                          to="/university/feedback"
                          className="inline-flex items-center gap-1 rounded-xl bg-[#12365a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1a4a7a]"
                        >
                          <span>Respond</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Tab 3: CSR Collaborations */}
            {activityTab === 'collaborations' && (
              collaborations.length === 0 ? (
                <EmptyState
                  icon={Handshake}
                  title="No Industry / CSR Collaborations Logged"
                  description="Initiate partnerships from the Industry & CSR Hub to connect corporate sponsors with civic projects."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {collaborations.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5 transition hover:border-purple-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="rounded-md bg-[#12365a] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                            {c.track_id}
                          </span>
                          <h4 className="font-bold text-sm text-[#13243b] mt-1">{c.partner_name}</h4>
                          <p className="text-xs text-slate-500">{c.problem_title}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {c.funding_contribution}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span>Progress: <strong>{c.current_progress}%</strong></span>
                        <Link
                          to={`/university/problems/${encodeURIComponent(c.track_id)}`}
                          className="inline-flex items-center gap-1 font-bold text-[#187e8d] hover:underline"
                        >
                          <span>Problem Details</span>
                          <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Tab 4: Lab & Project Resources */}
            {activityTab === 'resources' && (
              resources.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No Resource Requisitions Found"
                  description="Requisition laboratory testing equipment and testing rigs from the Resources & Support Hub."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {resources.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2 transition hover:border-emerald-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="rounded-md bg-[#12365a] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                            {r.track_id}
                          </span>
                          <h4 className="font-bold text-sm text-[#13243b] mt-1">{r.required_resource}</h4>
                          <p className="text-xs text-slate-500">{r.problem_title}</p>
                        </div>
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                          {r.approval_status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span>Quantity: <strong>{r.quantity_details}</strong></span>
                        <Link
                          to={`/university/problems/${encodeURIComponent(r.track_id)}`}
                          className="inline-flex items-center gap-1 font-bold text-[#187e8d] hover:underline"
                        >
                          <span>Problem Details</span>
                          <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      </PageContainer>
    </HEILayout>
  )
}
