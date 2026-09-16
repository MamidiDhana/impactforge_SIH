import { useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Tag,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { CitizenProblem } from '../../types'
import type { ReportProblemFormTranslations } from '../../data/jharkhandData'
import type { BackendReportResponse } from '../../services/reportService'

interface TrackIdConfirmationModalProps {
  problem: CitizenProblem
  backendReport?: BackendReportResponse | null
  onClose?: () => void
  translations?: ReportProblemFormTranslations
}

export function TrackIdConfirmationModal({
  problem,
  onClose,
  translations,
}: TrackIdConfirmationModalProps) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(problem.trackId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleTrackProblem = () => {
    if (onClose) onClose()
    navigate(`/citizen/problems/${problem.id || problem.trackId || ''}`)
  }

  const t = translations

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 py-8 backdrop-blur-sm animate-in fade-in"
    >
      <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95">
        {/* Header decoration */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-[#187e8d] to-[#12365a] p-6 text-center text-white">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30 backdrop-blur-md">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <h2 id="modal-title" className="mt-3 font-[Manrope] text-xl font-bold">
            {t?.successModalTitle || 'Problem Reported Successfully'}
          </h2>
          <p className="mt-1 text-xs text-emerald-100">
            {t?.successModalSubtitle || 'Your problem has been registered and submitted to the Jharkhand State Innovation System.'}
          </p>
        </div>

        {/* Body content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Generated Track ID Display Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {t?.successTrackIdLabel || 'Official Track ID (Permanent)'}
            </span>
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-extrabold tracking-wide text-[#12365a]">
                {problem.trackId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:scale-95"
                title={t?.copyTrackIdButton || 'Copy Track ID'}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? (t?.copiedButton || 'Copied!') : (t?.copyTrackIdButton || 'Copy Track ID')}</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {t?.successSaveIdNotice || 'Save this ID to follow live 15-stage resolution updates.'}
            </p>
          </div>

          {/* Next Step: Pending Government Verification */}
          <div className="flex items-start gap-3.5 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm mt-0.5">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Next Step
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 ring-1 ring-amber-300">
                  Awaiting Review
                </span>
              </div>
              <h4 className="mt-0.5 text-sm font-bold text-amber-950">
                Pending Government Verification
              </h4>
              <p className="mt-1 text-xs text-amber-900/80">
                Your report has been submitted and is currently awaiting verification by authorized district authorities.
              </p>
            </div>
          </div>

          {/* Submission Summary Metadata */}
          <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="font-semibold text-slate-400">
                {t?.successTitleLabel || 'Problem Title:'}
              </span>
              <p className="mt-0.5 font-bold text-slate-800 line-clamp-2">{problem.title}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#187e8d]" />
              <span>
                {t?.successSubmittedLabel || 'Submitted:'} <strong className="text-slate-800">{problem.submittedAt}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag size={14} className="text-[#187e8d]" />
              <span>
                {t?.successStatusLabel || 'Status:'}{' '}
                <strong className="text-amber-700">Pending Government Verification</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <MapPin size={14} className="text-[#187e8d]" />
              <span>
                {t?.successLocationLabel || 'Location:'}{' '}
                <strong className="text-slate-800">
                  {problem.district}, Jharkhand
                  {problem.locality ? ` (${problem.locality})` : ''}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleTrackProblem}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#12365a] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#1a4a7a] active:scale-95"
            >
              <ExternalLink size={16} />
              <span>{t?.trackProblemButton || 'Track Problem'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


