
import type { AdminAnnouncement } from '../context/AdminContext'

export type NotificationType =
  | 'report_submitted'
  | 'status_changed'
  | 'assignment_updated'
  | 'project_updated'
  | 'announcement'
  | 'system'

export type NotificationPriority = 'Normal' | 'Important' | 'Urgent' | 'Critical'

export type NotificationSource =
  | 'Citizen Portal'
  | 'Government Validator'
  | 'HEI Coordination'
  | 'Faculty Team'
  | 'Partner Network'
  | 'Super Admin'
  | 'System'

export type TargetAudience =
  | 'all'
  | 'citizen'
  | 'government'
  | 'hei'
  | 'faculty'
  | 'partner'
  | 'admin'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  targetRole: TargetAudience | TargetAudience[]
  relatedTrackId?: string
  createdAt: string // ISO string
  read: boolean
  dismissed: boolean
  priority: NotificationPriority
  source: NotificationSource
  actionUrl?: string
}

export interface NotificationPreferencesData {
  showAnnouncements: boolean
  showReportStatusUpdates: boolean
  showProjectUpdates: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesData = {
  showAnnouncements: true,
  showReportStatusUpdates: true,
  showProjectUpdates: true,
}

export const NOTIFICATIONS_STORAGE_KEY = 'impactforge.notifications.v1'
export const PREFERENCES_STORAGE_KEY = 'impactforge.notifications.preferences.v1'
export const DISMISSED_ANNOUNCEMENTS_KEY = 'impactforge.announcements.dismissed.v1'

/**
 * Format relative or calendar timestamp safely.
 */
export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'Recent'
  try {
    const timestamp = new Date(isoString).getTime()
    if (isNaN(timestamp)) return 'Recent'

    const diffSec = Math.floor((Date.now() - timestamp) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 172800) return 'Yesterday'

    const d = new Date(timestamp)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return 'Recent'
  }
}

/**
 * Normalizes user role string to match TargetAudience.
 */
export function normalizeUserRole(role?: string | null): TargetAudience {
  if (!role) return 'all'
  const r = role.toLowerCase().trim()
  if (r.includes('citizen')) return 'citizen'
  if (r.includes('gov')) return 'government'
  if (r.includes('hei') || r.includes('university')) return 'hei'
  if (r.includes('facult')) return 'faculty'
  if (r.includes('partner')) return 'partner'
  if (r.includes('admin')) return 'admin'
  return 'all'
}

/**
 * Filters notifications matching the current user's role and preferences.
 */
export function filterNotificationsByRole(
  notifications: Notification[],
  userRole?: string | null,
  preferences: NotificationPreferencesData = DEFAULT_NOTIFICATION_PREFERENCES
): Notification[] {
  const normalized = normalizeUserRole(userRole)

  return notifications.filter((n) => {
    if (n.dismissed) return false

    // Filter by user preference
    if (!preferences.showReportStatusUpdates && n.type === 'status_changed') {
      return false
    }
    if (!preferences.showProjectUpdates && (n.type === 'assignment_updated' || n.type === 'project_updated')) {
      return false
    }

    // Role target check
    if (Array.isArray(n.targetRole)) {
      if (n.targetRole.includes('all')) return true
      return n.targetRole.includes(normalized)
    }

    if (n.targetRole === 'all') return true
    return n.targetRole === normalized
  })
}

/**
 * Maps Admin Announcement audience to standard TargetAudience.
 */
export function mapAnnouncementAudienceToRole(audience: string): TargetAudience {
  const aud = audience.toLowerCase().trim()
  if (aud.includes('all')) return 'all'
  if (aud.includes('citizen')) return 'citizen'
  if (aud.includes('gov')) return 'government'
  if (aud.includes('hei') || aud.includes('universit')) return 'hei'
  if (aud.includes('facult')) return 'faculty'
  if (aud.includes('partner')) return 'partner'
  if (aud.includes('admin')) return 'admin'
  return 'all'
}

/**
 * Filters active announcements applicable to user's role and preferences.
 */
export function filterAnnouncementsByRole(
  announcements: AdminAnnouncement[],
  userRole?: string | null,
  dismissedIds: string[] = [],
  preferences: NotificationPreferencesData = DEFAULT_NOTIFICATION_PREFERENCES
): AdminAnnouncement[] {
  if (!preferences.showAnnouncements) return []

  const normalized = normalizeUserRole(userRole)

  return announcements.filter((ann) => {
    if (!ann.active) return false
    if (dismissedIds.includes(ann.id)) return false

    const targetAudience = mapAnnouncementAudienceToRole(ann.audience)
    if (targetAudience === 'all') return true
    return targetAudience === normalized
  })
}

/**
 * Safe local storage reader.
 */
export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Safe local storage writer.
 */
export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Gracefully handle storage quota or private mode restrictions
  }
}
