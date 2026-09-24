import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MessageSquareQuote,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Send,
  Building2,
  AlertCircle,
  ChevronRight,
  Calendar,
  Compass,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { HEILayout } from '../../layouts/HEILayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { EmptyState } from '../../components/common/EmptyState'
import { Modal } from '../../components/common/Modal'
import {
  getUniversityGovernmentFeedback,
  respondToGovernmentFeedback,
  type UniversityGovernmentFeedbackItem,
} from '../../services/reportService'

export function UniversityGovernmentFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<UniversityGovernmentFeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedStage, setSelectedStage] = useState('All')

  // Respond Modal
  const [activeFeedback, setActiveFeedback] = useState<UniversityGovernmentFeedbackItem | null>(null)
  const [universityResponseText, setUniversityResponseText] = useState('')

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text })
    setTimeout(() => setFeedbackMessage(null), 4500)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const data = await getUniversityGovernmentFeedback()
      setFeedbackList(data)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load government feedback directives.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extract distinct departments
  const departments = useMemo(() => {
    const set = new Set<string>()
    feedbackList.forEach((f) => f.government_department && set.add(f.government_department.trim()))
    return ['All', ...Array.from(set).sort()]
  }, [feedbackList])

  // Extract distinct project stages
  const stages = useMemo(() => {
    const set = new Set<string>()
    feedbackList.forEach((f) => f.current_project_stage && set.add(f.current_project_stage.trim()))
    return ['All', ...Array.from(set).sort()]
  }, [feedbackList])

  const filteredItems = useMemo(() => {
    return feedbackList.filter((item) => {
      if (selectedDepartment !== 'All' && item.government_department.toLowerCase() !== selectedDepartment.toLowerCase()) {
        return false
      }
      if (selectedStatus !== 'All' && item.feedback_status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false
      }
      if (selectedStage !== 'All' && item.current_project_stage.toLowerCase() !== selectedStage.toLowerCase()) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = item.track_id.toLowerCase().includes(q)
        const matchTitle = item.problem_title.toLowerCase().includes(q)
        const matchOfficer = item.government_officer_department.toLowerCase().includes(q)
        const matchFeedback = item.feedback.toLowerCase().includes(q)
        const matchChanges = (item.requested_changes || '').toLowerCase().includes(q)
        const matchResp = (item.university_response || '').toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchOfficer && !matchFeedback && !matchChanges && !matchResp) {
          return false
        }
      }
      return true
    })
  }, [feedbackList, selectedDepartment, selectedStatus, selectedStage, searchQuery])

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeFeedback || !universityResponseText.trim()) return

    setIsSubmitting(true)
    try {
      const res = await respondToGovernmentFeedback(activeFeedback.track_id, activeFeedback.id, {
        university_response: universityResponseText.trim(),
        feedback_status: 'Responded',
      })

      notify(`Official university response submitted for ${activeFeedback.track_id}!`)
      setActiveFeedback(null)
      setUniversityResponseText('')

      if (res.feedback_item) {
        setFeedbackList((prev) =>
          prev.map((f) => (f.id === res.feedback_item!.id ? res.feedback_item! : f))
        )
      } else {
        await loadData()
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to submit response to government feedback.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return isoString
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  const getFeedbackStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'responded' || s === 'addressed' || s === 'incorporated') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>Responded</span>
        </span>
      )
    }
    if (s === 'action required' || s === 'pending response' || s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
          <AlertCircle size={12} className="text-amber-600" />
          <span>Action Required</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
        <Clock size={12} className="text-slate-500" />
        <span>{status}</span>
      </span>
    )
  }

  const totalCount = feedbackList.length
  const actionRequiredCount = feedbackList.filter(
    (f) => f.feedback_status.toLowerCase().includes('action') || f.feedback_status.toLowerCase().includes('pending')
  ).length
  const respondedCount = feedbackList.filter(
    (f) => f.feedback_status.toLowerCase() === 'responded' || Boolean(f.university_response)
  ).length
  const uniqueDeptCount = useMemo(() => {
    const set = new Set<string>()
    feedbackList.forEach((f) => set.add(f.government_department.trim()))
    return set.size
  }, [feedbackList])

  return (
    <HEILayout title="Government Feedback">
      <PageContainer>
        <PageHeader
          title="Government Feedback & Directives"
          description="Review official feedback, policy guidance, requested changes, and submit institutional responses directly to Jharkhand District Administrators and state departments."
          breadcrumbs={[
            { label: 'University', href: '/university' },
            { label: 'Government Feedback' },
          ]}
          action={
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'} />
              <span>Sync Government Directives</span>
            </button>
          }
        />

        <div className="space-y-6">
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

          {/* Key Metrics */}
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Government Directives"
                value={String(totalCount)}
                description="Live from PostgreSQL"
                icon={MessageSquareQuote}
              />
              <StatCard
                label="Action Required"
                value={String(actionRequiredCount)}
                description="Awaiting University response"
                icon={AlertCircle}
              />
              <StatCard
                label="Responded by HEI"
                value={String(respondedCount)}
                description="Clarifications & updates logged"
                icon={CheckCircle2}
              />
              <StatCard
                label="State Departments Engaged"
                value={String(uniqueDeptCount)}
                description="District administrations"
                icon={Building2}
              />
            </div>
          </section>

          {/* Search & Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Track ID, problem title, officer, department, feedback, or requested changes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition focus:border-[#187e8d] focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  aria-label="Filter by department"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d === 'All' ? 'All Departments' : d}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter by feedback status"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  <option value="All">All Feedback Statuses</option>
                  <option value="Action Required">Action Required</option>
                  <option value="Responded">Responded</option>
                </select>

                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  aria-label="Filter by project stage"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  {stages.map((st) => (
                    <option key={st} value={st}>
                      {st === 'All' ? 'All Project Stages' : st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Feedback Feed */}
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <LoadingState rows={4} />
              <p className="mt-3 text-xs text-slate-400 font-medium">Loading live directives from database...</p>
            </div>
          ) : fetchError ? (
            <ErrorState
              title="Failed to Load Government Feedback"
              description={fetchError}
              onRetry={loadData}
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="No Government Directives Found"
              description="No feedback records matched your selected filter criteria."
            />
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const hasResponded = Boolean(item.university_response && item.university_response.trim().length > 0)

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 transition hover:border-[#187e8d]/40 hover:shadow-md"
                  >
                    {/* Header Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
                          {item.track_id}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 border border-slate-200">
                          <Compass size={11} className="inline mr-1 text-[#187e8d]" />
                          {item.current_project_stage}
                        </span>
                        {getFeedbackStatusBadge(item.feedback_status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Date: {formatDate(item.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Problem Title & Officer/Department */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#187e8d]">
                        Target Problem / Project
                      </span>
                      <h3 className="font-[Manrope] text-base font-bold text-[#13243b] mt-0.5">
                        {item.problem_title}
                      </h3>

                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 rounded-xl px-3.5 py-2 border border-slate-100">
                        <Building2 size={15} className="text-[#187e8d] shrink-0" />
                        <span>Government Officer / Department:</span>
                        <span className="text-[#12365a] font-bold">{item.government_officer_department}</span>
                      </div>
                    </div>

                    {/* Official Feedback & Requested Changes Boxes */}
                    <div className="space-y-2.5">
                      {/* Feedback */}
                      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 to-amber-50/20 p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <MessageSquareQuote size={15} className="text-amber-700" />
                            <span>Government Feedback:</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                            Official Directive
                          </span>
                        </div>
                        <p className="text-xs font-medium text-amber-950 leading-relaxed pl-5">
                          "{item.feedback}"
                        </p>
                      </div>

                      {/* Requested Changes (if specified) */}
                      {item.requested_changes && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                            <FileText size={14} className="text-blue-700" />
                            <span>Requested Changes / Action Items:</span>
                          </div>
                          <p className="text-xs font-medium text-blue-950 leading-relaxed pl-5">
                            {item.requested_changes}
                          </p>
                        </div>
                      )}

                      {/* University Response (if already responded) */}
                      {hasResponded && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span>University Official Response:</span>
                            </div>
                            {item.responded_at && (
                              <span className="text-[10px] font-medium text-emerald-700">
                                Responded on {formatDate(item.responded_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-emerald-950 leading-relaxed pl-5">
                            "{item.university_response}"
                          </p>
                          {item.responded_by_name && (
                            <p className="text-[11px] text-emerald-700 pl-5">
                              Submitted by: <strong>{item.responded_by_name}</strong>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Directive #{item.id}</span>
                        <span className="text-slate-300">·</span>
                        <span>Department: {item.government_department}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!hasResponded ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFeedback(item)
                              setUniversityResponseText('')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#12365a] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a]"
                          >
                            <Send size={13} />
                            <span>Respond to Feedback</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFeedback(item)
                              setUniversityResponseText(item.university_response || '')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            <span>Update Response</span>
                          </button>
                        )}

                        <Link
                          to={`/university/problems/${encodeURIComponent(item.track_id)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <span>Problem Details</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {/* Response to Government Modal */}
        {activeFeedback && (
          <Modal
            open={Boolean(activeFeedback)}
            title={`Submit Official University Response for ${activeFeedback.track_id}`}
            onClose={() => setActiveFeedback(null)}
          >
            <form onSubmit={handleSendResponse} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                <p className="font-bold text-slate-800">{activeFeedback.problem_title}</p>
                <p className="text-slate-500">Government Directive: "{activeFeedback.feedback}"</p>
                {activeFeedback.requested_changes && (
                  <p className="text-blue-700 font-medium">Requested Changes: {activeFeedback.requested_changes}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  University Nodal Response & Action Taken *
                </label>
                <textarea
                  required
                  rows={4}
                  value={universityResponseText}
                  onChange={(e) => setUniversityResponseText(e.target.value)}
                  placeholder="Detail the technical revisions, laboratory testing updates, or schedule adjustments made in response to this government directive..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveFeedback(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !universityResponseText.trim()}
                  className="rounded-lg bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#1a4a7a] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Submit Official Response</span>
                </button>
              </div>
            </form>
          </Modal>
        )}
      </PageContainer>
    </HEILayout>
  )
}
