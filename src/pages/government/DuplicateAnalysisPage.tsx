import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  ShieldCheck,
  XCircle,
  Clock,
  Sparkles,
  MapPin,
  Tag,
  Link2,
  ExternalLink,
} from 'lucide-react'
import { GovernmentLayout } from '../../layouts/GovernmentLayout'
import { GovPage } from './GovernmentShared'
import { LoadingState } from '../../components/common/LoadingState'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import {
  getReports,
  submitDuplicateReview,
  isCitizenSubmittedReport,
  type BackendReportResponse,
  type DuplicateCandidate,
  type SimilarProblemMatch,
} from '../../services/reportService'

export interface LiveDuplicatePair {
  pairId: string
  sourceTrackId: string
  sourceTitle: string
  sourceCategory: string
  sourceLocation: string
  sourceDescription: string
  sourceStatus: string
  sourcePriority: string
  sourceDate: string
  candidateTrackId: string
  candidateTitle: string
  candidateCategory: string
  candidateLocation: string
  candidateStatus: string
  candidatePriority: string
  candidateDate: string
  similarityScore: number
  similarityPercent: number
  classification: string
  reasons: string[]
  officialReview?: {
    decision: string
    reviewed_by_email?: string
    official_remarks?: string
    reviewed_at?: string
  } | null
  isConfirmed: boolean
  isDismissed: boolean
  isPending: boolean
}

type TabType = 'pending' | 'confirmed' | 'dismissed' | 'all'

export function DuplicateAnalysisPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<BackendReportResponse[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Tab & Filters State
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All categories')
  const [minSimilarity, setMinSimilarity] = useState<number>(0)

  // Action / Feedback State
  const [confirmingPair, setConfirmingPair] = useState<{
    pair: LiveDuplicatePair
  } | null>(null)
  const [officialRemarks, setOfficialRemarks] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'info' | 'error'
    text: string
  } | null>(null)

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMessage({ text, type })
    setTimeout(() => {
      setFeedbackMessage(null)
    }, 5000)
  }

  // Load real citizen reports dynamically from backend PostgreSQL database
  const loadReportsData = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      // Fetch up to 100 live reports to ensure all citizen duplicate pairs are aggregated
      const data = await getReports({ limit: 100 })
      const citizenReports = data.filter(isCitizenSubmittedReport)
      setReports(citizenReports.length > 0 ? citizenReports : data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend server.'
      setFetchError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReportsData()
  }, [loadReportsData])

  // Extract and aggregate duplicate candidate pairs from live citizen reports
  const duplicatePairs = useMemo(() => {
    const pairs: LiveDuplicatePair[] = []
    const seenPairs = new Set<string>()

    // Lookup map of all reports by track_id
    const reportMap = new Map<string, BackendReportResponse>()
    reports.forEach((r) => {
      if (r.track_id) reportMap.set(r.track_id.trim().toUpperCase(), r)
    })

    for (const report of reports) {
      const cands: DuplicateCandidate[] = report.ai_duplicate_candidates || []
      const simMatches: SimilarProblemMatch[] = report.ai_similarity_matches || []

      // Aggregate all candidate targets from both duplicate candidates and similarity matches
      const targetMatches: Array<{
        candTrackId: string
        score: number
        classification: string
        reasons: string[]
        review?: {
          decision: string
          reviewed_by_email?: string
          official_remarks?: string
          reviewed_at?: string
        } | null
      }> = []

      // 1. Process ai_duplicate_candidates
      cands.forEach((cand) => {
        const tId = cand.matching_track_id
        if (tId && tId !== report.track_id) {
          targetMatches.push({
            candTrackId: tId,
            score: typeof cand.similarity_score === 'number' ? cand.similarity_score : 0,
            classification: cand.duplicate_classification || 'possible_duplicate',
            reasons: cand.reasons || ['High semantic and geographic overlap'],
            review: cand.official_review || null,
          })
        }
      })

      // 2. Process ai_similarity_matches (if not already added)
      simMatches.forEach((match) => {
        const tId = match.matching_track_id
        if (tId && tId !== report.track_id && !targetMatches.some((m) => m.candTrackId === tId)) {
          const score = typeof match.similarity_score === 'number' ? match.similarity_score : 0
          if (score >= 0.55) {
            targetMatches.push({
              candTrackId: tId,
              score,
              classification: score >= 0.85 ? 'confirmed_duplicate_candidate' : score >= 0.75 ? 'likely_duplicate' : 'possible_duplicate',
              reasons: [
                match.similarity_level ? `AI Similarity Level: ${match.similarity_level}` : 'High semantic match',
                match.location ? `Matching location: ${match.location}` : '',
                match.category ? `Category: ${match.category}` : '',
              ].filter(Boolean),
              review: null,
            })
          }
        }
      })

      // Build LiveDuplicatePair records
      for (const item of targetMatches) {
        const candTrackId = item.candTrackId
        const pairKey = [report.track_id, candTrackId].sort().join(':::')
        if (seenPairs.has(pairKey)) continue
        seenPairs.add(pairKey)

        const candReport = reportMap.get(candTrackId.toUpperCase())
        const score = item.score
        const percent = Math.round(score * 100)
        const review = item.review

        // Determine human review state
        // Notice: Human review decisions are "confirm_duplicate", "merge_duplicate", or "not_duplicate"
        const isHumanConfirmed = Boolean(
          review?.decision === 'confirm_duplicate' ||
          review?.decision === 'merge_duplicate' ||
          report.status === 'Duplicate' ||
          (candReport && candReport.status === 'Duplicate')
        )

        const isHumanDismissed = Boolean(review?.decision === 'not_duplicate')
        const isPending = !isHumanConfirmed && !isHumanDismissed

        const candTitle = candReport?.problem_title || (candReport as any)?.title || `Problem ${candTrackId}`
        const candCategory = candReport?.category || report.category
        const candLoc = candReport ? `${candReport.district}${candReport.locality ? `, ${candReport.locality}` : ''}` : 'Jharkhand'
        const candStatus = candReport?.status || 'Open'
        const candPriority = candReport?.priority || 'Medium'
        const candDate = candReport?.created_at ? new Date(candReport.created_at).toLocaleDateString('en-IN') : 'Earlier'

        pairs.push({
          pairId: `${report.track_id}-${candTrackId}`,
          sourceTrackId: report.track_id,
          sourceTitle: report.problem_title,
          sourceCategory: report.category,
          sourceLocation: `${report.district}${report.locality ? `, ${report.locality}` : ''}`,
          sourceDescription: report.context_and_desired_outcome || 'No details provided.',
          sourceStatus: report.status,
          sourcePriority: report.priority,
          sourceDate: report.created_at ? new Date(report.created_at).toLocaleDateString('en-IN') : 'Recent',
          candidateTrackId: candTrackId,
          candidateTitle: candTitle,
          candidateCategory: candCategory,
          candidateLocation: candLoc,
          candidateStatus: candStatus,
          candidatePriority: candPriority,
          candidateDate: candDate,
          similarityScore: score,
          similarityPercent: percent,
          classification: item.classification,
          reasons: item.reasons.length > 0 ? item.reasons : ['High text similarity and regional proximity'],
          officialReview: review,
          isConfirmed: isHumanConfirmed,
          isDismissed: isHumanDismissed,
          isPending,
        })
      }
    }

    return pairs.sort((a, b) => b.similarityScore - a.similarityScore)
  }, [reports])

  // Categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>()
    duplicatePairs.forEach((p) => {
      if (p.sourceCategory) set.add(p.sourceCategory)
      if (p.candidateCategory) set.add(p.candidateCategory)
    })
    return ['All categories', ...Array.from(set).sort()]
  }, [duplicatePairs])

  // Counts by tab
  const counts = useMemo(() => {
    let pending = 0
    let confirmed = 0
    let dismissed = 0
    duplicatePairs.forEach((p) => {
      if (p.isPending) pending++
      if (p.isConfirmed) confirmed++
      if (p.isDismissed) dismissed++
    })
    return { pending, confirmed, dismissed, all: duplicatePairs.length }
  }, [duplicatePairs])

  // Filtered pairs based on active tab, search, category, and minimum similarity
  const filteredPairs = useMemo(() => {
    return duplicatePairs.filter((pair) => {
      // Tab filter
      if (activeTab === 'pending' && !pair.isPending) return false
      if (activeTab === 'confirmed' && !pair.isConfirmed) return false
      if (activeTab === 'dismissed' && !pair.isDismissed) return false

      // Category filter
      if (
        selectedCategory !== 'All categories' &&
        pair.sourceCategory !== selectedCategory &&
        pair.candidateCategory !== selectedCategory
      ) {
        return false
      }

      // Min similarity filter
      if (pair.similarityPercent < minSimilarity) return false

      // Search text (track IDs, titles, locations, reasons)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchSourceTrack = pair.sourceTrackId.toLowerCase().includes(q)
        const matchSourceTitle = pair.sourceTitle.toLowerCase().includes(q)
        const matchCandTrack = pair.candidateTrackId.toLowerCase().includes(q)
        const matchCandTitle = pair.candidateTitle.toLowerCase().includes(q)
        const matchLoc =
          pair.sourceLocation.toLowerCase().includes(q) ||
          pair.candidateLocation.toLowerCase().includes(q)
        const matchReasons = pair.reasons.some((r) => r.toLowerCase().includes(q))

        if (
          !matchSourceTrack &&
          !matchSourceTitle &&
          !matchCandTrack &&
          !matchCandTitle &&
          !matchLoc &&
          !matchReasons
        ) {
          return false
        }
      }

      return true
    })
  }, [duplicatePairs, activeTab, selectedCategory, minSimilarity, searchQuery])

  // ACTION 1: Link Duplicate to Original Problem
  const handleExecuteDuplicateAction = async () => {
    if (!confirmingPair) return

    setIsSubmittingReview(true)
    const { pair } = confirmingPair
    const { sourceTrackId, candidateTrackId } = pair
    const remarks =
      officialRemarks.trim() ||
      `Problem [${sourceTrackId}] linked to canonical problem [${candidateTrackId}] by Government Official.`

    try {
      await submitDuplicateReview(sourceTrackId, {
        candidate_track_id: candidateTrackId,
        decision: 'confirm_duplicate',
        official_remarks: remarks,
      })

      showFeedback(
        `Problem [${sourceTrackId}] successfully linked to canonical problem [${candidateTrackId}]. Relationship and status updated in database.`,
        'success'
      )
      setConfirmingPair(null)
      setOfficialRemarks('')
      await loadReportsData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit duplicate review.'
      showFeedback(`Error: ${msg}`, 'error')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // ACTION 3: Keep as Separate Problem (Dismiss duplicate flag)
  const handleKeepSeparate = async (pair: LiveDuplicatePair) => {
    setIsLoading(true)
    const { sourceTrackId, candidateTrackId } = pair
    const remarks = `Official review: Evaluated as distinct separate problem by Government Official.`

    try {
      await submitDuplicateReview(sourceTrackId, {
        candidate_track_id: candidateTrackId,
        decision: 'not_duplicate',
        official_remarks: remarks,
      })

      showFeedback(
        `Problem [${sourceTrackId}] kept as independent problem. Duplicate flag removed.`,
        'info'
      )
      await loadReportsData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update problem.'
      showFeedback(`Error: ${msg}`, 'error')
      setIsLoading(false)
    }
  }

  // ACTION 4: View Original Problem in Review Page
  const handleViewOriginal = (candTrackId: string) => {
    navigate(`/government/problems/${encodeURIComponent(candTrackId)}/review`)
  }

  // ACTION 5: Review Duplicate Problem in Review Page
  const handleReviewDuplicate = (sourceTrackId: string) => {
    navigate(`/government/problems/${encodeURIComponent(sourceTrackId)}/review`)
  }

  const renderSimilarityBadge = (percent: number) => {
    let colorClasses = 'bg-amber-50 text-amber-800 border-amber-200'
    if (percent >= 85) {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200'
    } else if (percent >= 70) {
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200'
    } else if (percent >= 50) {
      colorClasses = 'bg-teal-50 text-teal-700 border-teal-200'
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${colorClasses}`}>
        <Sparkles size={11} />
        {percent}% Similarity
      </span>
    )
  }

  return (
    <GovernmentLayout title="Duplicate Management">
      <GovPage
        title="Duplicate Management Module"
        description="Review AI-detected semantic duplicate citizen submissions, link or merge them with canonical problems, and maintain a consolidated database source of truth."
        breadcrumbs={[
          { label: 'Government', href: '/government/dashboard' },
          { label: 'Duplicate Module' },
        ]}
        action={
          <button
            type="button"
            onClick={loadReportsData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            title="Reload live citizen problems"
          >
            <RefreshCw
              size={14}
              className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'}
            />
            <span>{isLoading ? 'Syncing...' : 'Sync Live Problems'}</span>
          </button>
        }
      >
        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div
            role="status"
            className={`mb-5 flex items-center justify-between gap-3 rounded-xl border p-4 text-xs font-semibold shadow-sm animate-in fade-in ${
              feedbackMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : feedbackMessage.type === 'info'
                ? 'border-blue-200 bg-blue-50 text-blue-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : feedbackMessage.type === 'info' ? (
                <ShieldCheck size={16} className="text-blue-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Live AI Analysis Explanation Banner */}
        <div className="mb-6 flex gap-3 rounded-xl border border-[#b8dfe0] bg-[#e8f5f5] p-4 text-sm text-slate-700 shadow-sm">
          <Bot className="shrink-0 text-[#187e8d]" size={22} />
          <div className="space-y-1">
            <p className="font-semibold text-[#13243b]">
              Dynamic PostgreSQL Citizen Duplicate Detection Engine
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every newly submitted problem is compared against all live citizen problems using AI cosine similarity and geographic clustering.
              Government officials can confirm duplicates, merge reports, or keep them separate. Canonical problems remain intact while audit history is preserved.
            </p>
          </div>
        </div>

        {/* Filter and Tabs Section */}
        <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'pending'
                  ? 'bg-[#12365a] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock size={13} />
              <span>Pending Review ({counts.pending})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('confirmed')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'confirmed'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Confirmed Duplicates ({counts.confirmed})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dismissed')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'dismissed'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Kept Separate / Dismissed ({counts.dismissed})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>All Problem Pairs ({counts.all})</span>
            </button>
          </div>

          {/* Search and Filters Controls */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Track ID, problem title, location, or AI match rationale..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#187e8d] focus:outline-none focus:ring-1 focus:ring-[#187e8d]"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <SlidersHorizontal size={14} />
                <span>Filters:</span>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-[#187e8d] focus:outline-none focus:ring-1 focus:ring-[#187e8d]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Minimum Similarity Filter */}
              <select
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-[#187e8d] focus:outline-none focus:ring-1 focus:ring-[#187e8d]"
              >
                <option value={0}>All Similarity Levels</option>
                <option value={90}>≥ 90% (Very High)</option>
                <option value={75}>≥ 75% (High)</option>
                <option value={60}>≥ 60% (Moderate)</option>
              </select>
            </div>
          </div>

          {/* Item Counter Summary */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span>
              Showing <b>{filteredPairs.length}</b> live problem pair{filteredPairs.length === 1 ? '' : 's'}
              {duplicatePairs.length !== filteredPairs.length && ` (filtered from ${duplicatePairs.length} total)`}
            </span>
            <span className="font-mono text-slate-400">PostgreSQL Live Data</span>
          </div>
        </div>

        {/* Content Section */}
        {isLoading && duplicatePairs.length === 0 ? (
          <LoadingState rows={4} />
        ) : fetchError ? (
          <ErrorState
            title="Failed to Load Duplicate Analysis"
            description={fetchError}
            onRetry={loadReportsData}
          />
        ) : filteredPairs.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={
              activeTab === 'pending'
                ? 'No pending duplicate candidates'
                : activeTab === 'confirmed'
                ? 'No confirmed duplicates'
                : activeTab === 'dismissed'
                ? 'No dismissed matches'
                : 'No matching duplicate records found'
            }
            description={
              searchQuery || selectedCategory !== 'All categories' || minSimilarity > 0
                ? 'Try adjusting your search query or filter options to see more problem pairs.'
                : activeTab === 'pending'
                ? 'All citizen-submitted problems in the database currently have clean unique status without unresolved duplicate flags.'
                : 'No records match the current status filter.'
            }
          />
        ) : (
          <div className="grid gap-5">
            {filteredPairs.map((pair) => (
              <article
                key={pair.pairId}
                className={`rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                  pair.isConfirmed
                    ? 'border-rose-200 bg-rose-50/20'
                    : pair.isDismissed
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-white hover:border-[#187e8d]/40'
                }`}
              >
                {/* Header: Status and Similarity */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {pair.isConfirmed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
                        <ShieldCheck size={12} />
                        Confirmed Duplicate
                      </span>
                    ) : pair.isDismissed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={12} />
                        Kept as Separate Problem
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        <Clock size={12} />
                        Awaiting Government Decision
                      </span>
                    )}

                    <span className="text-xs text-slate-400">
                      AI Flag: <b className="capitalize text-slate-600">{pair.classification.replace(/_/g, ' ')}</b>
                    </span>
                  </div>

                  {renderSimilarityBadge(pair.similarityPercent)}
                </div>

                {/* Side-by-side comparison: Duplicate / Newly Submitted vs Original / Canonical Problem */}
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {/* Duplicate / Candidate Problem */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-[#12365a] px-2 py-0.5 font-mono text-xs font-bold text-white">
                        {pair.sourceTrackId}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">Duplicate / New Problem</span>
                    </div>

                    <h3 className="mt-2 font-[Manrope] text-base font-bold text-[#13243b]">
                      {pair.sourceTitle}
                    </h3>

                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-3">
                      {pair.sourceDescription}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                        <Tag size={10} className="text-slate-400" />
                        {pair.sourceCategory}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                        <MapPin size={10} className="text-slate-400" />
                        {pair.sourceLocation}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200 font-semibold text-slate-700">
                        Status: {pair.sourceStatus}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                        Submitted: <b>{pair.sourceDate}</b>
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleReviewDuplicate(pair.sourceTrackId)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#187e8d] hover:underline"
                      >
                        <span>Open in Review Problem</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Canonical / Original Problem */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-teal-800 px-2 py-0.5 font-mono text-xs font-bold text-white">
                        {pair.candidateTrackId}
                      </span>
                      <span className="text-[11px] font-semibold text-teal-800">Canonical / Original Problem</span>
                    </div>

                    <h3 className="mt-2 font-[Manrope] text-base font-bold text-[#13243b]">
                      {pair.candidateTitle}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                        <Tag size={10} className="text-slate-400" />
                        {pair.candidateCategory}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                        <MapPin size={10} className="text-slate-400" />
                        {pair.candidateLocation}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200 font-semibold text-slate-700">
                        Status: {pair.candidateStatus}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                        Priority: {pair.candidatePriority}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200">
                        Submitted: <b>{pair.candidateDate}</b>
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-amber-200/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleViewOriginal(pair.candidateTrackId)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline"
                      >
                        <span>Open Canonical in Review</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Explainable Similarity Explanation */}
                <div className="mt-4 rounded-lg bg-slate-100/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    AI Duplicate Explanation & Matching Drivers:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pair.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 shadow-2xs"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Official Review Details if previously decided */}
                {pair.officialReview && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <span className="font-bold text-[#13243b]">Official Decision Recorded:</span>{' '}
                    <b className="capitalize">{pair.officialReview.decision.replace(/_/g, ' ')}</b>
                    {pair.officialReview.official_remarks && (
                      <p className="mt-1 text-slate-500 italic">
                        "{pair.officialReview.official_remarks}"
                      </p>
                    )}
                    {pair.officialReview.reviewed_at && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Recorded on: {new Date(pair.officialReview.reviewed_at).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                )}

                {/* Duplicate Workflow Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Link to Original Problem */}
                    <button
                      type="button"
                      onClick={() => setConfirmingPair({ pair })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#12365a] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0e2a47]"
                    >
                      <Link2 size={13} className="text-teal-300" />
                      <span>Link to Original Problem</span>
                    </button>

                    {/* Keep as Separate Problem */}
                    <button
                      type="button"
                      onClick={() => handleKeepSeparate(pair)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      <XCircle size={13} className="text-slate-400" />
                      <span>Keep as Separate Problem</span>
                    </button>
                  </div>

                  {/* View Original Problem */}
                  <button
                    type="button"
                    onClick={() => handleViewOriginal(pair.candidateTrackId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#187e8d] bg-teal-50/50 px-3.5 py-2 text-xs font-bold text-[#187e8d] transition hover:bg-teal-100/60"
                  >
                    <span>View Original Problem</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Modal for Link to Original Problem */}
        <ConfirmDialog
          open={Boolean(confirmingPair)}
          title="Link Duplicate to Original Problem?"
          description={
            confirmingPair
              ? `Establish an official relationship linking duplicate report [${confirmingPair.pair.sourceTrackId}] to canonical problem [${confirmingPair.pair.candidateTrackId}]. Citizen evidence and tracking history will be fully preserved in PostgreSQL.`
              : 'Link duplicate to original problem.'
          }
          confirmLabel={isSubmittingReview ? 'Linking...' : 'Link to Original Problem'}
          onCancel={() => {
            setConfirmingPair(null)
            setOfficialRemarks('')
          }}
          onConfirm={handleExecuteDuplicateAction}
        >
          {confirmingPair && (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                <p>
                  <b>Duplicate Problem:</b> [{confirmingPair.pair.sourceTrackId}] {confirmingPair.pair.sourceTitle}
                </p>
                <p className="mt-1">
                  <b>Canonical Original:</b> [{confirmingPair.pair.candidateTrackId}] {confirmingPair.pair.candidateTitle}
                </p>
                <p className="mt-1 text-slate-500 font-mono">
                  Similarity Score: {confirmingPair.pair.similarityPercent}%
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Administrative Remarks (Optional):
                </label>
                <textarea
                  rows={2}
                  value={officialRemarks}
                  onChange={(e) => setOfficialRemarks(e.target.value)}
                  placeholder="Enter remarks on grievance consolidation or field verification..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#187e8d] focus:outline-none focus:ring-1 focus:ring-[#187e8d]"
                />
              </div>
            </div>
          )}
        </ConfirmDialog>
      </GovPage>
    </GovernmentLayout>
  )
}