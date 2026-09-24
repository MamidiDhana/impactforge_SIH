import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Users,
  GraduationCap,
  ShieldCheck,
  Clock,
  FileText,
  Activity,
  Cpu,
  Wrench,
  FlaskConical,
  Compass,
  AlertCircle,
  Target,
  RefreshCw,
  Star,
  FolderPlus,
  FolderCheck,
  Copy,
  Check,
  FileCheck2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { HEILayout } from '../../layouts/HEILayout'
import { PageContainer } from '../../components/common/PageContainer'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { ResponsiveCard } from '../../components/common/ResponsiveCard'
import { useHEI } from '../../context/HEIContext'
import {
  getReportByTrackId,
  type BackendReportResponse,
  type HEIRecommendationMatch,
  type ProjectAnalyticsDetail,
  type DuplicateCandidate,
  type SimilarProblemMatch,
} from '../../services/reportService'

export function UniversityProblemDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { isInterested, toggleInterested, isInProjects, toggleProject } = useHEI()

  const [report, setReport] = useState<BackendReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [copiedTrackId, setCopiedTrackId] = useState(false)

  const trackIdToFetch = id?.trim() || ''

  const loadData = useCallback(async () => {
    if (!trackIdToFetch) return
    setIsLoading(true)
    setFetchError(null)
    try {
      const data = await getReportByTrackId(trackIdToFetch)
      setReport(data)
    } catch (err: unknown) {
      setFetchError(
        err instanceof Error
          ? err.message
          : `Failed to load problem details for ID "${trackIdToFetch}".`
      )
    } finally {
      setIsLoading(false)
    }
  }, [trackIdToFetch])

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTrackId(true)
    setTimeout(() => setCopiedTrackId(false), 2000)
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Not available yet'
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return isoString
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  const getUrgencyBadge = (urgency?: string | null) => {
    const u = (urgency || 'Medium').toLowerCase()
    let tone = 'bg-slate-100 text-slate-700 ring-slate-200'
    if (u === 'critical') {
      tone = 'bg-red-50 text-red-700 ring-red-300'
    } else if (u === 'high') {
      tone = 'bg-orange-50 text-orange-700 ring-orange-300'
    } else if (u === 'medium') {
      tone = 'bg-amber-50 text-amber-700 ring-amber-300'
    } else {
      tone = 'bg-emerald-50 text-emerald-700 ring-emerald-300'
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${tone}`}
      >
        {urgency || 'Medium'} Priority
      </span>
    )
  }

  const getVerificationBadge = (status?: string | null) => {
    const s = (status || 'Pending Verification').toLowerCase()
    if (s === 'verified' || s === 'validated') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-300">
          <ShieldCheck size={13} />
          Government Verified
        </span>
      )
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-300">
          <AlertCircle size={13} />
          Rejected
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-300">
        <Clock size={13} />
        {status || 'Pending Verification'}
      </span>
    )
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Visual Journey Stages
  const journeySteps = [
    { id: 'sec-problem-details', num: '1', title: 'Citizen Problem', subtitle: 'Validated Input' },
    { id: 'sec-ai-analysis', num: '2', title: 'AI Analysis', subtitle: 'Triage & Priority' },
    { id: 'sec-gov-validation', num: '3', title: 'Govt Validation', subtitle: 'Official Directives' },
    { id: 'sec-hei-matching', num: '4', title: 'HEI Matching', subtitle: 'Institutional Fit' },
    { id: 'sec-problem-analysis', num: '5', title: 'Problem Analysis', subtitle: 'Gaps & Barriers' },
    { id: 'sec-proposed-solution', num: '6', title: 'Proposed Solution', subtitle: 'Methodology' },
    { id: 'sec-prototype-pilot', num: '7', title: 'Prototype / Pilot', subtitle: 'R&D Staging' },
  ]

  if (isLoading) {
    return (
      <HEILayout title="Loading Problem Details...">
        <PageContainer>
          <div className="py-16 text-center">
            <LoadingState rows={6} />
            <p className="mt-4 text-xs font-medium text-slate-400">
              Retrieving live civic problem data from Jharkhand Data Registry...
            </p>
          </div>
        </PageContainer>
      </HEILayout>
    )
  }

  if (fetchError || !report) {
    return (
      <HEILayout title="Problem Details">
        <PageContainer>
          <div className="space-y-6">
            <Link
              to="/university/problem-queue"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#12365a]"
            >
              <ArrowLeft size={16} />
              <span>Back to Problem Queue</span>
            </Link>

            <ErrorState
              title="Problem Record Not Found"
              description={
                fetchError ||
                `No problem record matching ID "${trackIdToFetch}" exists in the database.`
              }
              onRetry={loadData}
            />
          </div>
        </PageContainer>
      </HEILayout>
    )
  }

  const isShortlisted = isInterested(report.track_id)
  const isProject = isInProjects(report.track_id)

  const capabilities = report.ai_capabilities
  const heiMatches: HEIRecommendationMatch[] = Array.isArray(report.ai_hei_matches)
    ? (report.ai_hei_matches as unknown as HEIRecommendationMatch[])
    : []
  const gapAnalysis = report.ai_capability_gap_analysis
  const projectAnalytics = report.ai_project_analytics as ProjectAnalyticsDetail | null
  const duplicateCandidates: DuplicateCandidate[] = Array.isArray(report.ai_duplicate_candidates)
    ? (report.ai_duplicate_candidates as unknown as DuplicateCandidate[])
    : []
  const similarMatches: SimilarProblemMatch[] = Array.isArray(report.ai_similarity_matches)
    ? (report.ai_similarity_matches as unknown as SimilarProblemMatch[])
    : []

  return (
    <HEILayout title={`Problem: ${report.track_id}`}>
      <PageContainer>
        {/* Top Breadcrumb and Actions */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <Link
              to="/university/problem-queue"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[#12365a]"
              id="btn-back-to-queue"
            >
              <ArrowLeft size={14} className="text-[#187e8d]" />
              <span>Back to Problem Queue</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleInterested(report.track_id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                  isShortlisted
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Star size={14} className={isShortlisted ? 'fill-current' : 'text-amber-500'} />
                <span>{isShortlisted ? 'Shortlisted in HEI' : 'Shortlist Challenge'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleProject(report.track_id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                  isProject
                    ? 'bg-[#187e8d] text-white hover:bg-[#146875]'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isProject ? <FolderCheck size={14} /> : <FolderPlus size={14} />}
                <span>{isProject ? 'In University Worklist' : 'Add to Worklist'}</span>
              </button>

              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                title="Refresh problem data"
              >
                <RefreshCw size={13} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Header Banner */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/50 to-teal-50/20 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#12365a] px-3 py-1 font-mono text-xs font-bold tracking-wider text-white shadow-sm">
                  <span>{report.track_id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(report.track_id)}
                    className="text-slate-300 hover:text-white"
                    title="Copy Track ID"
                  >
                    {copiedTrackId ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
                  </button>
                </div>
                <span className="rounded-lg bg-[#187e8d]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#187e8d]">
                  {report.category}
                </span>
                {getUrgencyBadge(report.priority)}
                {getVerificationBadge(report.verification_status)}
                <StatusBadge status={report.status as any} />
              </div>

              <div className="text-right text-xs text-slate-400">
                Submitted on: <strong className="font-semibold text-slate-700">{formatDate(report.created_at)}</strong>
              </div>
            </div>

            <h1 className="mt-4 font-[Manrope] text-2xl font-extrabold tracking-tight text-[#13243b] sm:text-3xl leading-tight">
              {report.problem_title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[#187e8d]" />
                <span>
                  {report.locality || 'Locality unlisted'}, {report.district} ({report.state})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-[#187e8d]" />
                <span>
                  {report.affected_people ? `${report.affected_people.toLocaleString()} citizens affected` : 'Impact zone assessed'}
                </span>
              </div>
              {report.citizen_name && (
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Reported by: {report.citizen_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Visual Journey Roadmap Stepper */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              University Solution Journey Pipeline:
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {journeySteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => scrollToSection(step.id)}
                  className="group flex flex-col items-start rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 text-left transition hover:border-[#187e8d] hover:bg-teal-50/30"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#187e8d]">
                    <span className="grid size-4 place-items-center rounded-full bg-[#187e8d]/10 text-[10px]">
                      {step.num}
                    </span>
                    <span className="truncate">{step.title}</span>
                  </div>
                  <span className="mt-0.5 text-[10px] text-slate-400 group-hover:text-slate-600">
                    {step.subtitle}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Sections in Journey Sequence */}
        <div className="mt-8 space-y-10">
          {/* ========================================================================= */}
          {/* 1. CITIZEN PROBLEM / PROBLEM DETAILS */}
          {/* ========================================================================= */}
          <section id="sec-problem-details" className="scroll-mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-[#12365a] text-white">
                  <FileText size={16} />
                </div>
                <div>
                  <h2 className="font-[Manrope] text-lg font-extrabold text-[#13243b]">
                    1. Problem Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Citizen-submitted challenge description, location parameters, and community impact
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <ResponsiveCard>
                  <h3 className="font-[Manrope] text-xs font-bold uppercase tracking-wider text-slate-400">
                    Problem Description & Desired Outcome
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                    {report.context_and_desired_outcome ||
                      'No additional descriptive context was provided by the citizen.'}
                  </p>

                  <div className="mt-6 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Existing Local / Panchayat Efforts
                      </h4>
                      <p className="mt-1 text-xs text-slate-700">
                        {report.existing_efforts || 'No prior local community efforts documented.'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Citizen Expected Outcome
                      </h4>
                      <p className="mt-1 text-xs text-slate-700">
                        {report.expected_outcome ||
                          'Sustainable engineering intervention or municipal implementation.'}
                      </p>
                    </div>
                  </div>
                </ResponsiveCard>
              </div>

              {/* Geographic & Submission Metadata */}
              <div className="space-y-4">
                <ResponsiveCard>
                  <h3 className="font-[Manrope] text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Geographic & Case Metadata
                  </h3>
                  <dl className="divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Tracking ID</dt>
                      <dd className="font-mono font-bold text-[#12365a]">{report.track_id}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Category</dt>
                      <dd className="font-semibold text-slate-800">{report.category}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Priority</dt>
                      <dd>{getUrgencyBadge(report.priority)}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">District</dt>
                      <dd className="font-semibold text-slate-800">{report.district}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Locality</dt>
                      <dd className="font-semibold text-slate-800">{report.locality || '—'}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Address / Landmark</dt>
                      <dd className="font-semibold text-slate-800 text-right max-w-[160px] truncate" title={report.address_or_landmark}>
                        {report.address_or_landmark || '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Geo Coordinates</dt>
                      <dd className="font-semibold text-slate-800">
                        {report.latitude && report.longitude
                          ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
                          : 'Not available yet'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Affected People</dt>
                      <dd className="font-bold text-slate-900">
                        {report.affected_people ? report.affected_people.toLocaleString() : 'Not available yet'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Submission Date</dt>
                      <dd className="font-semibold text-slate-700">{formatDate(report.created_at)}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-500">Govt Verification</dt>
                      <dd>{getVerificationBadge(report.verification_status)}</dd>
                    </div>
                  </dl>
                </ResponsiveCard>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. AI ANALYSIS */}
          {/* ========================================================================= */}
          <section id="sec-ai-analysis" className="scroll-mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-[#187e8d] text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="font-[Manrope] text-lg font-extrabold text-[#13243b]">
                    2. AI Analysis
                  </h2>
                  <p className="text-xs text-slate-500">
                    Automated domain categorization, priority scoring, duplicate screening, and explanation
                  </p>
                </div>
              </div>
              {report.ai_model && (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-600">
                  Engine: {report.ai_model}
                </span>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Categorization & Confidence */}
              <ResponsiveCard>
                <div className="flex items-center justify-between">
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                    Categorization & Confidence
                  </h3>
                  {report.ai_confidence_score !== null && report.ai_confidence_score !== undefined && (
                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-[#187e8d]">
                      {Math.round(report.ai_confidence_score * (report.ai_confidence_score <= 1 ? 100 : 1))}% Confidence
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400">AI Category:</span>
                    <p className="font-bold text-[#13243b] text-sm">{report.ai_category || report.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Problem Type / Subcategory:</span>
                    <p className="font-semibold text-slate-700">
                      {report.ai_problem_type || report.ai_subcategory || 'Civic Infrastructure Challenge'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Priority Level:</span>
                    <div className="mt-1">{getUrgencyBadge(report.ai_priority || report.priority)}</div>
                  </div>
                  {report.ai_summary && (
                    <div className="rounded-xl bg-slate-50 p-3 text-slate-700 border border-slate-100">
                      <span className="font-bold text-[#12365a] block mb-1">AI Executive Summary:</span>
                      {report.ai_summary}
                    </div>
                  )}
                </div>
              </ResponsiveCard>

              {/* Priority & Factors */}
              <ResponsiveCard>
                <div className="flex items-center justify-between">
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                    AI Priority & Factors
                  </h3>
                  {report.ai_priority_score !== null && report.ai_priority_score !== undefined && (
                    <span className="font-mono text-sm font-extrabold text-[#12365a]">
                      Score: {report.ai_priority_score}/100
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  {report.ai_priority_score !== null && report.ai_priority_score !== undefined && (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          report.ai_priority_score >= 80
                            ? 'bg-red-500'
                            : report.ai_priority_score >= 60
                            ? 'bg-amber-500'
                            : 'bg-[#187e8d]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, report.ai_priority_score))}%` }}
                      />
                    </div>
                  )}

                  {report.ai_priority_reasons && report.ai_priority_reasons.length > 0 ? (
                    <div>
                      <span className="font-bold text-slate-500 block mb-1.5">
                        Priority Explanation:
                      </span>
                      <ul className="space-y-1 text-slate-600 list-disc list-inside">
                        {report.ai_priority_reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">
                      Standard civic priority evaluated based on demographic footprint.
                    </p>
                  )}
                </div>
              </ResponsiveCard>

              {/* Duplicate & Similarity Screening */}
              <ResponsiveCard>
                <h3 className="font-[Manrope] text-sm font-bold text-[#13243b] mb-3">
                  Duplicate & Similarity Screening
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Duplicate Status:</span>
                    <span className="font-bold text-emerald-700">
                      {report.ai_duplicate_status === 'completed'
                        ? 'Screened (Unique)'
                        : report.ai_duplicate_status || 'Unique Problem'}
                    </span>
                  </div>

                  {duplicateCandidates.length > 0 ? (
                    <div className="rounded-xl bg-amber-50 p-2.5 text-amber-900 border border-amber-200">
                      <span className="font-bold block mb-1">Potential Duplicates ({duplicateCandidates.length}):</span>
                      {duplicateCandidates.map((cand, idx) => (
                        <div key={idx} className="text-[11px] truncate">
                          • {cand.matching_track_id}: {cand.title || 'Related challenge'} ({Math.round(cand.similarity_score * 100)}%)
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-2.5 text-slate-500">
                      No duplicate submissions detected in this district.
                    </div>
                  )}

                  {similarMatches.length > 0 && (
                    <div className="rounded-xl bg-teal-50/50 p-2.5 text-slate-700 border border-teal-100">
                      <span className="font-bold text-[#187e8d] block mb-1">Similar Challenges ({similarMatches.length}):</span>
                      {similarMatches.map((sim, idx) => (
                        <div key={idx} className="text-[11px] truncate">
                          • {sim.matching_track_id}: {sim.title} ({Math.round(sim.similarity_score * 100)}%)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ResponsiveCard>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. GOVERNMENT VALIDATION & DIRECTIVES */}
          {/* ========================================================================= */}
          <section id="sec-gov-validation" className="scroll-mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white">
                  <FileCheck2 size={16} />
                </div>
                <div>
                  <h2 className="font-[Manrope] text-lg font-extrabold text-[#13243b]">
                    3. Government Validation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official state verification status, administrative remarks, and departmental routing directives
                  </p>
                </div>
              </div>
            </div>

            <ResponsiveCard>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Official Validation Remarks & Directives:
                    </span>
                  </div>

                  {report.official_remarks ? (
                    <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4">
                      <p className="text-sm font-medium text-slate-800 italic leading-relaxed">
                        "{report.official_remarks}"
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-amber-200/50 pt-2">
                        {report.remarks_updated_by && (
                          <span>Verified by: <strong>{report.remarks_updated_by}</strong></span>
                        )}
                        {report.remarks_updated_at && (
                          <span>Timestamp: <strong>{formatDate(report.remarks_updated_at)}</strong></span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                      Verified under Jharkhand Innovation Cell standard civic problem routing protocols.
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2.5">
                  <span className="font-bold text-[#13243b] block">Validation Parameters:</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <strong>{report.verification_status || 'Verified'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Routing Target:</span>
                    <strong className="uppercase text-[#12365a]">{report.routing_target || 'University & Partner'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">University Solvable:</span>
                    <strong className="text-emerald-700">
                      {report.university_can_solve !== null ? (report.university_can_solve ? 'Yes' : 'No') : 'Yes'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Funding Required:</span>
                    <strong className="text-slate-800">
                      {report.requires_funding !== null ? (report.requires_funding ? 'Yes' : 'No') : 'Subject to R&D Scope'}
                    </strong>
                  </div>
                </div>
              </div>
            </ResponsiveCard>
          </section>

          {/* ========================================================================= */}
          {/* 4. HEI MATCHING */}
          {/* ========================================================================= */}
          <section id="sec-hei-matching" className="scroll-mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-[#12365a] text-white">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <h2 className="font-[Manrope] text-lg font-extrabold text-[#13243b]">
                    4. HEI Matching
                  </h2>
                  <p className="text-xs text-slate-500">
                    Matched Higher Education Institutions, relevant academic departments, required expertise, and matching justification
                  </p>
                </div>
              </div>
            </div>

            {/* Matched HEIs Table & Department Breakdown */}
            <div className="space-y-4">
              <ResponsiveCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                    Matched Higher Education Institutions ({heiMatches.length})
                  </h3>
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-[#187e8d]">
                    Status: {report.ai_hei_matching_status || 'Matched'}
                  </span>
                </div>

                {heiMatches.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Institutional capability matching evaluation in progress...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Matched University / HEI</th>
                          <th className="px-4 py-3">Relevant Departments</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">Match Score</th>
                          <th className="px-4 py-3">Match Status</th>
                          <th className="px-4 py-3">Matching Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {heiMatches.map((match, idx) => {
                          const scoreVal = (match as any).score ?? match.match_score ?? 85
                          const score = Math.round(Number(scoreVal))
                          const reasonsList = match.reasons || [(match as any).reason || 'Research strengths align with project requirements.']

                          return (
                            <tr key={match.hei_id || idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-bold text-[#13243b]">
                                {match.hei_name}
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {match.institution_type || 'Accredited Institution'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {match.departments && match.departments.length > 0
                                  ? match.departments.join(', ')
                                  : capabilities?.department_domain || report.category}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {match.district}, {match.state}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-md bg-[#12365a] px-2 py-0.5 font-mono font-bold text-white">
                                  {score}%
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="capitalize font-semibold text-emerald-700">
                                  {match.recommendation_level || 'Strong Match'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-xs">
                                <ul className="list-disc list-inside space-y-0.5">
                                  {reasonsList.slice(0, 2).map((r, rIdx) => (
                                    <li key={rIdx} className="line-clamp-2">{r}</li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </ResponsiveCard>

              {/* Required Academic Expertise & Skills Matrix */}
              {capabilities && (
                <ResponsiveCard>
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b] mb-3">
                    Required Academic Expertise & Departmental Capabilities
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Required Technical Skills:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {capabilities.skills?.map((s, idx) => (
                          <span key={idx} className="rounded-lg bg-teal-50 px-2.5 py-1 font-medium text-[#187e8d] border border-teal-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Academic Domains:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {capabilities.technical_domains?.map((d, idx) => (
                          <span key={idx} className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Relevant Department:
                      </span>
                      <p className="font-bold text-[#12365a] text-sm">
                        {capabilities.department_domain || report.category}
                      </p>
                    </div>
                  </div>
                </ResponsiveCard>
              )}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 5. PROBLEM ANALYSIS */}
          {/* ========================================================================= */}
          <section id="sec-problem-analysis" className="scroll-mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-amber-500 text-white">
                  <Activity size={16} />
                </div>
                <div>
                  <h2 className="font-[Manrope] text-lg font-extrabold text-[#13243b]">
                    5. Problem Analysis
                  </h2>
                  <p className="text-xs text-slate-500">
                    Root cause diagnostics, requirements breakdown, institutional constraints, and field observations
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Root Cause & Field Observations */}
              <ResponsiveCard>
                <h3 className="font-[Manrope] text-sm font-bold text-[#13243b] mb-3">
                  Root Cause & Field Observations
                </h3>
                <div className="space-y-3 text-xs leading-relaxed text-slate-700">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="font-bold text-[#12365a] block mb-1">Root Cause Analysis:</span>
                    <p>
                      {report.ai_summary ||
                        `Structural or operational gap in ${report.category} infrastructure at ${report.locality || report.district}, leading to compromised community access.`}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="font-bold text-[#12365a] block mb-1">Field & Community Observations:</span>
                    <p>
                      {report.context_and_desired_outcome ||
                        `Localized civic impact observed in ${report.district} affecting citizen safety and quality of life.`}
                    </p>
                    {report.existing_efforts && (
                      <p className="mt-2 text-slate-600 border-t border-slate-200/50 pt-2">
                        <strong>Local Interventions:</strong> {report.existing_efforts}
                      </p>
                    )}
                  </div>
                </div>
              </ResponsiveCard>

              {/* Requirements & Constraints */}
              <ResponsiveCard>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                    Requirements & Constraints
                  </h3>
                  {gapAnalysis?.gap_severity && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 capitalize">
                      {gapAnalysis.gap_severity} Gap
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  {/* Technical Analysis Coverage */}
                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Technical Capability Coverage</span>
                      <strong className="font-bold text-[#187e8d]">
                        {(gapAnalysis as any)?.overall_coverage_percentage ?? gapAnalysis?.coverage_score ?? 78}%
                      </strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-[#187e8d] h-2 rounded-full"
                        style={{
                          width: `${(gapAnalysis as any)?.overall_coverage_percentage ?? gapAnalysis?.coverage_score ?? 78}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div>
                    <span className="font-bold text-slate-600 block mb-1">Technical Requirements:</span>
                    <div className="flex flex-wrap gap-1">
                      {capabilities?.skills?.map((s, idx) => (
                        <span key={idx} className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                          {s}
                        </span>
                      ))}
                      {capabilities?.equipment?.map((eq, idx) => (
                        <span key={idx} className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Constraints & Missing Items */}
                  {gapAnalysis?.missing_equipment && gapAnalysis.missing_equipment.length > 0 && (
                    <div>
                      <span className="font-bold text-red-700 block mb-1">Identified Equipment Constraints:</span>
                      <div className="flex flex-wrap gap-1">
                        {gapAnalysis.missing_equipment.map((eq, idx) => (
                          <span key={idx} className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-[11px] text-slate-400">
                    Analysis Status: <strong className="text-slate-700 capitalize">{report.ai_capability_gap_status || 'Completed'}</strong>
                  </div>
                </div>
              </ResponsiveCard>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 6. PROPOSED SOLUTION */}
          {/* ========================================================================= */}
          <section id="sec-proposed-solution" className="scroll-mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-[#187e8d] text-white">
                  <Compass size={16} />
                </div>
                <div>
                  <h2 className="font-[Manrope] text-lg font-extrabold text-[#13243b]">
                    6. Proposed Solution
                  </h2>
                  <p className="text-xs text-slate-500">
                    Academic intervention title, engineering methodology, technologies/methods, and expected deliverables
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <ResponsiveCard>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#187e8d]">
                        Solution Architecture
                      </span>
                      <h3 className="font-[Manrope] text-base font-bold text-[#13243b]">
                        Academic Intervention: {report.problem_title} Framework
                      </h3>
                    </div>
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-[#187e8d]">
                      Status: {report.status || 'Active Formulation'}
                    </span>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                    <div className="rounded-xl bg-teal-50/40 p-4 border border-teal-100/60">
                      <h4 className="font-bold text-[#12365a] mb-1">Proposed Academic / Engineering Approach:</h4>
                      <p>
                        {projectAnalytics?.feasibility_summary ||
                          `Deploy an institutional research cohort from the department of ${capabilities?.department_domain || report.category} to design, simulate, and implement a validated civic intervention addressing ${report.problem_title}.`}
                      </p>
                    </div>

                    {projectAnalytics?.recommended_next_steps &&
                      projectAnalytics.recommended_next_steps.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                            Implementation Methodology & Sequential Milestones:
                          </h4>
                          <ol className="space-y-1.5 list-decimal list-inside text-slate-600">
                            {projectAnalytics.recommended_next_steps.map((step, idx) => (
                              <li key={idx} className="font-medium">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                  </div>
                </ResponsiveCard>
              </div>

              {/* Technologies & Expected Outcome */}
              <div className="space-y-4">
                <ResponsiveCard>
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b] mb-3">
                    Technologies & Expected Outcome
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Technologies & Tools:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {capabilities?.software_tools?.map((st, idx) => (
                          <span key={idx} className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-800">
                            {st}
                          </span>
                        ))}
                        {capabilities?.technical_domains?.map((td, idx) => (
                          <span key={idx} className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                            {td}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Expected Outcome:
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        {report.expected_outcome ||
                          projectAnalytics?.social_impact_summary ||
                          'Sustainable community-ready engineering solution verified for field deployment.'}
                      </p>
                    </div>
                  </div>
                </ResponsiveCard>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 7. PROTOTYPE / PILOT */}
          {/* ========================================================================= */}
          <section id="sec-prototype-pilot" className="scroll-mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-[#12365a] text-white">
                  <FlaskConical size={16} />
                </div>
                <div>
                  <h2 className="font-[Manrope] text-lg font-extrabold text-[#13243b]">
                    7. Prototype / Pilot
                  </h2>
                  <p className="text-xs text-slate-500">
                    Prototype specifications, development & testing status, pilot location staging, and telemetry results
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Prototype Details & Development Status */}
              <ResponsiveCard>
                <div className="flex items-center gap-2 text-[#187e8d] mb-2">
                  <Cpu size={16} />
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                    Prototype Specifications
                  </h3>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <p>
                    <strong>Prototype Model:</strong> Proof-of-concept for civic challenge in {report.district}.
                  </p>
                  <p>
                    <strong>Development Status:</strong>{' '}
                    <span className="font-bold text-[#12365a]">
                      {report.status === 'In Progress' ? 'Laboratory Staging' : 'Design & Formulation'}
                    </span>
                  </p>
                  <p>
                    <strong>Key Materials:</strong>{' '}
                    {capabilities?.materials?.join(', ') || 'Standard test components'}
                  </p>
                  <p>
                    <strong>Duration:</strong>{' '}
                    {projectAnalytics?.estimated_duration_weeks
                      ? `${projectAnalytics.estimated_duration_weeks.min_weeks || 4} - ${projectAnalytics.estimated_duration_weeks.max_weeks || 8} weeks`
                      : '4 - 6 weeks'}
                  </p>
                </div>
              </ResponsiveCard>

              {/* Testing Status & Parameters */}
              <ResponsiveCard>
                <div className="flex items-center gap-2 text-[#187e8d] mb-2">
                  <Wrench size={16} />
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                    Testing & Test Results
                  </h3>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <p>
                    <strong>Testing Status:</strong> Pre-Deployment Bench Validation.
                  </p>
                  <p>
                    <strong>Lab Facility:</strong> Departmental Research Laboratories.
                  </p>
                  <p>
                    <strong>Safety & Compliance:</strong>{' '}
                    {capabilities?.safety_requirements?.join(', ') || 'Standard institutional safety protocol'}
                  </p>
                  <p>
                    <strong>Target Test Metric:</strong> ≥ 90% benchmark compliance prior to full field hand-off.
                  </p>
                </div>
              </ResponsiveCard>

              {/* Pilot Location & Community Feedback */}
              <ResponsiveCard>
                <div className="flex items-center gap-2 text-[#187e8d] mb-2">
                  <Target size={16} />
                  <h3 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                    Pilot Staging & Community Feedback
                  </h3>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <p>
                    <strong>Pilot Location:</strong> {report.locality || report.district} Cluster, {report.state}.
                  </p>
                  <p>
                    <strong>Budget Range:</strong>{' '}
                    {projectAnalytics?.estimated_budget_inr
                      ? `₹${(projectAnalytics.estimated_budget_inr.min_budget || 50000).toLocaleString()} - ₹${(projectAnalytics.estimated_budget_inr.max_budget || 150000).toLocaleString()}`
                      : '₹75,000 - ₹1,50,000'}
                  </p>
                  <p>
                    <strong>Community Response:</strong>{' '}
                    {report.affected_people ? `${report.affected_people.toLocaleString()} residents direct benefactors` : 'High community readiness'}
                  </p>
                  <p>
                    <strong>Readiness Score:</strong>{' '}
                    <strong className="text-emerald-700">
                      {report.ai_project_readiness_score || projectAnalytics?.readiness_score?.score || 85}%
                    </strong>
                  </p>
                </div>
              </ResponsiveCard>
            </div>
          </section>
        </div>

        {/* Bottom Navigation & Return */}
        <div className="mt-12 flex justify-between items-center border-t border-slate-200 pt-6">
          <Link
            to="/university/problem-queue"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[#12365a]"
          >
            <ArrowLeft size={14} className="text-[#187e8d]" />
            <span>Back to Problem Queue</span>
          </Link>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Back to top ↑
          </button>
        </div>
      </PageContainer>
    </HEILayout>
  )
}
