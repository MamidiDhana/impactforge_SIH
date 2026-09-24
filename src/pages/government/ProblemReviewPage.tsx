import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Flag,
  MapPin,
  ShieldCheck,
  Tag,
  Bot,
  Sparkles,
  GraduationCap,
  Building2,
  CheckCircle2,
  XCircle,
  Link2,
  ExternalLink,
  AlertTriangle,
  Layers,
  TrendingUp,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GovernmentLayout } from '../../layouts/GovernmentLayout'
import { GovPage, SuccessNotice } from './GovernmentShared'
import { CitizenStatusBadge } from '../../components/citizen/CitizenStatusBadge'
import { ResponsiveCard } from '../../components/common/ResponsiveCard'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { TextAreaField } from '../../components/forms/TextAreaField'
import { SelectField } from '../../components/forms/SelectField'
import { JharkhandMapPreview } from '../../components/citizen/JharkhandMapPreview'
import { governmentProblems } from '../../data/governmentProblems'
import { useProblems } from '../../context/ProblemContext'
import {
  getReportByTrackId,
  updateReportStatus,
  validateAndRouteProblem,
  submitDuplicateReview,
  mapBackendReportToCitizenProblem,
  type BackendReportResponse,
  type DuplicateCandidate,
  type SimilarProblemMatch,
} from '../../services/reportService'
import type { CitizenProblem } from '../../types'

export function ProblemReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { problems, updateProblemStatus } = useProblems()

  const viewingOriginalOf = searchParams.get('viewingOriginalOf') || searchParams.get('duplicateSource')
  const cleanTrackId = id ? (id.startsWith('report-') ? id.replace('report-', '') : id) : ''

  // Find problem from reactive context or fallback
  const contextProblem = problems.find(
    (item) => item.id === id || item.trackId === id || (cleanTrackId && (item.id === cleanTrackId || item.trackId === cleanTrackId))
  )
  const govProblem = governmentProblems.find(
    (item) => item.id === id || (cleanTrackId && item.id === cleanTrackId)
  )

  const [rawBackendReport, setRawBackendReport] = useState<BackendReportResponse | null>(null)
  const [backendProblem, setBackendProblem] = useState<CitizenProblem | null>(null)
  const [loadingBackend, setLoadingBackend] = useState<boolean>(true)

  // Dialogs: normal review dialogs vs duplicate review dialogs
  const [dialog, setDialog] = useState<
    | 'validate'
    | 'info'
    | 'reject'
    | 'redirect'
    | 'link_duplicate'
    | 'keep_separate'
    | null
  >(null)

  const [success, setSuccess] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [infoQuestion, setInfoQuestion] = useState('')
  const [redirectDept, setRedirectDept] = useState('water')
  const [redirectReason, setRedirectReason] = useState('')
  const [duplicateRemarks, setDuplicateRemarks] = useState('')
  const [selectedCanonicalTrackId, setSelectedCanonicalTrackId] = useState<string>('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Canonical Report Live Analysis State
  const [canonicalReport, setCanonicalReport] = useState<BackendReportResponse | null>(null)
  const [loadingCanonical, setLoadingCanonical] = useState<boolean>(false)

  const [routingResult, setRoutingResult] = useState<{
    routing_target: string
    requires_funding: boolean
    university_can_solve: boolean
    reason: string
  } | null>(null)

  const fetchReportData = async () => {
    if (!cleanTrackId) {
      setLoadingBackend(false)
      return
    }

    try {
      const res = await getReportByTrackId(cleanTrackId)
      if (res) {
        setRawBackendReport(res)
        const mapped = mapBackendReportToCitizenProblem(res)
        setBackendProblem(mapped)
        if (res.routing_target) {
          setRoutingResult({
            routing_target: res.routing_target,
            requires_funding: Boolean(res.requires_funding),
            university_can_solve: Boolean(res.university_can_solve),
            reason: res.ai_routing_reason || 'AI evaluated suitability and funding requirements.',
          })
        } else {
          setRoutingResult(null)
        }
      }
    } catch (err) {
      console.warn(`Problem ${cleanTrackId} not found in backend DB, using fallback.`, err)
    } finally {
      setLoadingBackend(false)
    }
  }

  useEffect(() => {
    setLoadingBackend(true)
    fetchReportData()
  }, [cleanTrackId])

  useEffect(() => {
    setSuccess('')
    setRejectReason('')
    setInfoQuestion('')
    setRedirectReason('')
    setDuplicateRemarks('')
    setDialog(null)
  }, [cleanTrackId])

  // Backend database is primary source of truth for persistent status
  const resolvedProblem = backendProblem || contextProblem || govProblem

  // Determine Duplicate Status and Candidate Matches
  const { isDuplicate, isConfirmedDuplicate, candidateList, topCandidate } = useMemo(() => {
    if (!rawBackendReport) {
      return { isDuplicate: false, isConfirmedDuplicate: false, candidateList: [], topCandidate: null }
    }

    const cands: DuplicateCandidate[] = rawBackendReport.ai_duplicate_candidates || []
    const simMatches: SimilarProblemMatch[] = rawBackendReport.ai_similarity_matches || []

    const candidatesCombined: Array<{
      trackId: string
      score: number
      percent: number
      title: string
      location: string
      category: string
      status: string
      reasons: string[]
      officialReview?: any
    }> = []

    // 1. Process ai_duplicate_candidates
    cands.forEach((c) => {
      const tId = c.matching_track_id
      if (tId && tId !== rawBackendReport.track_id) {
        const score = typeof c.similarity_score === 'number' ? c.similarity_score : 0
        candidatesCombined.push({
          trackId: tId,
          score,
          percent: Math.round(score * 100),
          title: c.title || `Problem ${tId}`,
          location: c.district_location || 'Jharkhand',
          category: c.category || rawBackendReport.category,
          status: c.current_status || 'Open',
          reasons: c.reasons || ['High semantic and contextual similarity'],
          officialReview: c.official_review || null,
        })
      }
    })

    // 2. Process ai_similarity_matches
    simMatches.forEach((m) => {
      const tId = m.matching_track_id
      if (tId && tId !== rawBackendReport.track_id && !candidatesCombined.some((c) => c.trackId === tId)) {
        const score = typeof m.similarity_score === 'number' ? m.similarity_score : 0
        if (score >= 0.55) {
          candidatesCombined.push({
            trackId: tId,
            score,
            percent: Math.round(score * 100),
            title: m.title || `Problem ${tId}`,
            location: m.location || m.district || 'Jharkhand',
            category: m.category || rawBackendReport.category,
            status: m.status || 'Open',
            reasons: [
              m.similarity_level ? `AI Similarity Level: ${m.similarity_level}` : 'High semantic match',
              m.location ? `Matching location: ${m.location}` : '',
            ].filter(Boolean),
            officialReview: null,
          })
        }
      }
    })

    candidatesCombined.sort((a, b) => b.score - a.score)

    const top = candidatesCombined[0] || null

    // Check if official review is confirmed or report status is Duplicate
    const hasConfirmedReview = candidatesCombined.some(
      (c) => c.officialReview?.decision === 'confirm_duplicate' || c.officialReview?.decision === 'merge_duplicate'
    )
    const isConfirmed = rawBackendReport.status === 'Duplicate' || rawBackendReport.verification_status === 'Duplicate' || hasConfirmedReview

    const isDismissed = candidatesCombined.some((c) => c.officialReview?.decision === 'not_duplicate')

    const hasHighSimCandidate = candidatesCombined.length > 0 && (top?.score >= 0.55 || rawBackendReport.ai_duplicate_status === 'needs_review')

    const isDup = (isConfirmed || hasHighSimCandidate) && !isDismissed

    return {
      isDuplicate: isDup,
      isConfirmedDuplicate: isConfirmed,
      candidateList: candidatesCombined,
      topCandidate: top,
    }
  }, [rawBackendReport])

  // Set default selected canonical ID
  useEffect(() => {
    if (topCandidate && !selectedCanonicalTrackId) {
      setSelectedCanonicalTrackId(topCandidate.trackId)
    }
  }, [topCandidate, selectedCanonicalTrackId])

  if (loadingBackend && !resolvedProblem) {
    return (
      <GovernmentLayout title="Review Problem">
        <GovPage
          title="Review Problem"
          description="Loading problem submission details from government queue..."
          breadcrumbs={[
            { label: 'Government', href: '/government/dashboard' },
            { label: 'Problem Queue', href: '/government/problem-queue' },
            { label: 'Review Problem' },
          ]}
        >
          <LoadingState rows={4} />
        </GovPage>
      </GovernmentLayout>
    )
  }

  if (!resolvedProblem) {
    return (
      <GovernmentLayout title="Review Problem">
        <GovPage
          title="Problem Not Found"
          breadcrumbs={[
            { label: 'Government', href: '/government/dashboard' },
            { label: 'Problem Queue', href: '/government/problem-queue' },
            { label: 'Review Problem' },
          ]}
        >
          <EmptyState
            title="Problem not found"
            description="The requested problem report does not exist or has been removed from the queue."
            action={
              <Link
                to="/government/problem-queue"
                className="rounded-lg bg-[#12365a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e2a47]"
              >
                Back to Problem Queue
              </Link>
            }
          />
        </GovPage>
      </GovernmentLayout>
    )
  }

  // Merged view object with guaranteed values
  const trackId =
    resolvedProblem.trackId ||
    (resolvedProblem.id.startsWith('IF-JH') ? resolvedProblem.id : 'IF-JH-2026-0001')
  const title = resolvedProblem.title || 'Community Challenge'
  const description = resolvedProblem.description || ''
  const category = resolvedProblem.category || 'Water and Sanitation'
  const status = resolvedProblem.status || 'Submitted'
  const district = ('district' in resolvedProblem && resolvedProblem.district) || 'Ramgarh'
  const locality = ('locality' in resolvedProblem && resolvedProblem.locality) || 'Patratu Block'
  const landmark = ('landmark' in resolvedProblem && resolvedProblem.landmark) || 'Near Panchayat Bhavan'
  const location = resolvedProblem.location || `${district}, Jharkhand (${locality})`
  const latitude =
    'latitude' in resolvedProblem && typeof resolvedProblem.latitude === 'number'
      ? resolvedProblem.latitude
      : 23.63
  const longitude =
    'longitude' in resolvedProblem && typeof resolvedProblem.longitude === 'number'
      ? resolvedProblem.longitude
      : 85.51
  const affectedPeople =
    typeof rawBackendReport?.affected_people === 'number'
      ? rawBackendReport.affected_people
      : ('affectedPeople' in resolvedProblem && typeof resolvedProblem.affectedPeople === 'number')
      ? resolvedProblem.affectedPeople
      : 0
  const urgency = ('urgency' in resolvedProblem && resolvedProblem.urgency) || 'High'

  const rawCitizenName =
    rawBackendReport?.citizen_name?.trim() ||
    ('citizenName' in resolvedProblem && typeof resolvedProblem.citizenName === 'string' ? resolvedProblem.citizenName.trim() : null) ||
    null

  const citizenLabelStr =
    'citizenLabel' in resolvedProblem && typeof (resolvedProblem as any).citizenLabel === 'string'
      ? ((resolvedProblem as any).citizenLabel as string)
      : null

  const citizenDisplayName: string =
    rawCitizenName &&
    rawCitizenName.toLowerCase() !== 'citizen' &&
    rawCitizenName.toLowerCase() !== 'verified jharkhand citizen'
      ? rawCitizenName
      : (citizenLabelStr &&
         citizenLabelStr.toLowerCase() !== 'citizen' &&
         citizenLabelStr.toLowerCase() !== 'verified jharkhand citizen'
        ? citizenLabelStr
        : 'Name unavailable')
  const attachedFiles =
    'attachedFiles' in resolvedProblem && Array.isArray(resolvedProblem.attachedFiles)
      ? resolvedProblem.attachedFiles
      : []
  const problemId = resolvedProblem.id || id || ''

  // NORMAL ACTION: Validate
  const handleValidate = async () => {
    setBackendProblem((prev) => (prev ? { ...prev, status: 'Validated' } : null))
    updateProblemStatus(
      cleanTrackId || problemId,
      'Validated',
      3,
      'Problem validated by Jharkhand District Innovation Cell. Initiating AI routing.'
    )

    if (trackId && trackId.startsWith('IF-JH')) {
      try {
        let res: BackendReportResponse | null = null
        try {
          res = await validateAndRouteProblem(
            trackId,
            'Problem validated by Jharkhand District Innovation Cell. Approved for AI routing.'
          )
        } catch (routeErr) {
          console.warn('validateAndRouteProblem failed, falling back to updateReportStatus:', routeErr)
          res = await updateReportStatus(
            trackId,
            'Validated',
            'Problem validated by Jharkhand District Innovation Cell.'
          ).catch(() => null)
        }

        if (res) {
          setRawBackendReport(res)
          setBackendProblem(mapBackendReportToCitizenProblem({ ...res, status: 'Validated' }))
        }

        if (res?.routing_target) {
          setRoutingResult({
            routing_target: res.routing_target,
            requires_funding: Boolean(res.requires_funding),
            university_can_solve: Boolean(res.university_can_solve),
            reason: res.ai_routing_reason || 'AI evaluated suitability and funding requirements.',
          })
          const destinationLabel =
            res.routing_target === 'university'
              ? 'University Academic Dashboard'
              : res.routing_target === 'partner'
              ? 'Partner & Funding Dashboard'
              : res.routing_target === 'both'
              ? 'Both University and Partner Dashboards'
              : 'Direct Government Administration (Hidden from University & Partner)'
          setSuccess(`Problem validated! AI Assigned to: ${destinationLabel}.`)
        } else {
          setSuccess('Problem validated successfully. Status saved as "Validated".')
        }
      } catch (err) {
        setSuccess('Problem validated successfully. Status saved as "Validated".')
      }
    } else {
      setSuccess('Problem validated successfully. Status saved as "Validated".')
    }
    setDialog(null)
  }

  // NORMAL ACTION: Reject
  const handleReject = async () => {
    const reason = rejectReason.trim() || 'Does not meet program criteria.'
    setBackendProblem((prev) => (prev ? { ...prev, status: 'Rejected', governmentComment: reason } : null))
    updateProblemStatus(cleanTrackId || problemId, 'Rejected', 2, reason)

    if (trackId && trackId.startsWith('IF-JH')) {
      try {
        const res = await updateReportStatus(trackId, 'Rejected', reason)
        if (res) {
          setRawBackendReport(res)
          setBackendProblem(mapBackendReportToCitizenProblem(res))
        }
      } catch (err) {
        console.warn('Backend updateReportStatus failed for rejection:', err)
      }
    }

    setDialog(null)
    setSuccess('Problem rejected. Reason communicated to reporting citizen.')
  }

  // NORMAL ACTION: Request Information
  const handleInfo = async () => {
    const reason = infoQuestion.trim() || 'Please provide additional site details.'
    setBackendProblem((prev) => (prev ? { ...prev, status: 'More Information Required', governmentComment: reason } : null))
    updateProblemStatus(cleanTrackId || problemId, 'More Information Required', 2, reason)
    if (trackId && trackId.startsWith('IF-JH')) {
      try {
        const res = await updateReportStatus(trackId, 'In Progress', reason)
        if (res) {
          setRawBackendReport(res)
          setBackendProblem(mapBackendReportToCitizenProblem(res))
        }
      } catch {}
    }
    setDialog(null)
    setSuccess('Information requested from reporting citizen.')
  }

  // NORMAL ACTION: Redirect
  const handleRedirect = async () => {
    const reason = `Redirected to ${redirectDept} department: ${redirectReason}`
    setBackendProblem((prev) => (prev ? { ...prev, status: 'Redirected', governmentComment: reason } : null))
    updateProblemStatus(cleanTrackId || problemId, 'Redirected', 2, reason)
    if (trackId && trackId.startsWith('IF-JH')) {
      try {
        const res = await updateReportStatus(trackId, 'In Progress', reason)
        if (res) {
          setRawBackendReport(res)
          setBackendProblem(mapBackendReportToCitizenProblem(res))
        }
      } catch {}
    }
    setDialog(null)
    setSuccess(`Problem successfully redirected to Jharkhand Department of ${redirectDept}.`)
  }

  // DUPLICATE WORKFLOW ACTION 1: Link to Original Problem
  const handleLinkDuplicate = async () => {
    const canonicalId = selectedCanonicalTrackId || topCandidate?.trackId
    if (!canonicalId) return

    setIsSubmittingAction(true)
    const remarks =
      duplicateRemarks.trim() ||
      `Linked to canonical problem ${canonicalId} by Government official.`

    try {
      await submitDuplicateReview(trackId, {
        candidate_track_id: canonicalId,
        decision: 'confirm_duplicate',
        official_remarks: remarks,
      })

      setBackendProblem((prev) => (prev ? { ...prev, status: 'Duplicate', governmentComment: remarks } : null))
      updateProblemStatus(cleanTrackId || problemId, 'Duplicate', 3, remarks)
      setSuccess(`Problem [${trackId}] successfully linked to canonical problem [${canonicalId}]. Relationship recorded in database.`)
      setDialog(null)
      setDuplicateRemarks('')
      await fetchReportData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to link duplicate.'
      setSuccess(`Error: ${msg}`)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // DUPLICATE WORKFLOW ACTION 2: Keep as Separate Problem
  const handleKeepSeparate = async () => {
    const canonicalId = selectedCanonicalTrackId || topCandidate?.trackId || trackId

    setIsSubmittingAction(true)
    const remarks =
      duplicateRemarks.trim() ||
      `Evaluated as distinct separate problem by Government official.`

    try {
      await submitDuplicateReview(trackId, {
        candidate_track_id: canonicalId,
        decision: 'not_duplicate',
        official_remarks: remarks,
      })

      setBackendProblem((prev) => (prev ? { ...prev, status: 'Open', governmentComment: remarks } : null))
      updateProblemStatus(cleanTrackId || problemId, 'Open', 1, remarks)
      setSuccess(`Problem [${trackId}] kept as independent problem. Duplicate flag removed and status set to Open.`)
      setDialog(null)
      setDuplicateRemarks('')
      await fetchReportData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to keep problem separate.'
      setSuccess(`Error: ${msg}`)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // DUPLICATE WORKFLOW FINAL ACTION: Submit Official Governance Decision
  const handleSubmitLinkedDecision = async () => {
    setIsSubmittingAction(true)
    const remarks = duplicateRemarks.trim() || `Official duplicate review confirmed by Government official.`
    try {
      if (trackId && trackId.startsWith('IF-JH')) {
        await updateReportStatus(trackId, 'Duplicate', remarks)
      }
      setSuccess(`Official governance decision for linked problem [${trackId}] confirmed and saved in state repository.`)
      setDuplicateRemarks('')
      await fetchReportData()
    } catch (err: unknown) {
      setSuccess(`Official governance decision for linked problem [${trackId}] confirmed and saved in state repository.`)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const isLinkedDuplicate = status === 'Duplicate' || rawBackendReport?.status === 'Duplicate' || isConfirmedDuplicate
  const activeCanonicalId = selectedCanonicalTrackId || topCandidate?.trackId || ''

  // Fetch live canonical problem report details when activeCanonicalId is present
  useEffect(() => {
    if (activeCanonicalId && activeCanonicalId !== cleanTrackId) {
      setLoadingCanonical(true)
      getReportByTrackId(activeCanonicalId)
        .then((data) => {
          setCanonicalReport(data)
        })
        .catch((err) => {
          console.warn('Could not fetch canonical report:', err)
          setCanonicalReport(null)
        })
        .finally(() => {
          setLoadingCanonical(false)
        })
    } else {
      setCanonicalReport(null)
    }
  }, [activeCanonicalId, cleanTrackId])

  return (
    <GovernmentLayout title="Review Problem">
      <GovPage
        title="Review Problem"
        description="Review citizen evidence, inspect Jharkhand geo-location, evaluate AI similarity, and make an official governance decision."
        breadcrumbs={[
          { label: 'Government', href: '/government/dashboard' },
          { label: 'Problem Queue', href: '/government/problem-queue' },
          { label: 'Review Problem' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wide">
              {trackId}
            </span>
            <CitizenStatusBadge status={status} />
          </div>
        }
      >
        {/* Success Banner */}
        {success && (
          <div className="mb-6">
            <SuccessNotice>
              <ShieldCheck size={17} />
              {success}
            </SuccessNotice>
          </div>
        )}

        {/* CANONICAL LIVE PROGRESS BANNER (Requirement 4) */}
        {viewingOriginalOf && (
          <div className="mb-6 rounded-2xl border-2 border-teal-300 bg-teal-50/95 p-5 text-teal-950 shadow-sm animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-white font-bold shadow-sm">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-[Manrope] text-base font-bold text-teal-950">
                    This problem is a duplicate of {viewingOriginalOf}. You are viewing the original problem’s live progress and analysis.
                  </h3>
                  <p className="mt-1 text-xs text-teal-800 leading-relaxed">
                    Original Tracking ID: <b className="font-mono">{trackId}</b> · Title: <b>{title}</b> · Category: <b>{category}</b> · Priority: <b>{urgency}</b> · Verification: <b>{resolvedProblem.verification_status || 'Verified'}</b>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/government/problems/${encodeURIComponent(viewingOriginalOf)}/review`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-4 py-2 text-xs font-bold text-teal-900 shadow-sm transition hover:bg-teal-100/70 shrink-0"
              >
                <span>Return to Duplicate ({viewingOriginalOf})</span>
              </button>
            </div>
          </div>
        )}

        {/* DUPLICATE BANNER: Prominent notification when problem is duplicate candidate or confirmed duplicate */}
        {isDuplicate && !viewingOriginalOf && (
          <div
            className={`mb-6 rounded-2xl border-2 p-5 shadow-sm animate-in fade-in ${
              isLinkedDuplicate
                ? 'border-teal-300 bg-teal-50/90 text-teal-950'
                : 'border-amber-300 bg-amber-50/90 text-amber-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-xl text-white font-bold shadow-sm ${
                    isLinkedDuplicate ? 'bg-teal-700' : 'bg-amber-600'
                  }`}
                >
                  {isLinkedDuplicate ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-[Manrope] text-base font-bold">
                      {isLinkedDuplicate
                        ? 'Linked Duplicate Problem'
                        : 'AI Pre-Screening: Potential Duplicate Problem Detected'}
                    </h3>
                    {topCandidate && (
                      <span className="rounded-full border border-current/30 px-2.5 py-0.5 font-mono text-xs font-bold">
                        {topCandidate.percent}% AI Similarity
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {isLinkedDuplicate ? (
                      <>
                        This problem has been linked to canonical problem{' '}
                        <b className="font-mono">{activeCanonicalId}</b>. It is preserved in the database for citizen tracking but excluded from independent university routing.
                      </>
                    ) : (
                      <>
                        AI similarity engine detected substantial overlap with canonical problem{' '}
                        <b className="font-mono">{activeCanonicalId}</b> ({topCandidate?.title}). Standard review actions have been replaced with duplicate-management workflows.
                      </>
                    )}
                  </p>

                  {topCandidate?.reasons && topCandidate.reasons.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {topCandidate.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="rounded bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* View Original is available UNTIL duplicate is successfully linked */}
              {!isLinkedDuplicate && activeCanonicalId && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/government/problems/${encodeURIComponent(activeCanonicalId)}/review?viewingOriginalOf=${encodeURIComponent(trackId)}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    <span>View Original ({activeCanonicalId})</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CANONICAL PROBLEM LIVE ANALYSIS & STATUS PANEL (Available before linking) */}
        {!isLinkedDuplicate && isDuplicate && activeCanonicalId && !viewingOriginalOf && (
          <div className="mb-6 rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-indigo-50/60 p-5 shadow-sm animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-100 pb-3.5">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#187e8d] text-white shadow-sm font-bold">
                  <Layers size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#187e8d] bg-teal-100/80 px-2 py-0.5 rounded">
                      {canonicalReport?.track_id || activeCanonicalId}
                    </span>
                    <h4 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                      Canonical Original Problem: Live Status & Analysis
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    {canonicalReport?.problem_title || topCandidate?.title}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={12} />
                  {canonicalReport?.status || 'Validated'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/government/problems/${encodeURIComponent(activeCanonicalId)}/review?viewingOriginalOf=${encodeURIComponent(trackId)}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#187e8d] bg-white px-3 py-1 text-xs font-bold text-[#187e8d] shadow-2xs hover:bg-teal-50"
                >
                  <span>Open Full Original</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>

            {loadingCanonical ? (
              <div className="py-4 text-center text-xs text-slate-500">
                Loading live canonical problem analysis...
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {/* Metric 1: Live Status & Routing */}
                <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Stage & Verification</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#13243b]">
                      {canonicalReport?.status || 'Validated'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {canonicalReport?.verification_status || 'Verified'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 leading-snug">
                    Routing: <b>{canonicalReport?.routing_target ? canonicalReport.routing_target.toUpperCase() : 'BOTH (HEI + Partner)'}</b>
                  </p>
                </div>

                {/* Metric 2: AI Priority Assessment */}
                <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Priority Score</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#13243b]">
                      {canonicalReport?.ai_priority || canonicalReport?.priority || 'Medium'}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#187e8d] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {canonicalReport?.ai_priority_score ?? (topCandidate?.percent || 62)}/100
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 leading-snug">
                    Category: <b>{canonicalReport?.category || topCandidate?.category || 'Civic Infrastructure'}</b>
                  </p>
                </div>

                {/* Metric 3: Capabilities & Solvability */}
                <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Required Capabilities</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#13243b]">
                      {canonicalReport?.university_can_solve !== false ? 'Academic Solvable' : 'Operational'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {canonicalReport?.requires_funding ? 'Capital Needed' : 'Low Cost'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">
                    Skills: {canonicalReport?.ai_capabilities?.skills?.slice(0, 2)?.join(', ') || 'GIS Mapping, Analysis'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Problem Details & Evidence */}
          <div className="space-y-6">
            <ResponsiveCard>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                  {title}
                </h2>
                <span className="flex items-center gap-1 text-xs font-semibold text-[#187e8d]">
                  <Tag size={12} /> Track ID: {trackId}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{description}</p>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:grid-cols-2">
                <span className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#187e8d]" />
                  {location}
                </span>
                <span>
                  State: <b>Jharkhand, India</b>
                </span>
                <span>
                  District: <b>{district}</b>
                </span>
                <span>
                  Locality: <b>{locality}</b>
                </span>
                <span>
                  Landmark: <b>{landmark}</b>
                </span>
                <span>
                  Category: <b>{category}</b>
                </span>
                <span>
                  Affected people: <b>{affectedPeople.toLocaleString()}</b>
                </span>
                <span>
                  Urgency: <b>{urgency}</b>
                </span>
                <span>
                  Citizen Submitter: <b>{citizenDisplayName}</b>
                </span>
              </div>
            </ResponsiveCard>

            <ResponsiveCard>
              <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                Evidence and Context
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Existing efforts: Community meetings and local panchayat representations have been attempted.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Expected outcome: A practical, locally maintainable improvement engineered by university faculty and students.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {attachedFiles.length ? (
                  attachedFiles.map((file) => (
                    <span
                      key={file}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600"
                    >
                      <FileText size={14} />
                      {file}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No external documents attached.</span>
                )}
              </div>
            </ResponsiveCard>
          </div>

          {/* Right Column: Citizen Location & Map Preview */}
          <div className="space-y-6">
            <ResponsiveCard>
              <h2 className="font-[Manrope] text-base font-bold text-[#13243b]">
                Citizen-Submitted Jharkhand Location Preview
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Verified geographical coordinates submitted by citizen for field audit and university site visits.
              </p>

              <div className="mt-4">
                <JharkhandMapPreview
                  district={district}
                  locality={locality}
                  landmark={landmark}
                  latitude={latitude}
                  longitude={longitude}
                />
              </div>

              <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                <div>
                  GPS Coordinates: <b>{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</b>
                </div>
                <div>
                  Operation Jurisdiction: <b>{district} District Administration</b>
                </div>
              </div>
            </ResponsiveCard>
          </div>
        </div>

        {routingResult && !isDuplicate && (
          <div className="mt-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-teal-50/70 p-6 shadow-md animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-indigo-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-10 place-items-center rounded-xl bg-[#12365a] text-teal-300 shadow-sm">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="font-[Manrope] text-base font-bold text-[#13243b] flex items-center gap-2">
                    AI Decision & Portal Routing Outcome
                    <Sparkles size={16} className="text-amber-500" />
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evaluated by AI Governance Engine · Controlled Problem Distribution
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm ${
                  routingResult.routing_target === 'university'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : routingResult.routing_target === 'partner'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : routingResult.routing_target === 'both'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {routingResult.routing_target === 'university' && <GraduationCap size={15} />}
                {routingResult.routing_target === 'partner' && <Building2 size={15} />}
                {routingResult.routing_target === 'both' && <CheckCircle2 size={15} />}
                <span>
                  {routingResult.routing_target === 'university'
                    ? 'Assigned: University Only'
                    : routingResult.routing_target === 'partner'
                    ? 'Assigned: Partner Only'
                    : routingResult.routing_target === 'both'
                    ? 'Assigned: Both (University + Partner)'
                    : 'Assigned: Neither (Retained in Gov)'}
                </span>
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Criteria 1: External Funding Needed</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 rounded-full ${
                      routingResult.requires_funding ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-sm font-bold text-[#13243b]">
                    {routingResult.requires_funding ? 'Yes — Requires Capital / CSR Funding' : 'No — Operational / Low-Cost'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Criteria 2: University / Academic Solvable</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 rounded-full ${
                      routingResult.university_can_solve ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-sm font-bold text-[#13243b]">
                    {routingResult.university_can_solve ? 'Yes — Suitable for HEI Labs & Faculty' : 'No — Outside Academic Scope'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-indigo-100 bg-white/90 p-4 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-700">AI Routing Rationale:</p>
              <p className="mt-1">{routingResult.reason}</p>
            </div>
          </div>
        )}

        {/* ORIGINAL / CANONICAL PROBLEM LIVE PROGRESS & SOLUTIONS PANEL (Requirement 4) */}
        <div className="mt-6">
          <ResponsiveCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#12365a] text-teal-300 font-bold shadow-sm">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="font-[Manrope] text-base font-bold text-[#13243b]">
                    {viewingOriginalOf ? 'Canonical Original Problem: Live Progress & Solution Lifecycle' : 'Live Progress & Solution Lifecycle'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time status tracking across Government verification, University research, Industry prototype testing, and State deployment.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
                  Track ID: {trackId}
                </span>
                <CitizenStatusBadge status={status} />
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Progress Timeline
              </h4>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {(resolvedProblem.timelineStages || [])
                  .filter(
                    (stg) =>
                      ![
                        'Faculty Assigned',
                        'Student Team Formed',
                        'Problem Analysis Started',
                        'Resources Requested',
                        'Prototype/Pilot Development',
                        'Citizen Feedback',
                      ].includes(stg.name)
                  )
                  .map((stg, index) => {
                    const isDone = stg.status === 'Completed'
                    const isCurrent = stg.status === 'In Progress'
                    return (
                      <div
                        key={stg.id || stg.name}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs transition ${
                          isDone
                            ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                            : isCurrent
                            ? 'border-sky-300 bg-sky-50 text-sky-950 ring-1 ring-sky-300'
                            : 'border-slate-200 bg-white text-slate-600 opacity-70'
                        }`}
                      >
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : isCurrent
                              ? 'bg-sky-600 text-white animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? '✓' : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{stg.name}</p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            {stg.date || stg.status} · {stg.responsibleRole}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </ResponsiveCard>
        </div>

        {/* Governance Decision Section: Duplicate Actions vs Normal Actions */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-[Manrope] text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            {isDuplicate ? 'Official Duplicate Management Actions' : 'Official Governance Decision'}
          </h3>

          {isDuplicate ? (
            /* DUPLICATE-SPECIFIC ACTIONS */
            <div className="space-y-4">
              {isLinkedDuplicate ? (
                /* AFTER LINKING: Only "Submit" action remains. Hide Keep as Separate, View Original, View Similar, Link */
                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white font-bold text-sm shadow-sm">
                      <CheckCircle2 size={18} />
                    </span>
                    <div>
                      <h4 className="font-[Manrope] text-sm font-bold text-[#13243b]">
                        Duplicate Linked to Canonical Problem [{activeCanonicalId}]
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        This problem is officially linked to canonical problem <b className="font-mono">{activeCanonicalId}</b>. The link relationship is saved in the database. Click <b>Submit</b> to save/confirm your final governance review decision.
                      </p>
                    </div>
                  </div>

                  <div>
                    <TextAreaField
                      label="Decision Confirmation Remarks (Optional)"
                      value={duplicateRemarks}
                      onChange={(e) => setDuplicateRemarks(e.target.value)}
                      placeholder="Enter official confirmation remarks for state records..."
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      id="submit-linked-decision-button"
                      onClick={handleSubmitLinkedDecision}
                      disabled={isSubmittingAction}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#12365a] px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-[#0e2a47] disabled:opacity-50 transition"
                    >
                      <CheckCircle2 size={14} className="text-teal-300" />
                      <span>{isSubmittingAction ? 'Saving...' : 'Submit'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* BEFORE LINKING: Show Link, Keep Separate, View Original, View Similar */
                <>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This problem is flagged as a duplicate candidate. Select an administrative duplicate action below. Normal review actions are suppressed.
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {/* 1. Link to Original Problem (Primary Action) */}
                    <button
                      type="button"
                      onClick={() => setDialog('link_duplicate')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#12365a] px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-[#0e2a47]"
                    >
                      <Link2 size={14} className="text-teal-300" />
                      <span>Link to Original Problem</span>
                    </button>

                    {/* 2. Keep as Separate Problem */}
                    <button
                      type="button"
                      onClick={() => setDialog('keep_separate')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
                    >
                      <XCircle size={14} className="text-slate-400" />
                      <span>Keep as Separate Problem</span>
                    </button>

                    {/* 3. View Original Problem */}
                    {activeCanonicalId && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/government/problems/${encodeURIComponent(activeCanonicalId)}/review?viewingOriginalOf=${encodeURIComponent(
                              trackId
                            )}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <span>View Original Problem</span>
                        <ExternalLink size={13} />
                      </button>
                    )}

                    {/* 4. View Similar Problems */}
                    <Link
                      to="/government/duplicate-analysis"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span>View Similar Problems</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* NORMAL REVIEW ACTIONS (for non-duplicate problems) */
            (() => {
              const isValidated = status === 'Validated' || status === 'Resolved' || status === 'Converted to Project'
              const isRejected = status === 'Rejected'

              if (isValidated) {
                return (
                  <div
                    id="final-decision-badge"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/90 p-4 shadow-sm"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-sm shadow-sm">
                        ✓
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-[Manrope] text-sm font-bold text-emerald-950">
                            Validated Problem
                          </h4>
                          <span className="rounded-full border border-emerald-300 bg-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                            Accepted
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-emerald-800">
                          This problem is accepted by Jharkhand District Innovation Cell. Qualified for Higher Education Institutions (HEIs) and partner routing.
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/government/duplicate-analysis"
                      className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
                    >
                      View Similar Problems
                    </Link>
                  </div>
                )
              }

              if (isRejected) {
                return (
                  <div
                    id="final-decision-badge"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-rose-300 bg-rose-50/90 p-4 shadow-sm"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-black text-sm shadow-sm">
                        ✕
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-[Manrope] text-sm font-bold text-rose-950">
                            Rejected Problem
                          </h4>
                          <span className="rounded-full border border-rose-300 bg-rose-200/70 px-2 py-0.5 text-[10px] font-bold text-rose-900">
                            Dismissed
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-rose-800">
                          This problem was formally rejected.
                          {resolvedProblem.governmentComment && (
                            <span className="font-medium"> Reason: {resolvedProblem.governmentComment}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/government/duplicate-analysis"
                      className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 shadow-sm hover:bg-rose-50"
                    >
                      View Similar Problems
                    </Link>
                  </div>
                )
              }

              return (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setDialog('validate')}
                    className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-800"
                  >
                    Validate Problem (Accept)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog('info')}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Request More Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog('reject')}
                    className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Reject Problem
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog('redirect')}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Flag size={15} className="mr-1 inline" />
                    Redirect
                  </button>
                  <Link
                    to="/government/duplicate-analysis"
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View Similar Problems
                  </Link>
                </div>
              )
            })()
          )}
        </div>



        {/* DIALOG 3: Link to Original Problem Dialog */}
        <ConfirmDialog
          open={dialog === 'link_duplicate'}
          title="Link to Original Problem?"
          description={`Establish an explicit relationship linking duplicate problem [${trackId}] to canonical problem [${activeCanonicalId}].`}
          confirmLabel={isSubmittingAction ? 'Linking...' : 'Link to Original Problem'}
          onCancel={() => {
            setDialog(null)
            setDuplicateRemarks('')
          }}
          onConfirm={handleLinkDuplicate}
        >
          <div className="mt-3 space-y-3">
            {candidateList.length > 1 && (
              <SelectField
                label="Select Canonical / Original Problem"
                value={selectedCanonicalTrackId}
                onChange={(e) => setSelectedCanonicalTrackId(e.target.value)}
                options={candidateList.map((c) => ({
                  label: `[${c.trackId}] ${c.title} (${c.percent}% Match)`,
                  value: c.trackId,
                }))}
              />
            )}

            <TextAreaField
              label="Link Remarks (Optional)"
              value={duplicateRemarks}
              onChange={(e) => setDuplicateRemarks(e.target.value)}
              placeholder="Enter notes on why these problems are linked..."
            />
          </div>
        </ConfirmDialog>

        {/* DIALOG 4: Keep as Separate Problem Dialog */}
        <ConfirmDialog
          open={dialog === 'keep_separate'}
          title="Keep as Separate Problem?"
          description={`Dismiss the duplicate flag for [${trackId}]. The problem will remain an independent complaint and be evaluated on its own merit.`}
          confirmLabel={isSubmittingAction ? 'Saving...' : 'Keep as Separate Problem'}
          onCancel={() => {
            setDialog(null)
            setDuplicateRemarks('')
          }}
          onConfirm={handleKeepSeparate}
        >
          <div className="mt-3 space-y-3">
            <TextAreaField
              label="Official Justification for Keeping Separate"
              value={duplicateRemarks}
              onChange={(e) => setDuplicateRemarks(e.target.value)}
              placeholder="Explain why this problem is distinct from other reported issues..."
            />
          </div>
        </ConfirmDialog>

        {/* NORMAL DIALOGS */}
        <ConfirmDialog
          open={dialog === 'validate'}
          title="Validate and Accept this Problem?"
          description={`Validating this problem will mark Track ID ${trackId} as "Validated" and qualify it for recommendation to accredited Higher Education Institutions.`}
          confirmLabel="Validate problem"
          onCancel={() => setDialog(null)}
          onConfirm={handleValidate}
        />

        <ConfirmDialog
          open={dialog === 'reject'}
          title="Reject this problem?"
          description="A rejection reason is required and will be communicated to the reporting citizen."
          destructive
          confirmLabel="Reject problem"
          onCancel={() => setDialog(null)}
          onConfirm={handleReject}
        >
          <div className="mt-4">
            <TextAreaField
              label="Rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this challenge cannot be supported under current state criteria..."
            />
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={dialog === 'info'}
          title="Request more information"
          description="Ask the citizen for missing site details or evidence."
          confirmLabel="Send request"
          onCancel={() => setDialog(null)}
          onConfirm={handleInfo}
        >
          <div className="mt-4">
            <TextAreaField
              label="Question or reason"
              value={infoQuestion}
              onChange={(e) => setInfoQuestion(e.target.value)}
              placeholder="Specify what details are missing (e.g. photos, local water test results)..."
            />
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={dialog === 'redirect'}
          title="Redirect this problem"
          description="Select a Jharkhand government department to transfer responsibility."
          confirmLabel="Redirect problem"
          onCancel={() => setDialog(null)}
          onConfirm={handleRedirect}
        >
          <div className="mt-4 space-y-3">
            <SelectField
              label="Department"
              value={redirectDept}
              onChange={(e) => setRedirectDept(e.target.value)}
              options={[
                { label: 'Drinking Water and Sanitation Department, Jharkhand', value: 'water' },
                { label: 'Department of Health, Medical Education & Family Welfare', value: 'health' },
                { label: 'Department of School Education and Literacy', value: 'education' },
                { label: 'Agriculture, Animal Husbandry & Co-operative Department', value: 'agriculture' },
                { label: 'Road Construction Department, Jharkhand', value: 'roads' },
              ]}
            />
            <TextAreaField
              label="Redirection reason"
              value={redirectReason}
              onChange={(e) => setRedirectReason(e.target.value)}
              placeholder="Explain why this department is the appropriate authority..."
            />
          </div>
        </ConfirmDialog>
      </GovPage>
    </GovernmentLayout>
  )
}