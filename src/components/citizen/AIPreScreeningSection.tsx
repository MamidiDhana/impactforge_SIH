import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Flame,
  ShieldCheck,
  Clock,
  Fingerprint,
} from 'lucide-react'
import type { AIPreScreeningInfo } from '../../types'

interface AIPreScreeningSectionProps {
  preScreening?: AIPreScreeningInfo | null
  problemTitle?: string
  trackId?: string
  className?: string
}

export function AIPreScreeningSection({
  preScreening,
  problemTitle,
  trackId,
  className = '',
}: AIPreScreeningSectionProps) {
  if (!preScreening) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 text-slate-500">
          <Clock className="size-5 text-amber-500 animate-spin" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">AI Pre-Screening Pending</h4>
            <p className="text-xs text-slate-500">AI category classification and live duplicate check are in progress.</p>
          </div>
        </div>
      </div>
    )
  }

  const {
    category,
    subcategory,
    problem_type,
    confidence_score,
    priority,
    priority_score,
    priority_reasons,
    has_similar_live_problem,
    top_similarity_score,
    top_similar_match,
  } = preScreening

  const priorityBadgeTone =
    priority === 'Critical'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : priority === 'High'
      ? 'bg-orange-50 text-orange-700 ring-orange-200'
      : priority === 'Medium'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'

  const confidencePercent = confidence_score
    ? Math.round(confidence_score <= 1 ? confidence_score * 100 : confidence_score)
    : null

  const similarityScorePercent = top_similarity_score
    ? Math.round(top_similarity_score <= 1 ? top_similarity_score * 100 : top_similarity_score)
    : null

  return (
    <div className={`space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 via-white to-white p-5 sm:p-6 shadow-sm ${className}`}>
      {/* 3-Step Flow Indicator */}
      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Resolution Pipeline Flow
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
            <Sparkles size={12} className="text-indigo-600" />
            AI Pre-Screening Enabled
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {/* Step 1: Citizen Submission */}
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
            <div className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Stage 1</p>
              <p className="truncate text-xs font-bold text-emerald-950">Citizen Submit</p>
            </div>
          </div>

          {/* Step 2: AI Pre-Screening */}
          <div className="flex items-center gap-2.5 rounded-lg border border-indigo-300 bg-indigo-50/80 p-2.5 ring-2 ring-indigo-200">
            <div className="grid size-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-white">
              <Sparkles size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Stage 2</p>
              <p className="truncate text-xs font-bold text-indigo-950">AI Pre-Screening</p>
            </div>
          </div>

          {/* Step 3: Government Verification */}
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5">
            <div className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-500 text-white">
              <ShieldCheck size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Stage 3</p>
              <p className="truncate text-xs font-bold text-amber-950">Gov Verification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header with Title and Model Info */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-[Manrope] text-base font-extrabold text-[#13243b]">
                AI Pre-Screening Report
              </h3>
              {(trackId || problemTitle) && (
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {trackId && <span className="font-mono font-medium text-slate-600">ID: {trackId}</span>}
                  {trackId && problemTitle && <span>•</span>}
                  {problemTitle && <span className="truncate max-w-[280px] font-medium text-slate-700">{problemTitle}</span>}
                </div>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Automated multi-stage intake triage evaluated via Gemini & BGE embeddings across Jharkhand's LIVE problems repository.
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
          Pre-Screened
        </span>
      </div>

      {/* 3 Core Results Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* 1. Category Classification */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-1 text-slate-500">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Layers size={14} className="text-indigo-600" />
              Category
            </span>
            {confidencePercent !== null && (
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                {confidencePercent}% conf
              </span>
            )}
          </div>
          <div className="mt-2.5 flex-1">
            <p className="font-[Manrope] text-sm font-bold text-slate-900">{category}</p>
            {subcategory && (
              <p className="mt-0.5 text-xs font-medium text-slate-600">{subcategory}</p>
            )}
            {problem_type && (
              <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {problem_type}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <CheckCircle2 size={13} />
            <span>Taxonomy Standardized</span>
          </div>
        </div>

        {/* 2. Semantic Duplicate / Similarity Result */}
        <div className={`flex flex-col rounded-xl border p-4 shadow-sm ${
          has_similar_live_problem
            ? 'border-amber-200 bg-amber-50/40 ring-1 ring-amber-200'
            : 'border-emerald-200 bg-emerald-50/30 ring-1 ring-emerald-200'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Fingerprint size={14} className={has_similar_live_problem ? 'text-amber-600' : 'text-emerald-600'} />
              Duplicate Check
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
              has_similar_live_problem
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              BGE Cosine
            </span>
          </div>

          <div className="mt-2.5 flex-1">
            {has_similar_live_problem ? (
              <div>
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-sm">
                  <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                  <span>Similar LIVE Found</span>
                </div>
                <p className="mt-1 text-xs text-amber-800 leading-snug">
                  {similarityScorePercent ? `${similarityScorePercent}% similarity` : 'High match'} with active citizen report.
                </p>
                {top_similar_match && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-white/90 p-2 text-xs">
                    <span className="font-mono text-[10px] font-bold text-indigo-700">
                      {top_similar_match.matching_track_id}
                    </span>
                    <p className="truncate font-semibold text-slate-800 text-[11px]">
                      {top_similar_match.title}
                    </p>
                    <span className="mt-1 inline-block text-[10px] font-medium text-slate-500">
                      Status: <strong>{top_similar_match.status}</strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                  <span>Unique Problem</span>
                </div>
                <p className="mt-1 text-xs text-emerald-800 leading-snug">
                  No similar LIVE problems detected among active Jharkhand reports.
                </p>
                <p className="mt-2 text-[11px] text-slate-500 font-medium">
                  0 duplicates in repository
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 text-[11px] font-medium text-slate-500">
            {has_similar_live_problem ? 'Flagged for merging review' : 'Original citizen issue'}
          </div>
        </div>

        {/* 3. Priority Assessment */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-1 text-slate-500">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Flame size={14} className="text-orange-600" />
              Priority
            </span>
            {priority_score !== undefined && priority_score !== null && (
              <span className="text-xs font-mono font-bold text-slate-700">
                {priority_score}/100
              </span>
            )}
          </div>

          <div className="mt-2.5 flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${priorityBadgeTone}`}>
                {priority} Priority
              </span>
            </div>

            {priority_score !== undefined && priority_score !== null && (
              <div className="mt-2.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      priority === 'Critical'
                        ? 'bg-rose-500'
                        : priority === 'High'
                        ? 'bg-orange-500'
                        : priority === 'Medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, priority_score))}%` }}
                  />
                </div>
              </div>
            )}

            {priority_reasons && priority_reasons.length > 0 && (
              <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-snug">
                {priority_reasons[0]}
              </p>
            )}
          </div>

          <div className="mt-3 text-[11px] font-medium text-slate-500">
            Assessed by AI Triage
          </div>
        </div>
      </div>

      {/* Duplicate Alert Banner (if similar LIVE problem was found) */}
      {has_similar_live_problem && top_similar_match && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">Similar Active Report Detected in Jharkhand</span>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 font-mono text-[10px] font-bold">
                {similarityScorePercent ? `${similarityScorePercent}% Match` : 'Probable Duplicate'}
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Report <strong className="font-mono text-indigo-900">{top_similar_match.matching_track_id}</strong> (
              <em>"{top_similar_match.title}"</em>) addresses a closely related issue in {top_similar_match.location || top_similar_match.district}.
            </p>
            <p className="text-[11px] text-amber-700">
              Government validators will evaluate whether to link your problem or merge resolution updates.
            </p>
          </div>
        </div>
      )}

      {/* Next Step Banner: Pending Government Verification */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#12365a] text-white shadow">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Next Step in Pipeline
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  Queue Active
                </span>
              </div>
              <h4 className="font-[Manrope] text-sm font-bold text-[#12365a]">
                Pending Government Verification
              </h4>
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                Your report has completed AI Pre-Screening and is now pending human review by the District Innovation Cell.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-white/80 p-2.5 text-[11px] text-slate-600 sm:max-w-xs">
            <p className="font-bold text-slate-800">Government Decision Matrix:</p>
            <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
              <li>• <span className="font-semibold text-rose-700">Fake / Invalid</span> → Rejected</li>
              <li>• <span className="font-semibold text-amber-700">Duplicate</span> → Linked / Merged</li>
              <li>• <span className="font-semibold text-emerald-700">Genuine</span> → Validated & Routed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
