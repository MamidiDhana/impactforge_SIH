import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { useAdmin, type AdminAnnouncement } from './AdminContext'
import {
  type Notification,
  type NotificationPreferencesData,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATIONS_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  DISMISSED_ANNOUNCEMENTS_KEY,
  filterNotificationsByRole,
  filterAnnouncementsByRole,
  loadFromLocalStorage,
  saveToLocalStorage,
} from '../utils/notificationUtils'
import {
  fetchAlerts,
  fetchUnreadAlertsCount,
  markAlertAsRead as markBackendAlertRead,
  markAllAlertsAsRead as markBackendAllRead,
  dismissAlert as dismissBackendAlert,
} from '../services/alertService'

export interface CreateNotificationInput {
  type: Notification['type']
  title: string
  message: string
  targetRole: Notification['targetRole']
  relatedTrackId?: string
  priority?: Notification['priority']
  source?: Notification['source']
  actionUrl?: string
}

interface NotificationContextValue {
  notifications: Notification[]
  userNotifications: Notification[]
  userAnnouncements: AdminAnnouncement[]
  unreadCount: number
  preferences: NotificationPreferencesData
  notify: (input: CreateNotificationInput) => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismissNotification: (id: string) => Promise<void>
  dismissAnnouncement: (id: string) => void
  updatePreferences: (partial: Partial<NotificationPreferencesData>) => void
  clearAll: () => void
  refreshAlerts: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const { announcements } = useAdmin()

  // Centralized notifications state
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    loadFromLocalStorage<Notification[]>(NOTIFICATIONS_STORAGE_KEY, [])
  )

  // Live backend unread count
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(0)

  // Notification preferences
  const [preferences, setPreferences] = useState<NotificationPreferencesData>(() =>
    loadFromLocalStorage<NotificationPreferencesData>(
      PREFERENCES_STORAGE_KEY,
      DEFAULT_NOTIFICATION_PREFERENCES
    )
  )

  // Dismissed announcement IDs
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>(() =>
    loadFromLocalStorage<string[]>(DISMISSED_ANNOUNCEMENTS_KEY, [])
  )

  // Persist notifications on update
  useEffect(() => {
    saveToLocalStorage(NOTIFICATIONS_STORAGE_KEY, notifications)
  }, [notifications])

  // Persist preferences on update
  useEffect(() => {
    saveToLocalStorage(PREFERENCES_STORAGE_KEY, preferences)
  }, [preferences])

  // Persist dismissed announcements on update
  useEffect(() => {
    saveToLocalStorage(DISMISSED_ANNOUNCEMENTS_KEY, dismissedAnnouncementIds)
  }, [dismissedAnnouncementIds])

  // Fetch live notifications and unread count from backend
  const refreshAlerts = useCallback(async () => {
    if (!currentUser) return
    try {
      const [liveAlerts, count] = await Promise.all([
        fetchAlerts({ limit: 100 }),
        fetchUnreadAlertsCount(),
      ])

      setLiveUnreadCount(count)

      if (liveAlerts.length > 0) {
        const mapped: Notification[] = liveAlerts.map((a) => ({
          id: String(a.id),
          type: (a.type as Notification['type']) || 'system',
          title: a.title,
          message: a.message,
          targetRole: (a.role as Notification['targetRole']) || 'government',
          relatedTrackId: a.relatedTrackId || undefined,
          createdAt: a.createdAt,
          read: a.isRead,
          dismissed: a.isDismissed,
          priority: (a.priority as Notification['priority']) || 'Normal',
          source: (a.role === 'government' ? 'Government Validator' : 'System') as Notification['source'],
          actionUrl: a.actionUrl || undefined,
        }))
        setNotifications(mapped)
      }
    } catch {
      // Backend unavailable; keep cached state
    }
  }, [currentUser])

  // Initial load and periodic safe polling
  useEffect(() => {
    refreshAlerts()

    // Poll every 25 seconds when user is active
    const interval = setInterval(() => {
      refreshAlerts()
    }, 25000)

    return () => clearInterval(interval)
  }, [refreshAlerts])

  // Create a new notification
  const notify = useCallback((input: CreateNotificationInput) => {
    setNotifications((prev) => {
      if (input.relatedTrackId) {
        const isDuplicate = prev.some(
          (n) =>
            n.relatedTrackId === input.relatedTrackId &&
            n.type === input.type &&
            n.title === input.title
        )
        if (isDuplicate) return prev
      }

      const newNotification: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: input.type,
        title: input.title,
        message: input.message,
        targetRole: input.targetRole,
        relatedTrackId: input.relatedTrackId,
        createdAt: new Date().toISOString(),
        read: false,
        dismissed: false,
        priority: input.priority || 'Normal',
        source: input.source || 'System',
        actionUrl: input.actionUrl,
      }

      return [newNotification, ...prev]
    })
  }, [])

  // Mark single notification as read in backend & state
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic local update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setLiveUnreadCount((prev) => Math.max(0, prev - 1))

    const numId = parseInt(id, 10)
    if (!isNaN(numId)) {
      try {
        await markBackendAlertRead(numId)
      } catch {
        // ignore
      }
    }
  }, [])

  // Mark all visible notifications for user as read in backend & state
  const markAllAsRead = useCallback(async () => {
    const userRole = currentUser?.role
    setNotifications((prev) => {
      const visible = filterNotificationsByRole(prev, userRole, preferences)
      const visibleIds = new Set(visible.map((v) => v.id))
      return prev.map((n) => (visibleIds.has(n.id) ? { ...n, read: true } : n))
    })
    setLiveUnreadCount(0)

    try {
      await markBackendAllRead()
    } catch {
      // ignore
    }
  }, [currentUser?.role, preferences])

  // Dismiss single notification in backend & state
  const dismissNotification = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
    )
    const numId = parseInt(id, 10)
    if (!isNaN(numId)) {
      try {
        await dismissBackendAlert(numId)
      } catch {
        // ignore
      }
    }
  }, [])

  // Dismiss an announcement
  const dismissAnnouncement = useCallback((id: string) => {
    setDismissedAnnouncementIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  // Update notification preferences
  const updatePreferences = useCallback((partial: Partial<NotificationPreferencesData>) => {
    setPreferences((prev) => ({ ...prev, ...partial }))
  }, [])

  // Clear all visible notifications
  const clearAll = useCallback(() => {
    const userRole = currentUser?.role
    setNotifications((prev) => {
      const visible = filterNotificationsByRole(prev, userRole, preferences)
      const visibleIds = new Set(visible.map((v) => v.id))
      return prev.map((n) => (visibleIds.has(n.id) ? { ...n, dismissed: true } : n))
    })
  }, [currentUser?.role, preferences])

  // Role-filtered notifications
  const userNotifications = useMemo(
    () => filterNotificationsByRole(notifications, currentUser?.role, preferences),
    [notifications, currentUser?.role, preferences]
  )

  // Role-filtered announcements
  const userAnnouncements = useMemo(
    () =>
      filterAnnouncementsByRole(
        announcements,
        currentUser?.role,
        dismissedAnnouncementIds,
        preferences
      ),
    [announcements, currentUser?.role, dismissedAnnouncementIds, preferences]
  )

  // Live unread badge count (matches backend or computed)
  const unreadCount = useMemo(() => {
    const localUnread = userNotifications.filter((n) => !n.read).length
    return Math.max(localUnread, liveUnreadCount)
  }, [userNotifications, liveUnreadCount])

  const value = useMemo(
    () => ({
      notifications,
      userNotifications,
      userAnnouncements,
      unreadCount,
      preferences,
      notify,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      dismissAnnouncement,
      updatePreferences,
      clearAll,
      refreshAlerts,
    }),
    [
      notifications,
      userNotifications,
      userAnnouncements,
      unreadCount,
      preferences,
      notify,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      dismissAnnouncement,
      updatePreferences,
      clearAll,
      refreshAlerts,
    ]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
