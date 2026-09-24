import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GraduationCap,
  Search,
  BookOpen,
  Mail,
  Layers,
  Plus,
  Sparkles,
  RefreshCw,
  MapPin,
  Users,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  ChevronRight,
  Award,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { HEILayout } from '../../layouts/HEILayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { EmptyState } from '../../components/common/EmptyState'
import { Modal } from '../../components/common/Modal'
import { FormField } from '../../components/forms/FormField'
import {
  getFacultyAssignments,
  getFacultyRegistry,
  assignFacultyToProblem,
  unassignFacultyFromProblem,
  getReports,
  type FacultyAssignmentItem,
  type FacultyRegistryItem,
  type BackendReportResponse,
} from '../../services/reportService'

export function UniversityFacultyAssignedPage() {


  // Live Backend State
  const [assignments, setAssignments] = useState<FacultyAssignmentItem[]>([])
  const [facultyRegistry, setFacultyRegistry] = useState<FacultyRegistryItem[]>([])
  const [availableQueueReports, setAvailableQueueReports] = useState<BackendReportResponse[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'assignments' | 'faculty'>('assignments')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [selectedStage, setSelectedStage] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Modals State
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedFacultyForAssignment, setSelectedFacultyForAssignment] = useState<string>('')
  const [selectedProblemToAssign, setSelectedProblemToAssign] = useState<string>('')
  const [assignmentRemarks, setAssignmentRemarks] = useState<string>('')

  // Confirmation for unassignment
  const [unassignTarget, setUnassignTarget] = useState<FacultyAssignmentItem | null>(null)

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text })
    setTimeout(() => setFeedbackMessage(null), 4500)
  }

  // Load live data from backend
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const [assignmentsData, registryData, queueData] = await Promise.all([
        getFacultyAssignments(),
        getFacultyRegistry(),
        getReports({ target_dashboard: 'university' }).catch(() => [] as BackendReportResponse[]),
      ])

      setAssignments(assignmentsData)
      setFacultyRegistry(registryData)

      // Verified problems in university problem queue that can be allocated
      const verifiedQueue = queueData.filter(
        (r) =>
          r.verification_status?.toLowerCase() === 'verified' &&
          (r.routing_target === 'university' || r.routing_target === 'both' || !r.routing_target)
      )
      setAvailableQueueReports(verifiedQueue)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to connect to university assignment services.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extract distinct departments & stages dynamically from live data
  const departments = useMemo(() => {
    const set = new Set<string>()
    assignments.forEach((a) => a.faculty_department && set.add(a.faculty_department.trim()))
    facultyRegistry.forEach((f) => f.department && set.add(f.department.trim()))
    return ['All', ...Array.from(set).sort()]
  }, [assignments, facultyRegistry])

  const stages = useMemo(() => {
    const set = new Set<string>()
    assignments.forEach((a) => a.current_project_stage && set.add(a.current_project_stage.trim()))
    return [
      'All',
      'Problem Analysis',
      'Proposed Solution',
      'Prototype / Pilot',
      'Testing & Deployment',
      'Impact / Deployment',
      ...Array.from(set).filter(
        (s) =>
          !['Problem Analysis', 'Proposed Solution', 'Prototype / Pilot', 'Testing & Deployment', 'Impact / Deployment'].includes(
            s
          )
      ),
    ]
  }, [assignments])

  const statuses = ['All', 'In Progress', 'Active', 'Under Review', 'Completed', 'Assigned']

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      if (selectedDepartment !== 'All' && item.faculty_department !== selectedDepartment) {
        return false
      }
      if (selectedStage !== 'All' && item.current_project_stage !== selectedStage) {
        return false
      }
      if (selectedStatus !== 'All' && item.assignment_status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = item.track_id.toLowerCase().includes(q)
        const matchTitle = (item.problem_title || '').toLowerCase().includes(q)
        const matchFaculty = (item.assigned_faculty_name || '').toLowerCase().includes(q)
        const matchDept = (item.faculty_department || '').toLowerCase().includes(q)
        const matchLoc = (item.location || '').toLowerCase().includes(q)
        const matchCat = (item.category || '').toLowerCase().includes(q)
        const matchExp = (item.faculty_expertise || []).some((e) => e.toLowerCase().includes(q))
        if (!matchId && !matchTitle && !matchFaculty && !matchDept && !matchLoc && !matchCat && !matchExp) {
          return false
        }
      }
      return true
    })
  }, [assignments, selectedDepartment, selectedStage, selectedStatus, searchQuery])

  // Filtered faculty registry
  const filteredFaculty = useMemo(() => {
    return facultyRegistry.filter((faculty) => {
      if (selectedDepartment !== 'All' && faculty.department !== selectedDepartment) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = faculty.name.toLowerCase().includes(q)
        const matchDept = faculty.department.toLowerCase().includes(q)
        const matchExp = (faculty.research_expertise || faculty.skills || []).some((e) =>
          e.toLowerCase().includes(q)
        )
        if (!matchName && !matchDept && !matchExp) return false
      }
      return true
    })
  }, [facultyRegistry, selectedDepartment, searchQuery])

  // Handle Assign Problem Action
  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProblemToAssign || !selectedFacultyForAssignment) {
      notify('Please select both a problem challenge and a faculty mentor.', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await assignFacultyToProblem(
        selectedProblemToAssign,
        selectedFacultyForAssignment,
        assignmentRemarks.trim() || 'Assigned via University Faculty Portal'
      )

      notify(`Successfully assigned ${res.track_id} to faculty mentor.`)
      setAssignModalOpen(false)
      setSelectedProblemToAssign('')
      setSelectedFacultyForAssignment('')
      setAssignmentRemarks('')
      await loadData()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to save faculty assignment to database.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Unassign Problem Action
  const handleConfirmUnassign = async () => {
    if (!unassignTarget) return
    setIsSubmitting(true)
    try {
      await unassignFacultyFromProblem(unassignTarget.track_id)
      notify(`Unassigned problem ${unassignTarget.track_id} from ${unassignTarget.assigned_faculty_name}.`)
      setUnassignTarget(null)
      await loadData()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to unassign faculty member.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate high-level metrics
  const totalAssignedProblems = assignments.length
  const distinctMentors = useMemo(() => {
    const set = new Set(assignments.map((a) => a.assigned_faculty_name.toLowerCase().trim()))
    return set.size
  }, [assignments])

  const avgProgress = useMemo(() => {
    if (assignments.length === 0) return 0
    const sum = assignments.reduce((acc, a) => acc + (a.overall_progress || 0), 0)
    return Math.round(sum / assignments.length)
  }, [assignments])

  const engagedDeptsCount = useMemo(() => {
    const set = new Set(assignments.map((a) => a.faculty_department.toLowerCase().trim()))
    return set.size
  }, [assignments])

  return (
    <HEILayout title="Faculty Assigned">
      <PageContainer>
        <PageHeader
          title="University Portal → Faculty Assigned"
          description="Live problem and research projects assigned to faculty members of the authenticated University/HEI, featuring real-time project progress, departmental tracking, and end-to-end civic solution delivery."
          breadcrumbs={[
            { label: 'University', href: '/university' },
            { label: 'Faculty Assigned' },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => {
                  setSelectedFacultyForAssignment(facultyRegistry[0]?.faculty_id || '')
                  setAssignModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a]"
              >
                <Plus size={14} />
                <span>Assign Problem to Faculty</span>
              </button>
            </div>
          }
        />

        <div className="space-y-6">
          {/* Toast Notification */}
          {feedbackMessage && (
            <div
              role="status"
              className={`flex items-center gap-2 rounded-xl border p-4 text-xs font-bold shadow-sm transition animate-in fade-in ${
                feedbackMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <Sparkles size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Key Metrics Row */}
          <section aria-label="Faculty Assignment Metrics">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Active Problem Assignments"
                value={String(totalAssignedProblems)}
                description="Live community projects assigned"
                icon={Layers}
              />
              <StatCard
                label="Faculty Mentors Assigned"
                value={String(distinctMentors)}
                description="Academics leading solutions"
                icon={GraduationCap}
              />
              <StatCard
                label="Average Overall Progress"
                value={`${avgProgress}%`}
                description="Across all active stages"
                icon={TrendingUp}
              />
              <StatCard
                label="Departments Engaged"
                value={String(engagedDeptsCount)}
                description="Institutional research branches"
                icon={BookOpen}
              />
            </div>
          </section>

          {/* Tab Navigation & Search Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('assignments')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    activeTab === 'assignments'
                      ? 'bg-[#12365a] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Layers size={14} />
                  <span>Assigned Problems ({assignments.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('faculty')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    activeTab === 'faculty'
                      ? 'bg-[#12365a] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <GraduationCap size={14} />
                  <span>Faculty Directory ({facultyRegistry.length})</span>
                </button>
              </div>

              <span className="text-xs font-medium text-slate-500">
                {activeTab === 'assignments'
                  ? `Showing ${filteredAssignments.length} of ${assignments.length} assignments`
                  : `Showing ${filteredFaculty.length} of ${facultyRegistry.length} faculty mentors`}
              </span>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'assignments'
                      ? 'Search by Tracking ID, problem title, assigned faculty, department, or location...'
                      : 'Search faculty by name, department, or research expertise domain...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition focus:border-[#187e8d] focus:bg-white focus:ring-2 focus:ring-[#187e8d]/10"
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

                {activeTab === 'assignments' && (
                  <>
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

                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      aria-label="Filter by assignment status"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#187e8d]"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s === 'All' ? 'All Statuses' : s}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {isLoading && assignments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <LoadingState rows={4} />
            </div>
          ) : fetchError && assignments.length === 0 ? (
            <ErrorState
              title="Failed to Load Faculty Assignments"
              description={fetchError}
              onRetry={loadData}
            />
          ) : activeTab === 'assignments' ? (
            filteredAssignments.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No Assigned Problems Found"
                description={
                  searchQuery || selectedDepartment !== 'All' || selectedStage !== 'All' || selectedStatus !== 'All'
                    ? 'No faculty assignments match the selected filters. Try clearing your search query or reset filter dropdowns.'
                    : 'There are currently no problems assigned to faculty members. Click "Assign Problem to Faculty" to allocate a live verified challenge.'
                }
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {filteredAssignments.map((assignment) => {
                  return (
                    <article
                      key={assignment.track_id}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition duration-200 hover:border-[#187e8d]/50 hover:shadow-md"
                    >
                      <div className="space-y-4">
                        {/* Assignment Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-[#12365a] px-2.5 py-1 font-mono text-[11px] font-bold text-white shadow-xs">
                                {assignment.track_id}
                              </span>
                              <span className="rounded-lg bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-[#187e8d] ring-1 ring-teal-200/60">
                                {assignment.category}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  assignment.priority === 'Critical'
                                    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                    : assignment.priority === 'High'
                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                }`}
                              >
                                {assignment.priority} Priority
                              </span>
                            </div>
                            <h3 className="font-[Manrope] text-base font-bold text-[#13243b] group-hover:text-[#187e8d] transition">
                              {assignment.problem_title}
                            </h3>
                          </div>

                          <StatusBadge status={(assignment.assignment_status || 'In Progress') as any} />
                        </div>

                        {/* Location & Affected People */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <MapPin size={13} className="text-[#187e8d] shrink-0" />
                            <span>{assignment.location || `${assignment.locality}, ${assignment.district}`}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Users size={13} className="text-amber-600 shrink-0" />
                            <span>
                              {assignment.affected_people > 0
                                ? `${assignment.affected_people.toLocaleString()} Affected Citizens`
                                : 'Community Impact'}
                            </span>
                          </span>
                          {assignment.assignment_date && (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Clock size={12} className="shrink-0" />
                              <span>
                                Assigned{' '}
                                {new Date(assignment.assignment_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Assigned Faculty Profile Block */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="grid size-9 place-items-center rounded-lg bg-blue-100 text-xs font-bold text-[#12365a]">
                                {assignment.assigned_faculty_name.split(' ')[1]?.charAt(0) ||
                                  assignment.assigned_faculty_name.charAt(0)}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-[#13243b]">
                                  {assignment.assigned_faculty_name}
                                </p>
                                <p className="text-[11px] font-medium text-slate-500">
                                  {assignment.faculty_department}
                                </p>
                              </div>
                            </div>

                            {assignment.faculty_email && (
                              <a
                                href={`mailto:${assignment.faculty_email}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-[#187e8d]"
                                title={`Contact ${assignment.assigned_faculty_name}`}
                              >
                                <Mail size={12} />
                                <span className="hidden sm:inline">Contact</span>
                              </a>
                            )}
                          </div>

                          {/* Faculty Expertise Badges */}
                          {assignment.faculty_expertise && assignment.faculty_expertise.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Faculty Research Expertise
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {assignment.faculty_expertise.map((exp) => (
                                  <span
                                    key={exp}
                                    className="rounded-md bg-white border border-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                                  >
                                    {exp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Project Stage & Overall Progress */}
                        <div className="rounded-xl border border-teal-100/80 bg-teal-50/40 p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-[#12365a]">
                              <Activity size={14} className="text-[#187e8d]" />
                              <span>Current Project Stage:</span>
                              <span className="rounded-md bg-white border border-teal-200 px-2 py-0.5 text-[11px] font-semibold text-[#187e8d]">
                                {assignment.current_project_stage}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#187e8d]">
                              {assignment.overall_progress}% Progress
                            </span>
                          </div>

                          {/* Progress Bar Gauge */}
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#187e8d] to-[#12365a] transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(5, assignment.overall_progress))}%` }}
                            />
                          </div>

                          {assignment.remarks && (
                            <p className="text-[11px] text-slate-600 italic">
                              <span className="font-semibold not-italic text-slate-700">Remarks:</span>{' '}
                              {assignment.remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => setUnassignTarget(assignment)}
                          className="text-xs font-semibold text-slate-400 hover:text-red-600 transition"
                        >
                          Unassign Faculty
                        </button>

                        <div className="flex items-center gap-2">
                          {/* REQUIRED "Problem Details" Button */}
                          <Link
                            to={`/university/problems/${assignment.track_id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a] hover:shadow"
                          >
                            <span>Problem Details</span>
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          ) : (
            /* Faculty Directory & Capacity View */
            filteredFaculty.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No Faculty Mentors Found"
                description="No faculty mentors matched the selected department or search criteria."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredFaculty.map((faculty) => {
                  return (
                    <article
                      key={faculty.faculty_id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#187e8d]/40 hover:shadow-md"
                    >
                      <div className="space-y-4">
                        {/* Faculty Profile Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-base font-bold text-[#12365a]">
                              {faculty.name.split(' ')[1]?.charAt(0) || faculty.name.charAt(0)}
                            </span>
                            <div>
                              <h3 className="font-[Manrope] text-base font-bold text-[#13243b]">
                                {faculty.name}
                              </h3>
                              <p className="text-xs font-semibold text-[#187e8d]">
                                {faculty.designation || 'Faculty Mentor'}
                              </p>
                              <p className="text-xs text-slate-500">{faculty.department}</p>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              faculty.availability === 'available'
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : faculty.availability === 'assigned'
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                            }`}
                          >
                            {faculty.availability === 'available'
                              ? 'Available'
                              : faculty.availability === 'assigned'
                              ? 'Assigned'
                              : 'Full Capacity'}
                          </span>
                        </div>

                        {/* Email & Institution */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {faculty.contact_email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail size={12} className="text-slate-400" />
                              <span>{faculty.contact_email}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Award size={12} />
                            <span>{faculty.institution_name}</span>
                          </span>
                        </div>

                        {/* Research Expertise Domains */}
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Research Domain Expertise
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {(faculty.research_expertise?.length > 0
                              ? faculty.research_expertise
                              : faculty.skills
                            ).map((exp) => (
                              <span
                                key={exp}
                                className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                {exp}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Assigned Problems List */}
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Active Assigned Projects ({faculty.active_assignments_count})
                          </p>
                          {faculty.assigned_problem_track_ids.length === 0 ? (
                            <p className="mt-1 text-xs text-slate-400 italic">
                              No active challenges assigned yet. Ready for project allocation.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-1.5">
                              {faculty.assigned_problem_track_ids.map((trackId) => {
                                const matchedAssignment = assignments.find((a) => a.track_id === trackId)
                                return (
                                  <div
                                    key={trackId}
                                    className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="rounded bg-[#12365a] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                        {trackId}
                                      </span>
                                      <span className="truncate font-semibold text-[#13243b]">
                                        {matchedAssignment?.problem_title || 'Civic Challenge Initiative'}
                                      </span>
                                    </div>

                                    <Link
                                      to={`/university/problems/${trackId}`}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#187e8d] hover:underline"
                                    >
                                      <span>Details</span>
                                      <ChevronRight size={12} />
                                    </Link>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-400 font-medium">
                          Active Projects: {faculty.active_assignments_count}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFacultyForAssignment(faculty.faculty_id)
                            setAssignModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#12365a] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1a4a7a]"
                        >
                          <Plus size={13} />
                          <span>Assign Challenge</span>
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          )}
        </div>

        {/* Assign Problem Modal */}
        {assignModalOpen && (
          <Modal
            open={assignModalOpen}
            title="Assign Verified Challenge to Faculty Mentor"
            onClose={() => setAssignModalOpen(false)}
          >
            <form onSubmit={handleConfirmAssignment} className="space-y-4">
              <p className="text-xs text-slate-500">
                Allocate an authenticated civic problem from the University Problem Queue to a departmental faculty member for research-backed solution formulation.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Faculty Mentor *
                </label>
                <select
                  value={selectedFacultyForAssignment}
                  onChange={(e) => setSelectedFacultyForAssignment(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                >
                  <option value="">-- Choose a faculty member --</option>
                  {facultyRegistry.map((f) => (
                    <option key={f.faculty_id} value={f.faculty_id}>
                      {f.name} — {f.department} ({f.institution_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Validated Challenge *
                </label>
                <select
                  value={selectedProblemToAssign}
                  onChange={(e) => setSelectedProblemToAssign(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#187e8d]"
                >
                  <option value="">-- Choose a live problem from queue --</option>
                  {availableQueueReports.map((r) => (
                    <option key={r.track_id} value={r.track_id}>
                      [{r.track_id}] {r.problem_title} ({r.district} · {r.category})
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label="Assignment Remarks / Project Scope"
                value={assignmentRemarks}
                onChange={(e) => setAssignmentRemarks(e.target.value)}
                placeholder="e.g. Lead problem analysis, prototype design, and field validation."
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProblemToAssign || !selectedFacultyForAssignment}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#1a4a7a] disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Confirm Live Assignment</span>
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Unassign Confirmation Modal */}
        {unassignTarget && (
          <Modal
            open={Boolean(unassignTarget)}
            title="Confirm Faculty Unassignment"
            onClose={() => setUnassignTarget(null)}
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Are you sure you want to unassign problem{' '}
                <strong className="text-[#13243b] font-bold">{unassignTarget.track_id}</strong> (
                {unassignTarget.problem_title}) from faculty mentor{' '}
                <strong className="text-[#13243b] font-bold">{unassignTarget.assigned_faculty_name}</strong>?
              </p>
              <p className="text-[11px] text-slate-500">
                This action will update the live database and clear the assigned mentor role, allowing the problem to be reassigned.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnassignTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnassign}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Unassign Problem</span>
                </button>
              </div>
            </div>
          </Modal>
        )}
      </PageContainer>
    </HEILayout>
  )
}
