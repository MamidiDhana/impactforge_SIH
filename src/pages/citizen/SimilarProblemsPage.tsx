import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, Fingerprint, ShieldCheck, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CitizenLayout } from '../../layouts/CitizenLayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { ResponsiveCard } from '../../components/common/ResponsiveCard'
import { ProblemCategoryBadge } from '../../components/problems/ProblemCategoryBadge'
import { useProblems } from '../../context/ProblemContext'
import { getReportByTrackId, type BackendReportResponse, type SimilarProblemMatch } from '../../services/reportService'

export function SimilarProblemsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { citizenProblems, getProblemById, getProblemByTrackId: getContextProblem } = useProblems()
  const [choice, setChoice] = useState('')
  const [liveReport, setLiveReport] = useState<BackendReportResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const problem =
    getContextProblem(id || '') ||
    getProblemById(id || '') ||
    citizenProblems.find((p) => p.id === id || p.trackId === id)

  const trackId = problem?.trackId || id || ''

  useEffect(() => {
    if (trackId) {
      setLoading(true)
      getReportByTrackId(trackId)
        .then((data) => setLiveReport(data))
        .catch(() => {
          // fallback to context problem
        })
        .finally(() => setLoading(false))
    }
  }, [trackId])

  const matches: SimilarProblemMatch[] =
    liveReport?.ai_similarity_matches || problem?.ai_similarity_matches || []

  const hasMatches = matches.length > 0 && (matches[0].similarity_score ?? 0) >= 0.55

  const chooseSame = (match: SimilarProblemMatch) => {
    setChoice(`You acknowledged similarity with ${match.matching_track_id}. Forwarding reference to Government Validators for linking/merging.`)
    setTimeout(() => navigate('/citizen/problems'), 1500)
  }

  const chooseDifferent = () => {
    setChoice('You confirmed this is a distinct issue. Your problem remains submitted and is Pending Government Verification.')
    setTimeout(() => navigate('/citizen/problems'), 1500)
  }

  return (
    <CitizenLayout title="AI Similarity Check">
      <PageContainer>
        <PageHeader
          title="AI Pre-Screening: Live Similarity Check"
          description="Real-time semantic cosine similarity evaluated using BGE embeddings across active LIVE citizen problems in Jharkhand."
          breadcrumbs={[
            { label: 'Citizen', href: '/citizen/dashboard' },
            { label: 'Track Problem', href: '/citizen/problems' },
            { label: trackId || 'Similarity' },
          ]}
        />

        {/* AI Pre-Screening Live Status Banner */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Fingerprint size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    Live BGE Embeddings + Cosine Similarity Engine
                  </span>
                  {loading ? (
                    <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      <Loader2 size={10} className="animate-spin" /> Fetching
                    </span>
                  ) : (
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      Active Intake
                    </span>
                  )}
                </div>
                <h2 className="mt-1 font-[Manrope] text-base font-bold text-slate-900">
                  {problem?.title || liveReport?.problem_title || 'Submitted Citizen Problem'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 font-mono">
                  Track ID: {trackId} · Category: {liveReport?.category || problem?.category || 'General'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-3 text-center sm:min-w-44">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pre-Screening Result
              </span>
              <p className={`mt-0.5 text-sm font-extrabold ${hasMatches ? 'text-amber-700' : 'text-emerald-700'}`}>
                {hasMatches ? 'Similar LIVE Found' : 'Unique Problem'}
              </p>
            </div>
          </div>
        </div>

        {/* Similar LIVE Matches List */}
        {hasMatches ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-[Manrope] text-sm font-bold uppercase tracking-wider text-slate-700">
                Detected LIVE Citizen Problems ({matches.length})
              </h3>
              <span className="text-xs text-slate-500">
                Ranked by semantic vector cosine match
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((match) => {
                const percent = Math.round((match.similarity_score <= 1 ? match.similarity_score : match.similarity_score / 100) * 100)
                return (
                  <ResponsiveCard key={match.matching_track_id} className="flex h-full flex-col justify-between border-slate-200">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <ProblemCategoryBadge category={match.category || 'Civic Issue'} />
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                          {percent}% match
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="font-mono text-[11px] font-bold text-indigo-800">
                          {match.matching_track_id}
                        </span>
                        <h4 className="mt-1 font-[Manrope] font-bold text-slate-900 line-clamp-2">
                          {match.title}
                        </h4>
                        <p className="mt-1.5 text-xs text-slate-500">
                          📍 {match.location || match.district || 'Jharkhand'}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Current Status: <strong className="text-slate-700">{match.status || 'Open'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => chooseSame(match)}
                        className="rounded-lg border border-indigo-600 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                      >
                        Same Issue
                      </button>
                    </div>
                  </ResponsiveCard>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-3 font-[Manrope] text-base font-bold text-emerald-950">
              No Similar LIVE Problems Detected
            </h3>
            <p className="mt-1.5 text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
              BGE vector cosine similarity analysis confirmed that your reported challenge is unique across all active Jharkhand citizen submissions.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
              <ShieldCheck size={14} />
              <span>Pending Government Verification</span>
            </div>
          </div>
        )}

        {choice && (
          <div role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-sm animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{choice}</span>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={chooseDifferent}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#12365a] px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-[#1a4a7a]"
          >
            <span>Proceed to Pending Government Verification</span>
            <ArrowRight size={16} />
          </button>
          <Link
            to={`/citizen/problems/${trackId}`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Problem Details
          </Link>
        </div>
      </PageContainer>
    </CitizenLayout>
  )
}