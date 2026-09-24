import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GovernmentLayout } from '../../layouts/GovernmentLayout'
import {
  GovFilters,
  GovPage,
  GovProblemRow,
  isCitizenSubmittedReport,
  mapBackendReportToGovernmentProblem,
} from './GovernmentShared'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { RefreshCw, Search } from 'lucide-react'
import {
  getReports,
  getReportByTrackId,
  updateReportStatus,
  type BackendReportResponse,
} from '../../services/reportService'
import { GovernmentReportDetailsModal } from '../../components/government/GovernmentReportDetailsModal'
import type { GovernmentProblem } from '../../types'

export function ProblemQueuePage() {
  const [searchParams] = useSearchParams()
  const selectedTrackId = searchParams.get('selected') || searchParams.get('trackId')

  const [rawReports, setRawReports] = useState<BackendReportResponse[]>([])
  const [problems, setProblems] = useState<GovernmentProblem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Details Modal State
  const [selectedModalReport, setSelectedModalReport] = useState<BackendReportResponse | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false)

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [category, setCategory] = useState('All categories')
  const [location, setLocation] = useState('All Jharkhand Districts')
  const [priority, setPriority] = useState('All priorities')

  // Load real citizen reports from backend API: GET /api/reports
  const loadCitizenProblems = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      const data = await getReports()
      // Filter strictly to citizen portal submitted problems
      const citizenReports = data.filter(isCitizenSubmittedReport)
      setRawReports(citizenReports)
      // Display all live citizen submissions directly in Government Problem Queue
      const mapped = citizenReports.slice(0, 10).map(mapBackendReportToGovernmentProblem)
      setProblems(mapped)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend server.'
      setFetchError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCitizenProblems()
  }, [loadCitizenProblems])

  // Handle ?selected=TRACK_ID query param from Duplicates or external links
  useEffect(() => {
    if (!selectedTrackId) return

    let isMounted = true
    const openSelectedProblem = async () => {
      // First try to find in loaded raw reports
      const found = rawReports.find(
        (r) => r.track_id.toLowerCase() === selectedTrackId.trim().toLowerCase()
      )
      if (found) {
        if (isMounted) {
          setSelectedModalReport(found)
          setSearch(found.track_id)
        }
        return
      }

      // If not found in memory, fetch directly from backend API
      try {
        const direct = await getReportByTrackId(selectedTrackId.trim())
        if (isMounted && direct) {
          setSelectedModalReport(direct)
          setSearch(direct.track_id)
        }
      } catch {
        // Report not found or network issue; modal won't open
      }
    }

    openSelectedProblem()

    return () => {
      isMounted = false
    }
  }, [selectedTrackId, rawReports])


  const handleUpdateStatus = async (
    trackId: string,
    newStatus: 'Open' | 'In Progress' | 'Resolved' | 'Rejected'
  ) => {
    setIsUpdatingStatus(true)
    try {
      const updated = await updateReportStatus(trackId, newStatus)
      setSelectedModalReport(updated)
      await loadCitizenProblems()
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const results = useMemo(() => {
    return problems.filter((item) => {
      // Search text (title, description, track ID)
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchDesc = item.description.toLowerCase().includes(query)
        const matchTrack = (item.trackId || item.id).toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchTrack) return false
      }

      // Status filter
      if (status !== 'All statuses') {
        const itemStatus = item.status.toLowerCase()
        const filterStatus = status.toLowerCase()
        if (itemStatus !== filterStatus) return false
      }

      // Category filter (handles variants like 'Water and Sanitation' vs 'Water & Sanitation')
      if (category !== 'All categories') {
        const normItemCat = item.category.toLowerCase().replace('&', 'and').trim()
        const normFilterCat = category.toLowerCase().replace('&', 'and').trim()
        if (normItemCat !== normFilterCat) return false
      }

      // District / Location filter
      if (location !== 'All locations' && location !== 'All Jharkhand Districts') {
        const filterDist = location.replace(/\s*\(.*\)/, '').trim().toLowerCase()
        const itemDist = (item.district || '').toLowerCase()
        const itemLoc = item.location.toLowerCase()
        if (!itemDist.includes(filterDist) && !itemLoc.includes(filterDist)) {
          return false
        }
      }

      // Priority filter
      if (priority !== 'All priorities' && item.priority !== priority) {
        return false
      }

      return true
    })
  }, [category, location, priority, problems, search, status])

  return (
    <GovernmentLayout title="Problem Queue">
      <GovPage
        title="Problem Queue"
        description="Review submitted problems awaiting government validation."
        breadcrumbs={[
          { label: 'Government', href: '/government/dashboard' },
          { label: 'Problem Queue' },
        ]}
        action={
          <button
            type="button"
            onClick={loadCitizenProblems}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            title="Reload problems from backend"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#187e8d]' : 'text-slate-600'} />
            <span>{isLoading ? 'Fetching...' : 'Sync Live Data'}</span>
          </button>
        }
      >
        <GovFilters
          search={search}
          onSearch={setSearch}
          status={status}
          onStatus={setStatus}
          category={category}
          onCategory={setCategory}
          location={location}
          onLocation={setLocation}
          priority={priority}
          onPriority={setPriority}
        />

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {results.length} {results.length === 1 ? 'problem' : 'problems'} · Citizen Submissions
            {selectedTrackId && ` (Highlighting problem ${selectedTrackId})`}
          </p>
        </div>

        {isLoading ? (
          <div className="mt-4">
            <LoadingState rows={4} />
          </div>
        ) : fetchError ? (
          <div className="mt-4">
            <ErrorState
              title="Unable to load problem queue"
              description={fetchError}
              onRetry={loadCitizenProblems}
            />
          </div>
        ) : results.length ? (
          <div className="mt-4 grid gap-4">
            {results.map((problem) => {
              const tid = problem.trackId || problem.id
              const isSelected = Boolean(
                selectedTrackId && tid.toLowerCase() === selectedTrackId.toLowerCase()
              )
              return (
                <GovProblemRow
                  key={problem.id}
                  problem={problem}
                  isSelected={isSelected}
                />
              )
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={Search}
              title="No problems found"
              description="Try adjusting the queue filters or searching for different terms."
            />
          </div>
        )}

        {/* Authentic Citizen Report Details Modal */}
        {selectedModalReport && (
          <GovernmentReportDetailsModal
            report={selectedModalReport}
            onClose={() => setSelectedModalReport(null)}
            onUpdateStatus={handleUpdateStatus}
            isUpdatingStatus={isUpdatingStatus}
          />
        )}
      </GovPage>
    </GovernmentLayout>
  )
}