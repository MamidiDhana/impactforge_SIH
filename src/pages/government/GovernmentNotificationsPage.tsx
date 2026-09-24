import { useState, useEffect, useCallback } from 'react'
import {
  CheckCheck,
  Inbox,
  AlertTriangle,
  Flame,
  Network,
  FileSearch,
  FolderKanban,
  Clock,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GovernmentLayout } from '../../layouts/GovernmentLayout'
import { GovPage } from './GovernmentShared'
import { EmptyState } from '../../components/common/EmptyState'
import {
  fetchAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  formatRelativeTime,
} from '../../services/alertService'
import type { AlertItem } from '../../types'
import { useNotifications } from '../../context/NotificationContext'

type FilterCategory = 'all' | 'unread' | 'high_priority' | 'queue' | 'duplicates' | 'projects'

export function GovernmentNotificationsPage() {
  const navigate = useNavigate()
  const { refreshAlerts: refreshGlobalNotifications } = useNotifications()

  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterCategory>('all')
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false)
  const [readingId, setReadingId] = useState<number | null>(null)

  // Fetch alerts from backend
  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAlerts({ limit: 100 })
      setAlerts(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load alerts from backend.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  // Mark a single alert as read
  const handleMarkRead = async (e: React.MouseEvent, alertId: number) => {
    e.stopPropagation()
    setReadingId(alertId)
    try {
      await markAlertAsRead(alertId)
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
      )
      refreshGlobalNotifications()
    } catch {
      // ignore
    } finally {
      setReadingId(null)
    }
  }

  // Mark all alerts as read
  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await markAllAlertsAsRead()
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
      refreshGlobalNotifications()
    } catch {
      // ignore
    } finally {
      setIsMarkingAll(false)
    }
  }

  // Handle click on alert to navigate to relevant module
  const handleAlertClick = async (alert: AlertItem) => {
    if (!alert.isRead) {
      try {
        await markAlertAsRead(alert.id)
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, isRead: true } : a))
        )
        refreshGlobalNotifications()
      } catch {
        // continue navigation regardless
      }
    }

    if (alert.actionUrl) {
      navigate(alert.actionUrl)
      return
    }

    // Default route derivation based on type and trackId
    if (alert.type.includes('duplicate')) {
      navigate('/government/duplicate-analysis')
    } else if (alert.type.includes('project') || alert.type.includes('milestone')) {
      navigate('/government/projects')
    } else if (alert.relatedTrackId) {
      navigate(`/government/problems/${alert.relatedTrackId}/review`)
    } else {
      navigate('/government/problem-queue')
    }
  }

  // Filter alerts based on active tab
  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'unread') return !a.isRead
    if (activeTab === 'high_priority') {
      return (
        a.priority === 'Critical' ||
        a.priority === 'Important' ||
        a.type === 'high_priority_problem'
      )
    }
    if (activeTab === 'queue') {
      return (
        a.type === 'report_submitted' ||
        a.type === 'verification_pending' ||
        a.type === 'status_changed'
      )
    }
    if (activeTab === 'duplicates') {
      return a.type.includes('duplicate')
    }
    if (activeTab === 'projects') {
      return (
        a.type.includes('project') ||
        a.type.includes('milestone') ||
        a.type.includes('hei')
      )
    }
    return true
  })

  const unreadCount = alerts.filter((a) => !a.isRead).length

  // Helper for alert icon based on type and priority
  const getAlertIcon = (type: string, priority: string) => {
    if (priority === 'Critical' || type === 'high_priority_problem') {
      return <Flame size={18} className="text-rose-600" />
    }
    if (type.includes('duplicate')) {
      return <Network size={18} className="text-amber-600" />
    }
    if (type.includes('project') || type.includes('milestone')) {
      return <FolderKanban size={18} className="text-indigo-600" />
    }
    if (type === 'verification_pending') {
      return <Clock size={18} className="text-blue-600" />
    }
    if (type === 'status_changed') {
      return <ShieldCheck size={18} className="text-emerald-600" />
    }
    if (priority === 'Important' || priority === 'High') {
      return <AlertTriangle size={18} className="text-amber-600" />
    }
    return <FileSearch size={18} className="text-[#187e8d]" />
  }

  const getAlertIconBg = (type: string, priority: string) => {
    if (priority === 'Critical' || type === 'high_priority_problem') {
      return 'bg-rose-50 text-rose-600 ring-rose-200'
    }
    if (type.includes('duplicate')) {
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    }
    if (type.includes('project') || type.includes('milestone')) {
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    }
    if (type === 'status_changed') {
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    }
    return 'bg-[#d9eeee] text-[#12365a] ring-[#187e8d]/20'
  }

  return (
    <GovernmentLayout title="Alerts">
      <GovPage
        title="Alerts"
        description="Stay informed about validation queues, duplicates, and project risks."
        breadcrumbs={[
          { label: 'Government', href: '/government/dashboard' },
          { label: 'Alerts' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAlerts}
              disabled={loading}
              title="Refresh live alerts"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || isMarkingAll}
              className="inline-flex items-center gap-2 rounded-lg bg-[#12365a] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0e2b48] transition shadow-xs disabled:opacity-50"
            >
              {isMarkingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={15} />}
              <span>Mark all as read</span>
            </button>
          </div>
        }
      >
        {/* Filter Navigation Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {[
              { key: 'all', label: 'All Alerts', count: alerts.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              {
                key: 'high_priority',
                label: 'High Priority',
                count: alerts.filter(
                  (a) => a.priority === 'Critical' || a.priority === 'Important' || a.type === 'high_priority_problem'
                ).length,
              },
              {
                key: 'queue',
                label: 'Problem Queue',
                count: alerts.filter(
                  (a) => a.type === 'report_submitted' || a.type === 'verification_pending' || a.type === 'status_changed'
                ).length,
              },
              {
                key: 'duplicates',
                label: 'Duplicates',
                count: alerts.filter((a) => a.type.includes('duplicate')).length,
              },
              {
                key: 'projects',
                label: 'Projects & Milestones',
                count: alerts.filter(
                  (a) => a.type.includes('project') || a.type.includes('milestone') || a.type.includes('hei')
                ).length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as FilterCategory)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-[#12365a] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : tab.key === 'unread' && tab.count > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Status summary pill */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live PostgreSQL Alerts Sync</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-800">Failed to load alerts</h3>
                <p className="mt-0.5 text-xs text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={loadAlerts}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <RefreshCw size={11} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse"
              >
                <div className="size-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-48 rounded bg-slate-200" />
                    <div className="h-3 w-16 rounded bg-slate-100" />
                  </div>
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alerts List */}
        {!loading && filteredAlerts.length > 0 && (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <article
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`group relative flex cursor-pointer gap-4 rounded-xl border p-5 shadow-xs transition hover:shadow-md ${
                  alert.isRead
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-[#187e8d]/40 bg-[#f0f9fa]/70 ring-1 ring-[#187e8d]/20 hover:border-[#187e8d]'
                }`}
              >
                {/* Unread Accent Indicator */}
                {!alert.isRead && (
                  <span className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r bg-[#187e8d]" />
                )}

                {/* Type Icon */}
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-full ring-1 shadow-xs transition group-hover:scale-105 ${getAlertIconBg(
                    alert.type,
                    alert.priority
                  )}`}
                >
                  {getAlertIcon(alert.type, alert.priority)}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={`text-sm sm:text-base font-bold text-[#13243b] ${
                          !alert.isRead ? 'font-bold' : 'font-semibold'
                        }`}
                      >
                        {alert.title}
                      </h2>

                      {/* Priority pill */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          alert.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : alert.priority === 'Important'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {alert.priority}
                      </span>

                      {/* Related track ID badge */}
                      {alert.relatedTrackId && (
                        <span className="rounded bg-[#12365a] px-2 py-0.5 font-mono text-[10px] font-bold text-white tracking-wide">
                          {alert.relatedTrackId}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="shrink-0 text-xs font-medium text-slate-400">
                      {formatRelativeTime(alert.createdAt)}
                    </span>
                  </div>

                  {/* Message body */}
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                    {alert.message}
                  </p>

                  {/* Action row */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-1 text-xs font-bold text-[#187e8d] group-hover:text-[#12365a] transition">
                      <span>View details & take action</span>
                      <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                    </div>

                    <div className="flex items-center gap-2">
                      {!alert.isRead ? (
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(e, alert.id)}
                          disabled={readingId === alert.id}
                          className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#12365a] shadow-2xs transition"
                        >
                          {readingId === alert.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Check size={11} className="text-emerald-600" />
                          )}
                          <span>Mark as read</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <Check size={12} className="text-slate-400" />
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAlerts.length === 0 && (
          <EmptyState
            icon={Inbox}
            title={activeTab === 'unread' ? 'No unread alerts' : 'No alerts found'}
            description={
              activeTab === 'unread'
                ? 'All government alerts have been reviewed and marked as read.'
                : 'No alerts found for this filter category in the database.'
            }
            action={
              activeTab !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="mt-3 rounded-lg bg-[#12365a] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0e2b48]"
                >
                  View All Alerts
                </button>
              ) : undefined
            }
          />
        )}
      </GovPage>
    </GovernmentLayout>
  )
}