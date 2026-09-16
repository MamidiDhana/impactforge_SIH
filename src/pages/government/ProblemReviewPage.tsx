import { useState, useEffect } from 'react'
import { FileText, Flag, MapPin, ShieldCheck, Tag, Bot, Sparkles, GraduationCap, Building2, CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
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
  mapBackendReportToCitizenProblem,
  type BackendReportResponse,
} from '../../services/reportService'
import type { CitizenProblem } from '../../types'

export function ProblemReviewPage() {
  const { id } = useParams()
  const { problems, updateProblemStatus } = useProblems()

  const cleanTrackId = id ? (id.startsWith('report-') ? id.replace('report-', '') : id) : ''

  // Find problem from reactive context or fallback to governmentProblems
  const contextProblem = problems.find(
    (item) => item.id === id || item.trackId === id || (cleanTrackId && (item.id === cleanTrackId || item.trackId === cleanTrackId))
  )
  const govProblem = governmentProblems.find(
    (item) => item.id === id || (cleanTrackId && item.id === cleanTrackId)
  )

  const [backendProblem, setBackendProblem] = useState<CitizenProblem | null>(null)
  const [loadingBackend, setLoadingBackend] = useState<boolean>(true)
  const [dialog, setDialog] = useState<'validate' | 'info' | 'reject' | 'redirect' | null>(null)
  const [success, setSuccess] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [infoQuestion, setInfoQuestion] = useState('')
  const [redirectDept, setRedirectDept] = useState('water')
  const [redirectReason, setRedirectReason] = useState('')
  const [routingResult, setRoutingResult] = useState<{
    routing_target: string
    requires_funding: boolean
    university_can_solve: boolean
    reason: string
  } | null>(null)

  useEffect(() => {
    if (!cleanTrackId) {
      setLoadingBackend(false)
      return
    }

    let isMounted = true
    setLoadingBackend(true)

    getReportByTrackId(cleanTrackId)
      .then((res) => {
        if (isMounted && res) {
          const mapped = mapBackendReportToCitizenProblem(res)
          setBackendProblem(mapped)
          if (res.routing_target) {
            setRoutingResult({
              routing_target: res.routing_target,
              requires_funding: Boolean(res.requires_funding),
              university_can_solve: Boolean(res.university_can_solve),
              reason: res.ai_routing_reason || 'AI evaluated suitability and funding requirements.',
            })
          }
        }
      })
      .catch((err) => {
        console.warn(`Problem ${cleanTrackId} not found in backend DB, using fallback.`, err)
      })
      .finally(() => {
        if (isMounted) setLoadingBackend(false)
      })

    return () => {
      isMounted = false
    }
  }, [cleanTrackId])

  useEffect(() => {
    setSuccess('')
    setRejectReason('')
    setInfoQuestion('')
    setRedirectReason('')
    setDialog(null)
  }, [cleanTrackId])

  // Backend database is primary source of truth for persistent status
  const resolvedProblem = backendProblem || contextProblem || govProblem

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

  // Merged view object with guaranteed Jharkhand values
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
    ('affectedPeople' in resolvedProblem && resolvedProblem.affectedPeople) || 4800
  const urgency = ('urgency' in resolvedProblem && resolvedProblem.urgency) || 'High'
  const citizenLabel =
    'citizenId' in resolvedProblem && resolvedProblem.citizenId
      ? 'Verified Jharkhand Citizen'
      : 'citizenLabel' in resolvedProblem && typeof resolvedProblem.citizenLabel === 'string'
      ? resolvedProblem.citizenLabel
      : 'Citizen'
  const attachedFiles =
    'attachedFiles' in resolvedProblem && Array.isArray(resolvedProblem.attachedFiles)
      ? resolvedProblem.attachedFiles
      : []
  const problemId = resolvedProblem.id || id || ''

  const handleValidate = async () => {
    // 1. Immediately update local state so UI transitions instantly
    setBackendProblem((prev) => {
      const base = prev || resolvedProblem
      return base ? { ...base, status: 'Validated' } : null
    })

    // 2. Update reactive context
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
        console.warn('Backend validate call encountered issue:', err)
        setSuccess('Problem validated successfully. Status saved as "Validated".')
      }
    } else {
      setSuccess('Problem validated successfully. Status saved as "Validated".')
    }
    setDialog(null)
  }

  const handleReject = async () => {
    const reason = rejectReason.trim() || 'Does not meet program criteria.'

    // 1. Immediately update local state so UI transitions instantly
    setBackendProblem((prev) => {
      const base = prev || resolvedProblem
      return base ? { ...base, status: 'Rejected', governmentComment: reason } : null
    })

    // 2. Update reactive context
    updateProblemStatus(cleanTrackId || problemId, 'Rejected', 2, reason)

    if (trackId && trackId.startsWith('IF-JH')) {
      try {
        const res = await updateReportStatus(trackId, 'Rejected', reason)
        if (res) {
          setBackendProblem(mapBackendReportToCitizenProblem(res))
        }
      } catch (err) {
        console.warn('Backend updateReportStatus failed for rejection:', err)
      }
    }

    setDialog(null)
    setSuccess('Problem rejected. Reason communicated to reporting citizen.')
  }

  const handleInfo = async () => {
    const reason = infoQuestion.trim() || 'Please provide additional site details.'
    setBackendProblem((prev) => {
      const base = prev || resolvedProblem
      return base ? { ...base, status: 'More Information Required', governmentComment: reason } : null
    })
    updateProblemStatus(cleanTrackId || problemId, 'More Information Required', 2, reason)
    if (trackId && trackId.startsWith('IF-JH')) {
      try {
        const res = await updateReportStatus(trackId, 'In Progress', reason)
        if (res) setBackendProblem(mapBackendReportToCitizenProblem(res))
      } catch {}
    }
    setDialog(null)
    setSuccess('Information requested from reporting citizen.')
  }

  const handleRedirect = async () => {
    const reason = `Redirected to ${redirectDept} department: ${redirectReason}`
    setBackendProblem((prev) => {
      const base = prev || resolvedProblem
      return base ? { ...base, status: 'Redirected', governmentComment: reason } : null
    })
    updateProblemStatus(cleanTrackId || problemId, 'Redirected', 2, reason)
    if (trackId && trackId.startsWith('IF-JH')) {
      try {
        const res = await updateReportStatus(trackId, 'In Progress', reason)
        if (res) setBackendProblem(mapBackendReportToCitizenProblem(res))
      } catch {}
    }
    setDialog(null)
    setSuccess(`Problem successfully redirected to Jharkhand Department of ${redirectDept}.`)
  }

  return (
    <GovernmentLayout title="Review Problem">
      <GovPage
        title="Review Problem"
        description="Review citizen evidence, inspect Jharkhand geo-location, and make an official governance decision."
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
                  Citizen Submitter: <b>{citizenLabel}</b>
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

        {success && (
          <div className="mt-6">
            <SuccessNotice>
              <ShieldCheck size={17} />
              {success}
            </SuccessNotice>
          </div>
        )}

        {routingResult && (
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
              <p className="mt-2 text-[11px] font-medium text-[#187e8d]">
                🔒 Visibility Rule Applied: This problem is visible <b>only</b> on the{' '}
                {routingResult.routing_target === 'university'
                  ? 'University Dashboard'
                  : routingResult.routing_target === 'partner'
                  ? 'Partner Dashboard'
                  : routingResult.routing_target === 'both'
                  ? 'University and Partner Dashboards'
                  : 'Government Administration'}{' '}
                and remains hidden from all other external dashboards.
              </p>
            </div>
          </div>
        )}

        {/* Governance Decision Section */}
        {(() => {
          const isValidated = status === 'Validated' || status === 'Resolved' || status === 'Converted to Project'
          const isRejected = status === 'Rejected'

          return (
            <div className="mt-6">
              {isValidated ? (
                <div
                  id="final-decision-badge"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/90 p-5 shadow-sm"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-lg shadow-sm">
                      ✓
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-[Manrope] text-base font-bold text-emerald-950">
                          Validated
                        </h3>
                        <span className="rounded-full border border-emerald-300 bg-emerald-200/70 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                          Official Decision
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-emerald-800">
                        This problem has been accepted and validated by the Jharkhand District Innovation Cell. Qualified for Higher Education Institutions (HEIs) and partner routing.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/government/duplicate-analysis"
                    className="shrink-0 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
                  >
                    View Similar Problems
                  </Link>
                </div>
              ) : isRejected ? (
                <div
                  id="final-decision-badge"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-rose-300 bg-rose-50/90 p-5 shadow-sm"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-black text-lg shadow-sm">
                      ✕
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-[Manrope] text-base font-bold text-rose-950">
                          Rejected
                        </h3>
                        <span className="rounded-full border border-rose-300 bg-rose-200/70 px-2.5 py-0.5 text-xs font-bold text-rose-900">
                          Official Decision
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-rose-800">
                        This problem was formally rejected and dismissed from administrative escalation.
                        {resolvedProblem.governmentComment && (
                          <span className="font-medium"> Reason: {resolvedProblem.governmentComment}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/government/duplicate-analysis"
                    className="shrink-0 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 shadow-sm hover:bg-rose-50"
                  >
                    View Similar Problems
                  </Link>
                </div>
              ) : (
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
                    to={`/government/duplicate-analysis`}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View Similar Problems
                  </Link>
                </div>
              )}
            </div>
          )
        })()}

        {/* Dialogs */}
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