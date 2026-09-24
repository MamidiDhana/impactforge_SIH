import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileSearch,
  Clock,
  CheckCircle2,
  MapPin,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  FolderKanban,
} from 'lucide-react'
import { GovernmentLayout } from '../../layouts/GovernmentLayout'
import { GovPage, isCitizenSubmittedReport } from './GovernmentShared'
import { StatCard } from '../../components/common/StatCard'
import { DashboardWelcome } from '../../components/dashboard/DashboardWelcome'
import { SectionHeader } from '../../components/common/SectionHeader'
import { ErrorState } from '../../components/common/ErrorState'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { GovernmentReportFilters } from '../../components/government/GovernmentReportFilters'
import { GovernmentReportsTable } from '../../components/government/GovernmentReportsTable'
import { AnnouncementBanner } from '../../components/notifications/AnnouncementBanner'
import {
  getReports,
  updateReportStatus,
  deduplicateReports,
  type BackendReportResponse,
} from '../../services/reportService'

export function GovernmentDashboardPage() {
  const [reports, setReports] = useState<BackendReportResponse[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Status update states
  const [isUpdatingTrackId, setIsUpdatingTrackId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null)

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedUrgency, setSelectedUrgency] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Load citizen reports from the backend: GET /api/reports
  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      const data = await getReports()
      // Display ONLY actual problems/reports submitted from the Citizen Portal
      const citizenReports = data.filter(isCitizenSubmittedReport)
      setReports(citizenReports)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend server.'
      setFetchError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Handle status update: PATCH /api/reports/{track_id}/status
  const handleUpdateStatus = async (
    trackId: string,
    newStatus: 'Open' | 'In Progress' | 'Resolved' | 'Rejected'
  ) => {
    setIsUpdatingTrackId(trackId)
    setStatusUpdateError(null)

    try {
      const updated = await updateReportStatus(trackId, newStatus)

      // Immediately update in local state
      setReports((prev) =>
        prev.map((r) => (r.track_id === trackId ? { ...r, ...updated, status: newStatus } : r))
      )

      setSuccessMessage(`Status for ${trackId} updated to "${newStatus}" successfully.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update report status.'
      setStatusUpdateError(msg)
      setTimeout(() => setStatusUpdateError(null), 5000)
      throw err
    } finally {
      setIsUpdatingTrackId(null)
    }
  }

  /**
   * DISPLAY-ONLY DEDUPLICATION FOR GOVERNMENT DASHBOARD:
   *
   * NOTE: This is a strictly DISPLAY-ONLY deduplication layer.
   * Underlying citizen reports in the PostgreSQL database are INTENTIONALLY PRESERVED
   * and never deleted. Every individual report remains fully accessible by its unique
   * permanent Track ID (e.g. IF-JH-2026-XXXX).
   *
   * When multiple report records share the exact same problem title (after trimming
   * leading/trailing whitespace), only ONE representative entry is displayed:
   * 1. Prefer an active / open / unresolved report over an already resolved or rejected one.
   * 2. If status priorities are equal, prefer the most recently updated or newest record.
   * 3. Stable tiebreaker: deterministic track_id comparison.
   *
   * The original title text is preserved without changes.
   */
  const deduplicatedReports = useMemo(() => {
    return deduplicateReports(reports)
  }, [reports])

  // Filtered reports calculation (applied to display-deduplicated list)
  const filteredReports = useMemo(() => {
    return deduplicatedReports.filter((report) => {
      // Search filter (Track ID or title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = report.track_id.toLowerCase().includes(q)
        const matchTitle = report.problem_title.toLowerCase().includes(q)
        if (!matchId && !matchTitle) return false
      }

      // District filter
      if (selectedDistrict) {
        if (report.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
          return false
        }
      }

      // Category filter
      if (selectedCategory) {
        if (report.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false
        }
      }

      // Urgency filter
      if (selectedUrgency) {
        if (report.priority.toLowerCase() !== selectedUrgency.toLowerCase()) {
          return false
        }
      }

      // Status filter
      if (selectedStatus) {
        if (report.status.toLowerCase() !== selectedStatus.toLowerCase()) {
          return false
        }
      }

      return true
    })
  }, [deduplicatedReports, searchQuery, selectedDistrict, selectedCategory, selectedUrgency, selectedStatus])

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedDistrict || selectedCategory || selectedUrgency || selectedStatus
  )

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedDistrict('')
    setSelectedCategory('')
    setSelectedUrgency('')
    setSelectedStatus('')
  }

  // Live summary statistics directly derived from authoritative citizen reports
  const stats = useMemo(() => {
    const total = deduplicatedReports.length
    const openCount = deduplicatedReports.filter((r) => r.status === 'Open').length
    const inProgressCount = deduplicatedReports.filter((r) => r.status === 'In Progress').length
    const resolvedCount = deduplicatedReports.filter((r) => r.status === 'Resolved').length
    const rejectedCount = deduplicatedReports.filter((r) => r.status === 'Rejected').length
    const districtCount = new Set(deduplicatedReports.map((r) => r.district.trim())).size

    return {
      total,
      openCount,
      inProgressCount,
      resolvedCount,
      rejectedCount,
      districtCount,
    }
  }, [deduplicatedReports])

  return (
    <GovernmentLayout title="Government Dashboard">
      <GovPage
        title="Government Operations Dashboard"
        description="Monitor, review, and resolve verified community problems reported across all 24 Jharkhand districts."
        breadcrumbs={[{ label: 'Government', href: '/government/dashboard' }]}
        action={
          <button
            type="button"
            onClick={loadReports}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            title="Reload reports from backend"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'} />
            <span>{isLoading ? 'Fetching...' : 'Sync Live Data'}</span>
          </button>
        }
      >
        <div className="space-y-6">
          {/* Active Role-Filtered Announcement Banner */}
          <AnnouncementBanner />

          {/* Welcome Banner */}
          <DashboardWelcome
            name="Jharkhand State Innovation Operations"
            description="Central administrative portal for district officers to validate citizen problems, track real-time resolution stages, and dispatch challenges to state universities and engineering departments."
          />

          {/* Feedback & Alert Banners */}
          {successMessage && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm animate-in fade-in"
            >
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {statusUpdateError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 shadow-sm animate-in fade-in"
            >
              <AlertCircle size={18} className="text-red-600 shrink-0" />
              <span>{statusUpdateError}</span>
            </div>
          )}

          {/* Live Dynamic Statistics Grid */}
          <section>
            <SectionHeader
              title="State Submissions Overview"
              description="Real-time statistics calculated from citizen reports in PostgreSQL database."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label="Problems"
                value={String(stats.total)}
                description="Live citizen reports"
                icon={FileSearch}
              />
              <StatCard
                label="Open / Pending"
                value={String(stats.openCount)}
                description="Awaiting review"
                icon={Clock}
              />
              <StatCard
                label="In Progress"
                value={String(stats.inProgressCount)}
                description="Active solution stage"
                icon={FolderKanban}
              />
              <StatCard
                label="Resolved"
                value={String(stats.resolvedCount)}
                description="Completed solutions"
                icon={CheckCircle2}
              />
              <StatCard
                label="Districts Active"
                value={String(stats.districtCount)}
                description="Out of 24 districts"
                icon={MapPin}
              />
            </div>
          </section>

          {/* Reports Table Section */}
          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-[Manrope] text-lg font-bold text-[#13243b]">
                  Registered Citizen Reports
                </h2>
                <p className="text-xs text-slate-500">
                  Detailed listing of problems submitted via the Citizen Portal.
                </p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <GovernmentReportFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedDistrict={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedUrgency={selectedUrgency}
              onUrgencyChange={setSelectedUrgency}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              totalCount={deduplicatedReports.length}
              filteredCount={filteredReports.length}
            />

            {/* Main Content States */}
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <LoadingState rows={3} />
                <p className="mt-3 text-xs text-slate-400">Loading citizen reports from PostgreSQL backend...</p>
              </div>
            ) : fetchError ? (
              <ErrorState
                title="Failed to Load Reports"
                description={fetchError}
                onRetry={loadReports}
              />
            ) : reports.length === 0 ? (
              <EmptyState
                icon={FileSearch}
                title="No Citizen Reports Available"
                description="No reports have been submitted through the Citizen Portal yet. When citizens report issues, they will appear here in real time."
              />
            ) : filteredReports.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No Reports Match Filters"
                description="No community challenges matched the selected search query and filter criteria."
                action={
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-lg bg-[#12365a] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#1a4a7a]"
                  >
                    Reset All Filters
                  </button>
                }
              />
            ) : (
              <GovernmentReportsTable
                reports={filteredReports}
                onUpdateStatus={handleUpdateStatus}
                isUpdatingTrackId={isUpdatingTrackId}
              />
            )}
          </section>
        </div>
      </GovPage>
    </GovernmentLayout>
  )
}
