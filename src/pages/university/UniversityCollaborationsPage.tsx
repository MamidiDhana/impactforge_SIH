import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Handshake,
  Building,
  Search,
  Sparkles,
  RefreshCw,
  Layers,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Award,
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
  getUniversityCollaborations,
  createPartnerCollaboration,
  getReports,
  type UniversityCollaborationItem,
  type BackendReportResponse,
} from '../../services/reportService'

export function UniversityCollaborationsPage() {
  const [collaborations, setCollaborations] = useState<UniversityCollaborationItem[]>([])
  const [availableReports, setAvailableReports] = useState<BackendReportResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPartnerType, setSelectedPartnerType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Proposal / Collaboration Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [targetTrackId, setTargetTrackId] = useState('')
  const [partnerId, setPartnerId] = useState('PARTNER-TATA-CSR')
  const [supportType, setSupportType] = useState('Hardware & Pilot Grant')
  const [proposedAmount, setProposedAmount] = useState('1250000')
  const [collaborationNotes, setCollaborationNotes] = useState('')

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text })
    setTimeout(() => setFeedbackMessage(null), 4500)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const [collabData, queueData] = await Promise.all([
        getUniversityCollaborations(),
        getReports({ target_dashboard: 'university' }).catch(() => [] as BackendReportResponse[]),
      ])
      setCollaborations(collabData)
      setAvailableReports(queueData)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load industry collaborations.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extract distinct partner types
  const partnerTypes = useMemo(() => {
    const set = new Set<string>()
    collaborations.forEach((c) => c.partner_type && set.add(c.partner_type.trim()))
    return ['All', ...Array.from(set).sort()]
  }, [collaborations])

  // Extract distinct statuses
  const collaborationStatuses = useMemo(() => {
    const set = new Set<string>()
    collaborations.forEach((c) => c.collaboration_status && set.add(c.collaboration_status.trim()))
    return ['All', ...Array.from(set).sort()]
  }, [collaborations])

  const filteredCollaborations = useMemo(() => {
    return collaborations.filter((item) => {
      if (selectedPartnerType !== 'All' && item.partner_type.toLowerCase() !== selectedPartnerType.toLowerCase()) {
        return false
      }
      if (selectedStatus !== 'All' && item.collaboration_status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTrack = item.track_id.toLowerCase().includes(q)
        const matchTitle = item.problem_title.toLowerCase().includes(q)
        const matchPartner = item.partner_name.toLowerCase().includes(q)
        const matchType = item.partner_type.toLowerCase().includes(q)
        const matchSupport = item.support_provided.toLowerCase().includes(q)
        if (!matchTrack && !matchTitle && !matchPartner && !matchType && !matchSupport) {
          return false
        }
      }
      return true
    })
  }, [collaborations, selectedPartnerType, selectedStatus, searchQuery])

  const handleCreateCollaboration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTrackId.trim() || !partnerId.trim()) {
      notify('Please choose a valid problem report and partner organization.', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createPartnerCollaboration(targetTrackId, {
        partner_id: partnerId.trim(),
        support_type: supportType.trim(),
        proposed_amount: parseFloat(proposedAmount) || 0,
        notes: collaborationNotes.trim() || undefined,
      })

      notify(`Industry/CSR collaboration initiated successfully for ${targetTrackId}!`)
      setModalOpen(false)
      setTargetTrackId('')
      setCollaborationNotes('')

      if (res.collaboration) {
        setCollaborations((prev) => [res.collaboration!, ...prev])
      } else {
        await loadData()
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to initiate partner collaboration.', 'error')
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

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'active' || s === 'in progress') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>Active</span>
        </span>
      )
    }
    if (s === 'proposal submitted' || s === 'under review' || s === 'proposed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
          <Clock size={12} className="text-amber-600" />
          <span>Proposal Submitted</span>
        </span>
      )
    }
    if (s === 'completed' || s === 'deployed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 ring-1 ring-blue-200">
          <Award size={12} className="text-blue-600" />
          <span>Completed</span>
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

  const totalCount = collaborations.length
  const activeCount = collaborations.filter((c) => c.collaboration_status.toLowerCase() === 'active').length
  const uniquePartnersCount = useMemo(() => {
    const set = new Set<string>()
    collaborations.forEach((c) => set.add(c.partner_name.trim()))
    return set.size
  }, [collaborations])
  const averageProgress = useMemo(() => {
    if (collaborations.length === 0) return 0
    const sum = collaborations.reduce((acc, c) => acc + (c.current_progress || 0), 0)
    return Math.round(sum / collaborations.length)
  }, [collaborations])

  return (
    <HEILayout title="Industry / CSR Collaboration">
      <PageContainer>
        <PageHeader
          title="Industry & CSR Collaboration Hub"
          description="Engage corporate CSR foundations, state industrial partners, and technical vendors to co-fund prototypes, sponsor lab equipment, and deploy scalable solutions across Jharkhand."
          breadcrumbs={[
            { label: 'University', href: '/university' },
            { label: 'Industry / CSR Collaboration' },
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
                <span>Sync Collaborations</span>
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a]"
              >
                <Handshake size={14} />
                <span>Initiate Collaboration</span>
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
                label="Active Collaborations"
                value={String(activeCount)}
                description="Live industrial partnerships"
                icon={Handshake}
              />
              <StatCard
                label="Partner Organizations"
                value={String(uniquePartnersCount)}
                description="CSR wings, R&D & Tech suppliers"
                icon={Building}
              />
              <StatCard
                label="Total Joint Projects"
                value={String(totalCount)}
                description="Live from PostgreSQL"
                icon={Layers}
              />
              <StatCard
                label="Average Project Progress"
                value={`${averageProgress}%`}
                description="Overall milestone completion"
                icon={TrendingUp}
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
                  placeholder="Search by Track ID, problem title, partner name, type, or support details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition focus:border-[#187e8d] focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedPartnerType}
                  onChange={(e) => setSelectedPartnerType(e.target.value)}
                  aria-label="Filter by partner type"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  {partnerTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt === 'All' ? 'All Partner Types' : pt}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter by collaboration status"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                >
                  {collaborationStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s === 'All' ? 'All Collaboration Statuses' : s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Collaborations Feed */}
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <LoadingState rows={4} />
              <p className="mt-3 text-xs text-slate-400 font-medium">Loading live industry collaborations from database...</p>
            </div>
          ) : fetchError ? (
            <ErrorState
              title="Failed to Load Collaborations"
              description={fetchError}
              onRetry={loadData}
            />
          ) : filteredCollaborations.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="No Collaborations Found"
              description="No industry or CSR partnerships matched the selected filter criteria."
            />
          ) : (
            <div className="space-y-4">
              {filteredCollaborations.map((item) => {
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
                        <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-800 ring-1 ring-purple-200">
                          {item.partner_type}
                        </span>
                        {getStatusBadge(item.collaboration_status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Started: {formatDate(item.start_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid gap-4 md:grid-cols-12 items-start">
                      {/* Left: Problem & Partner */}
                      <div className="md:col-span-7 space-y-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#187e8d]">
                            Problem / University Project
                          </span>
                          <h3 className="font-[Manrope] text-base font-bold text-[#13243b]">
                            {item.problem_title}
                          </h3>
                        </div>

                        {/* Partner Card */}
                        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                              <Building size={16} className="text-purple-700 shrink-0" />
                              <span>{item.partner_name}</span>
                            </div>
                            <span className="text-[11px] font-mono font-semibold text-slate-400">
                              {item.partner_id}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                            <div>
                              <span className="text-slate-400 font-bold block uppercase text-[9px]">Support Provided:</span>
                              <span className="font-semibold text-slate-700">{item.support_provided}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block uppercase text-[9px]">Technical Support:</span>
                              <span className="font-semibold text-slate-700">{item.technical_support}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Funding & Progress Column */}
                      <div className="md:col-span-5 rounded-xl border border-slate-100 bg-gradient-to-br from-purple-50/30 to-white p-4 space-y-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Funding / CSR Contribution
                          </span>
                          <div className="flex items-center gap-1.5 text-base font-extrabold text-emerald-800 mt-0.5">
                            <DollarSign size={18} className="text-emerald-600 shrink-0" />
                            <span>{item.funding_contribution}</span>
                          </div>
                        </div>

                        {/* Progress Meter */}
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                            <span>Current Progress</span>
                            <span className="text-[#187e8d]">{item.current_progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#187e8d] to-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, item.current_progress))}%` }}
                            />
                          </div>
                        </div>

                        {item.contact_email && (
                          <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                            <span className="text-slate-400">Partner Contact: </span>
                            <span className="font-medium text-slate-700">{item.contact_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Collaboration #{item.id}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">Partner ID: {item.partner_id}</span>
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

        {/* Initiate Collaboration Modal */}
        {modalOpen && (
          <Modal
            open={modalOpen}
            title="Initiate Industry / CSR Co-Funding Collaboration"
            onClose={() => setModalOpen(false)}
          >
            <form onSubmit={handleCreateCollaboration} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect an active university challenge with corporate CSR foundations, state industry wings, or specialized hardware providers to secure funding and technical mentoring.
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Industry / CSR Partner Organization *
                  </label>
                  <select
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                  >
                    <option value="PARTNER-TATA-CSR">Tata Steel CSR Foundation</option>
                    <option value="PARTNER-CIL-CSR">Coal India Community Wing</option>
                    <option value="PARTNER-JREDA-CORP">Jharkhand Renewable Energy Corp</option>
                    <option value="PARTNER-VEDANTA-ESL">Vedanta ESL CSR Wing</option>
                    <option value="PARTNER-PRADAN">Pradan Rural Innovation Fund</option>
                    <option value="PARTNER-SAIL-CSR">SAIL CSR Foundation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Support Type *
                  </label>
                  <select
                    value={supportType}
                    onChange={(e) => setSupportType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                  >
                    <option value="Hardware & Pilot Grant">Hardware & Pilot Grant</option>
                    <option value="Direct CSR Funding">Direct CSR Funding</option>
                    <option value="Equipment Donation & Mentorship">Equipment Donation & Mentorship</option>
                    <option value="Field Logistics & Deployment">Field Logistics & Deployment</option>
                  </select>
                </div>
              </div>

              <FormField
                label="Proposed CSR Budget / Support Scope (INR)"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                placeholder="e.g. 1500000"
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Joint Project Proposal Notes
                </label>
                <textarea
                  rows={3}
                  value={collaborationNotes}
                  onChange={(e) => setCollaborationNotes(e.target.value)}
                  placeholder="Outline the faculty lead, deliverables, expected pilot timeframe, and community beneficiaries..."
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
                  disabled={isSubmitting || !targetTrackId || !partnerId}
                  className="rounded-lg bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#1a4a7a] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Initiate Partnership</span>
                </button>
              </div>
            </form>
          </Modal>
        )}
      </PageContainer>
    </HEILayout>
  )
}
