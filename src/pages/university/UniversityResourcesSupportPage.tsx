import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Search,
  Plus,
  CheckCircle2,
  Sparkles,
  Clock,
  ChevronRight,
  RefreshCw,
  Cpu,
  ShieldCheck,
  AlertCircle,
  PackageCheck,
  HardDrive,
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
import { FormField } from '../../components/forms/FormField'
import {
  getUniversityResources,
  requestUniversityResource,
  getReports,
  type UniversityResourceRequestItem,
  type BackendReportResponse,
} from '../../services/reportService'

export function UniversityResourcesSupportPage() {
  const [resources, setResources] = useState<UniversityResourceRequestItem[]>([])
  const [availableReports, setAvailableReports] = useState<BackendReportResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedApproval, setSelectedApproval] = useState('All')

  // Request Resource Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [targetTrackId, setTargetTrackId] = useState('')
  const [requiredResource, setRequiredResource] = useState('')
  const [resourceCategory, setResourceCategory] = useState('Testing & Quality Rig')
  const [quantityDetails, setQuantityDetails] = useState('')
  const [supportProvider, setSupportProvider] = useState('')
  const [requestNotes, setRequestNotes] = useState('')

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text })
    setTimeout(() => setFeedbackMessage(null), 4500)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const [resData, queueData] = await Promise.all([
        getUniversityResources(),
        getReports({ target_dashboard: 'university' }).catch(() => [] as BackendReportResponse[]),
      ])
      setResources(resData)
      setAvailableReports(queueData)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load university resource requirements.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extract categories dynamically
  const categories = useMemo(() => {
    const set = new Set<string>()
    resources.forEach((r) => r.resource_category && set.add(r.resource_category.trim()))
    return ['All', ...Array.from(set).sort()]
  }, [resources])

  // Extract approval statuses
  const approvalStatuses = useMemo(() => {
    const set = new Set<string>()
    resources.forEach((r) => r.approval_status && set.add(r.approval_status.trim()))
    return ['All', ...Array.from(set).sort()]
  }, [resources])

  // Filtered list
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      if (selectedCategory !== 'All' && item.resource_category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }
      if (selectedStatus !== 'All' && item.request_status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false
      }
      if (selectedApproval !== 'All' && item.approval_status.toLowerCase() !== selectedApproval.toLowerCase()) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = item.track_id.toLowerCase().includes(q)
        const matchTitle = item.problem_title.toLowerCase().includes(q)
        const matchRes = item.required_resource.toLowerCase().includes(q)
        const matchCat = item.resource_category.toLowerCase().includes(q)
        const matchProvider = (item.support_provider || '').toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchRes && !matchCat && !matchProvider) {
          return false
        }
      }
      return true
    })
  }, [resources, selectedCategory, selectedStatus, selectedApproval, searchQuery])

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTrackId.trim() || !requiredResource.trim() || !quantityDetails.trim()) {
      notify('Please fill in all mandatory fields.', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await requestUniversityResource(targetTrackId, {
        required_resource: requiredResource.trim(),
        resource_category: resourceCategory.trim(),
        quantity_details: quantityDetails.trim(),
        support_provider: supportProvider.trim() || undefined,
        notes: requestNotes.trim() || undefined,
      })

      notify(`Resource request submitted successfully for ${targetTrackId}!`)
      setModalOpen(false)
      setTargetTrackId('')
      setRequiredResource('')
      setQuantityDetails('')
      setSupportProvider('')
      setRequestNotes('')

      if (res.request) {
        setResources((prev) => [res.request!, ...prev])
      } else {
        await loadData()
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to submit resource request.', 'error')
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

  const getApprovalBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>Approved</span>
        </span>
      )
    }
    if (s === 'in review' || s === 'under review') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
          <Clock size={12} className="text-amber-600" />
          <span>Under Review</span>
        </span>
      )
    }
    if (s === 'provisionally approved') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200">
          <ShieldCheck size={12} className="text-teal-600" />
          <span>Provisionally Approved</span>
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

  const getRequestStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'allocated' || s === 'active' || s === 'deployed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800 ring-1 ring-blue-200">
          <PackageCheck size={11} className="text-blue-600" />
          <span>{status}</span>
        </span>
      )
    }
    if (s === 'in procurement' || s === 'procurement') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-800 ring-1 ring-purple-200">
          <HardDrive size={11} className="text-purple-600" />
          <span>{status}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">
        <Clock size={11} className="text-amber-600" />
        <span>{status}</span>
      </span>
    )
  }

  const totalCount = resources.length
  const approvedCount = resources.filter((r) => r.approval_status.toLowerCase() === 'approved').length
  const inReviewCount = resources.filter(
    (r) => r.approval_status.toLowerCase().includes('review') || r.approval_status.toLowerCase() === 'pending'
  ).length
  const uniqueProvidersCount = useMemo(() => {
    const set = new Set<string>()
    resources.forEach((r) => r.support_provider && set.add(r.support_provider.trim()))
    return set.size
  }, [resources])

  return (
    <HEILayout title="Resources & Support">
      <PageContainer>
        <PageHeader
          title="University Resources & Project Support"
          description="Track and request critical research equipment, laboratory test rigs, IoT sensor nodes, and computational resources required for university-led community challenges."
          breadcrumbs={[
            { label: 'University', href: '/university' },
            { label: 'Resources & Support' },
          ]}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'} />
                <span>Sync Live Data</span>
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a]"
              >
                <Plus size={14} />
                <span>Request Project Resource</span>
              </button>
            </div>
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
                label="Resource Requests"
                value={String(totalCount)}
                description="Live from PostgreSQL"
                icon={HardDrive}
              />
              <StatCard
                label="Approved & Allocated"
                value={String(approvedCount)}
                description="Hardware & lab units deployed"
                icon={CheckCircle2}
              />
              <StatCard
                label="Pending / In Review"
                value={String(inReviewCount)}
                description="Awaiting nodal clearance"
                icon={Clock}
              />
              <StatCard
                label="Active Support Providers"
                value={String(uniqueProvidersCount)}
                description="Institutional labs & industry wings"
                icon={Building2}
              />
            </div>
          </section>

          {/* Search and Filters Toolbar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Track ID, problem title, resource name, category, or provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition focus:border-[#187e8d] focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by resource category"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All Resource Categories' : c}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedApproval}
                  onChange={(e) => setSelectedApproval(e.target.value)}
                  aria-label="Filter by approval status"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  {approvalStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s === 'All' ? 'All Approval Statuses' : s}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter by request status"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  <option value="All">All Deployment Statuses</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Active">Active</option>
                  <option value="In Procurement">In Procurement</option>
                  <option value="Requested">Requested</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content Feed */}
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <LoadingState rows={4} />
              <p className="mt-3 text-xs text-slate-400 font-medium">Loading live project resources from database...</p>
            </div>
          ) : fetchError ? (
            <ErrorState
              title="Failed to Load University Resources"
              description={fetchError}
              onRetry={loadData}
            />
          ) : filteredResources.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="No Resource Records Found"
              description="No project resources matched the selected filter criteria."
            />
          ) : (
            <div className="space-y-4">
              {filteredResources.map((item) => {
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#187e8d]/40 hover:shadow-md space-y-4"
                  >
                    {/* Top Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[#12365a] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
                          {item.track_id}
                        </span>
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200">
                          {item.resource_category}
                        </span>
                        {getApprovalBadge(item.approval_status)}
                        {getRequestStatusBadge(item.request_status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" />
                          <span>Requested: {formatDate(item.requested_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Problem Title & Required Resource */}
                    <div className="grid gap-4 md:grid-cols-12 items-start">
                      <div className="md:col-span-7 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#187e8d]">
                          Target University Problem / Project
                        </span>
                        <h3 className="font-[Manrope] text-base font-bold text-[#13243b]">
                          {item.problem_title}
                        </h3>

                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Cpu size={14} className="text-[#187e8d]" />
                            <span>Required Resource: {item.required_resource}</span>
                          </div>
                          <p className="text-slate-600 pl-5">
                            <strong>Quantity & Specs:</strong> {item.quantity_details}
                          </p>
                          {item.notes && (
                            <p className="text-slate-500 pl-5 italic text-[11px]">
                              "{item.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Provider & Logistics Column */}
                      <div className="md:col-span-5 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/50 to-white p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Support Provider / Source
                          </span>
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {item.support_provider ? 'Assigned' : 'Under Allocation'}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Building2 size={15} className="text-[#187e8d] shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800">
                              {item.support_provider || 'Central University Innovation Cell / Department Pool'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Requested by: {item.requested_by_name} ({item.institution_id})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Request ID: #{item.id}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">Institution: {item.institution_id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/university/problems/${encodeURIComponent(item.track_id)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a]"
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

        {/* Request Project Resource Modal */}
        {modalOpen && (
          <Modal
            open={modalOpen}
            title="Request Project Resource or Laboratory Testing Rig"
            onClose={() => setModalOpen(false)}
          >
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Requisition specialized testing hardware, laboratory analytical equipment, sensor modules, or high-performance compute clusters for an active university challenge.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Validated Challenge / Problem *
                </label>
                <select
                  value={targetTrackId}
                  onChange={(e) => setTargetTrackId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                >
                  <option value="">-- Select from University Problem Queue --</option>
                  {availableReports.map((r) => (
                    <option key={r.track_id} value={r.track_id}>
                      {r.track_id} — {r.problem_title} ({r.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Required Resource Name *"
                  required
                  value={requiredResource}
                  onChange={(e) => setRequiredResource(e.target.value)}
                  placeholder="e.g. Spectrophotometer, 5kW Solar Testing Rig"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Resource Category *
                  </label>
                  <select
                    value={resourceCategory}
                    onChange={(e) => setResourceCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                  >
                    <option value="Testing & Quality Rig">Testing & Quality Rig</option>
                    <option value="Hardware / IoT Kits">Hardware / IoT Kits</option>
                    <option value="Pilot Plant Component">Pilot Plant Component</option>
                    <option value="Software & Compute">Software & Compute</option>
                    <option value="Field Logistics & Drones">Field Logistics & Drones</option>
                    <option value="Chemicals & Reagents">Chemicals & Reagents</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Quantity / Technical Details *"
                  required
                  value={quantityDetails}
                  onChange={(e) => setQuantityDetails(e.target.value)}
                  placeholder="e.g. 2 Units (0.01 ppm precision calibration)"
                />

                <FormField
                  label="Support Provider (Optional)"
                  value={supportProvider}
                  onChange={(e) => setSupportProvider(e.target.value)}
                  placeholder="e.g. Central Analytical Facility, Civil Engg Lab"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justification & Project Requirement Notes
                </label>
                <textarea
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Explain why this resource is vital for prototype fabrication, laboratory validation, or field deployment..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !targetTrackId || !requiredResource.trim() || !quantityDetails.trim()}
                  className="rounded-lg bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#1a4a7a] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Submit Resource Requisition</span>
                </button>
              </div>
            </form>
          </Modal>
        )}
      </PageContainer>
    </HEILayout>
  )
}
