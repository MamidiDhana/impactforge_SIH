import { MapPin, Calendar } from 'lucide-react'
import type { BackendReportResponse } from '../../services/reportService'
import { StatusBadge } from '../common/StatusBadge'

interface GovernmentReportsTableProps {
  reports: BackendReportResponse[]
  onUpdateStatus: (trackId: string, newStatus: 'Open' | 'In Progress' | 'Resolved' | 'Rejected') => Promise<void>
  isUpdatingTrackId?: string | null
}

const ALLOWED_STATUSES: Array<'Open' | 'In Progress' | 'Resolved' | 'Rejected'> = [
  'Open',
  'In Progress',
  'Resolved',
  'Rejected',
]

export function GovernmentReportsTable({
  reports,
  onUpdateStatus,
  isUpdatingTrackId,
}: GovernmentReportsTableProps) {
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

  const getUrgencyBadge = (urgency: string) => {
    const u = urgency.toLowerCase()
    let tone = 'bg-slate-100 text-slate-700'
    if (u === 'critical' || u === 'high') {
      tone = 'bg-red-50 text-red-700 ring-1 ring-red-200'
    } else if (u === 'medium') {
      tone = 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    } else {
      tone = 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
        {urgency}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop & Tablet: Responsive Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Track ID</th>
                <th className="px-5 py-3.5">Problem Title</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">District</th>
                <th className="px-5 py-3.5">Locality</th>
                <th className="px-5 py-3.5">Urgency</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => {
                const isUpdating = isUpdatingTrackId === report.track_id

                return (
                  <tr
                    key={report.track_id}
                    className="transition hover:bg-slate-50/70"
                  >
                    {/* Track ID */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
                        {report.track_id}
                      </span>
                    </td>

                    {/* Problem Title */}
                    <td className="px-5 py-4 max-w-xs">
                      <p className="font-bold text-[#13243b] line-clamp-1" title={report.problem_title}>
                        {report.problem_title}
                      </p>
                      {report.context_and_desired_outcome && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {report.context_and_desired_outcome}
                        </p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-600">
                      {report.category}
                    </td>

                    {/* District */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-1 text-xs font-semibold text-[#13243b]">
                        <MapPin size={13} className="text-[#187e8d]" />
                        <span>{report.district}</span>
                      </div>
                    </td>

                    {/* Locality */}
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                      {report.locality || '—'}
                    </td>

                    {/* Urgency */}
                    <td className="whitespace-nowrap px-5 py-4">
                      {getUrgencyBadge(report.priority)}
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={report.status as any} />
                        <select
                          value={report.status}
                          disabled={isUpdating}
                          onChange={(e) =>
                            onUpdateStatus(
                              report.track_id,
                              e.target.value as 'Open' | 'In Progress' | 'Resolved' | 'Rejected'
                            )
                          }
                          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300 focus:outline-none"
                          title="Change status"
                        >
                          {ALLOWED_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                      {formatDate(report.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Responsive Cards View */}
      <div className="grid gap-3 md:hidden">
        {reports.map((report) => {
          const isUpdating = isUpdatingTrackId === report.track_id

          return (
            <div
              key={report.track_id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
            >
              {/* Card Header: Track ID & Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
                  {report.track_id}
                </span>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={report.status as any} />
                  {getUrgencyBadge(report.priority)}
                </div>
              </div>

              {/* Title & Category */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {report.category}
                </span>
                <h3 className="font-bold text-[#13243b] text-base leading-snug">
                  {report.problem_title}
                </h3>
                {report.context_and_desired_outcome && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {report.context_and_desired_outcome}
                  </p>
                )}
              </div>

              {/* District & Locality Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1">
                  <MapPin size={13} className="text-[#187e8d] shrink-0" />
                  <span className="font-semibold text-slate-800">{report.district}</span>
                </div>
                <div className="text-right text-slate-500">
                  {report.locality || 'Locality unlisted'}
                </div>
                <div className="col-span-2 flex items-center gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-200/50">
                  <Calendar size={12} className="text-slate-400" />
                  <span>Reported on {formatDate(report.created_at)}</span>
                </div>
              </div>

              {/* Actions & Status Dropdown */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400">Status:</span>
                <select
                  value={report.status}
                  disabled={isUpdating}
                  onChange={(e) =>
                    onUpdateStatus(
                      report.track_id,
                      e.target.value as 'Open' | 'In Progress' | 'Resolved' | 'Rejected'
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                >
                  {ALLOWED_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
