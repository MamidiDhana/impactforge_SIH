import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  Search,
  RefreshCw,
  MapPin,
  Star,
  FolderPlus,
  FolderCheck,
  AlertTriangle,
  RotateCcw,
  FileText,
  Users,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { HEILayout } from '../../layouts/HEILayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { EmptyState } from '../../components/common/EmptyState'
import { useHEI } from '../../context/HEIContext'
import { getReports, type BackendReportResponse } from '../../services/reportService'

export function UniversityProblemQueuePage() {
  const { isInterested, toggleInterested, isInProjects, toggleProject } = useHEI()

  const [reports, setReports] = useState<BackendReportResponse[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedUrgency, setSelectedUrgency] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [viewMode, setViewMode] = useState<'all' | 'interested' | 'projects'>('all')

  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const data = await getReports({ target_dashboard: 'university' })
      const verifiedHEI = data.filter(
        (r) =>
          r.verification_status?.toLowerCase() === 'verified' &&
          (r.routing_target === 'university' || r.routing_target === 'both')
      )
      setReports(verifiedHEI)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to connect to backend server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  // Extract distinct districts and categories dynamically from real data
  const districts = useMemo(() => {
    const set = new Set(reports.map((r) => r.district.trim()).filter(Boolean))
    return Array.from(set).sort()
  }, [reports])

  const categories = useMemo(() => {
    const set = new Set(reports.map((r) => r.category.trim()).filter(Boolean))
    return Array.from(set).sort()
  }, [reports])

  const urgencies = ['Critical', 'High', 'Medium', 'Low']
  const statuses = ['Pending', 'Under Review', 'Verified', 'In Progress', 'Resolved', 'Validated', 'Open']

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (viewMode === 'interested' && !isInterested(report.track_id)) {
        return false
      }
      if (viewMode === 'projects' && !isInProjects(report.track_id)) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = report.track_id.toLowerCase().includes(q)
        const matchTitle = (report.problem_title || '').toLowerCase().includes(q)
        const matchLoc = (report.locality || '').toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchLoc) return false
      }
      if (selectedDistrict && report.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false
      }
      if (selectedCategory && report.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }
      if (selectedUrgency && report.priority.toLowerCase() !== selectedUrgency.toLowerCase()) {
        return false
      }
      if (selectedStatus && report.status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false
      }
      return true
    })
  }, [
    reports,
    viewMode,
    isInterested,
    isInProjects,
    searchQuery,
    selectedDistrict,
    selectedCategory,
    selectedUrgency,
    selectedStatus,
  ])

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedDistrict ||
      selectedCategory ||
      selectedUrgency ||
      selectedStatus ||
      viewMode !== 'all'
  )

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedDistrict('')
    setSelectedCategory('')
    setSelectedUrgency('')
    setSelectedStatus('')
    setViewMode('all')
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

  const getVerificationBadge = (status?: string | null) => {
    const s = (status || 'Pending Verification').toLowerCase()
    if (s === 'verified' || s === 'validated') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <ShieldCheck size={11} />
          Verified
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
        <Clock size={11} />
        {status || 'Pending'}
      </span>
    )
  }

  const interestedCount = reports.filter((r) => isInterested(r.track_id)).length
  const projectCount = reports.filter((r) => isInProjects(r.track_id)).length

  return (
    <HEILayout title="Problem Queue">
      <PageContainer>
        <PageHeader
          title="University Problem Queue"
          description="Live verified citizen challenges assigned to Higher Education Institutions across Jharkhand. Filter by district, urgency, and category to assess institutional research and project alignment."
          breadcrumbs={[
            { label: 'University', href: '/university' },
            { label: 'Problem Queue' },
          ]}
          action={
            <button
              type="button"
              onClick={loadQueue}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'}
              />
              <span>{isLoading ? 'Syncing...' : 'Sync Problem Queue'}</span>
            </button>
          }
        />

        <div className="space-y-6">
          {/* View Mode Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                viewMode === 'all'
                  ? 'bg-[#12365a] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Available ({reports.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('interested')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                viewMode === 'interested'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Star size={13} className={viewMode === 'interested' ? 'fill-current' : 'text-amber-500'} />
              <span>Shortlisted ({interestedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('projects')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                viewMode === 'projects'
                  ? 'bg-[#187e8d] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FolderCheck size={13} />
              <span>University Projects ({projectCount})</span>
            </button>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Track ID, problem title, locality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition focus:border-[#187e8d] focus:bg-white"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:items-center">
                {/* District Filter */}
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  aria-label="Filter by district"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  <option value="">All Districts</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by category"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Urgency Filter */}
                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value)}
                  aria-label="Filter by urgency"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  <option value="">All Urgencies</option>
                  {urgencies.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter by status"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  <option value="">All Statuses</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    title="Reset all filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Results Count Line */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Showing <strong className="font-bold text-[#13243b]">{filteredReports.length}</strong> of{' '}
                <strong className="font-bold text-[#13243b]">{reports.length}</strong> validated challenges
              </span>
              {hasActiveFilters && (
                <span className="text-[11px] text-amber-700 font-semibold">Active filters applied</span>
              )}
            </div>
          </div>

          {/* Problem Table & Mobile Cards */}
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <LoadingState rows={4} />
              <p className="mt-3 text-xs text-slate-400">Loading live problems from PostgreSQL...</p>
            </div>
          ) : fetchError ? (
            <ErrorState
              title="Failed to Load Problem Queue"
              description={fetchError}
              onRetry={loadQueue}
            />
          ) : filteredReports.length === 0 ? (
            <EmptyState
              icon={hasActiveFilters ? AlertTriangle : Layers}
              title={
                hasActiveFilters
                  ? 'No Problems Match Selected Filters'
                  : 'No Problems in University Queue'
              }
              description={
                hasActiveFilters
                  ? 'Try adjusting your search criteria or resetting filters to view all assigned challenges.'
                  : 'When government officials assign validated civic challenges to Higher Education Institutions, they will appear here.'
              }
              action={
                hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-lg bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#1a4a7a]"
                  >
                    Reset Filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3.5">Tracking ID</th>
                        <th className="px-4 py-3.5">Problem Title</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">District</th>
                        <th className="px-4 py-3.5">Locality</th>
                        <th className="px-4 py-3.5">Priority</th>
                        <th className="px-4 py-3.5">Affected People</th>
                        <th className="px-4 py-3.5">Govt Verification</th>
                        <th className="px-4 py-3.5">Created Date</th>
                        <th className="px-4 py-3.5">Current Status</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReports.map((report) => {
                        const interested = isInterested(report.track_id)
                        const inProject = isInProjects(report.track_id)

                        return (
                          <tr key={report.track_id} className="transition hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-4 py-4">
                              <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
                                {report.track_id}
                              </span>
                            </td>
                            <td className="px-4 py-4 max-w-xs">
                              <Link
                                to={`/university/problems/${report.track_id}`}
                                className="font-bold text-[#13243b] hover:text-[#187e8d] line-clamp-1 transition"
                                title={report.problem_title}
                              >
                                {report.problem_title}
                              </Link>
                              {report.context_and_desired_outcome && (
                                <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                                  {report.context_and_desired_outcome}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-600">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                                {report.category}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <div className="flex items-center gap-1 text-xs font-semibold text-[#13243b]">
                                <MapPin size={13} className="text-[#187e8d]" />
                                <span>{report.district}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                              {report.locality || '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              {getUrgencyBadge(report.priority)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
                              <div className="flex items-center gap-1">
                                <Users size={12} className="text-slate-400" />
                                <span>{report.affected_people ? report.affected_people.toLocaleString() : '0'}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              {getVerificationBadge(report.verification_status)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                              {formatDate(report.created_at)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <StatusBadge status={report.status as any} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/university/problems/${report.track_id}`}
                                  className="inline-flex items-center gap-1 rounded-xl bg-[#12365a] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1b4875] hover:shadow"
                                  id={`btn-details-${report.track_id}`}
                                >
                                  <FileText size={12} />
                                  <span>Problem Details</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => toggleInterested(report.track_id)}
                                  title={interested ? 'Remove from shortlist' : 'Shortlist challenge'}
                                  className={`rounded-lg p-1.5 transition active:scale-95 ${
                                    interested
                                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                      : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                                  }`}
                                >
                                  <Star size={14} className={interested ? 'fill-current' : ''} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleProject(report.track_id)}
                                  title={inProject ? 'Remove from projects' : 'Add to university project worklist'}
                                  className={`rounded-lg p-1.5 transition active:scale-95 ${
                                    inProject
                                      ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                                      : 'text-slate-400 hover:bg-slate-100 hover:text-teal-700'
                                  }`}
                                >
                                  {inProject ? <FolderCheck size={14} /> : <FolderPlus size={14} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile / Tablet Cards */}
              <div className="grid gap-3 lg:hidden">
                {filteredReports.map((report) => {
                  const interested = isInterested(report.track_id)
                  const inProject = isInProjects(report.track_id)

                  return (
                    <div
                      key={report.track_id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
                          {report.track_id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getVerificationBadge(report.verification_status)}
                          <StatusBadge status={report.status as any} />
                          {getUrgencyBadge(report.priority)}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#187e8d]">
                          {report.category}
                        </span>
                        <h3 className="font-bold text-[#13243b] text-base leading-snug">
                          <Link
                            to={`/university/problems/${report.track_id}`}
                            className="hover:text-[#187e8d]"
                          >
                            {report.problem_title}
                          </Link>
                        </h3>
                        {report.context_and_desired_outcome && (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {report.context_and_desired_outcome}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5">
                        <div className="flex items-center gap-1">
                          <MapPin size={13} className="text-[#187e8d] shrink-0" />
                          <span className="font-semibold text-slate-800">{report.district}</span>
                        </div>
                        <div className="text-right text-slate-500">
                          {report.locality || 'Locality unlisted'}
                        </div>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Users size={12} className="text-slate-400" />
                          <span>{report.affected_people ? `${report.affected_people.toLocaleString()} affected` : 'Population assessed'}</span>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          Created {formatDate(report.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <Link
                          to={`/university/problems/${report.track_id}`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#12365a] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1b4875]"
                        >
                          <FileText size={13} />
                          <span>Problem Details</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleInterested(report.track_id)}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            interested
                              ? 'bg-amber-100 text-amber-800'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                          title="Shortlist"
                        >
                          <Star size={13} className={interested ? 'fill-current text-amber-500' : ''} />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleProject(report.track_id)}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            inProject
                              ? 'bg-teal-100 text-teal-800'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                          title="Project list"
                        >
                          {inProject ? <FolderCheck size={13} /> : <FolderPlus size={13} />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </HEILayout>
  )
}

