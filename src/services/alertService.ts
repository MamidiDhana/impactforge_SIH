import type { AlertItem, BackendAlertResponse } from '../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    if (!payload.exp) return true
    return payload.exp * 1000 > Date.now() + 30000
  } catch {
    return false
  }
}

export async function getAlertsAuthToken(): Promise<string> {
  const storedToken =
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    ''

  if (storedToken && isTokenValid(storedToken)) {
    return storedToken
  }

  // Fallback to government demo credentials if offline
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vikram.singh@jharkhand.gov.in',
        password: 'demo-password',
        role: 'government',
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.access_token) {
        sessionStorage.setItem('access_token', data.access_token)
        localStorage.setItem('access_token', data.access_token)
        return data.access_token
      }
    }
  } catch {
    // ignore
  }

  return storedToken
}

export function mapBackendAlertToAlertItem(raw: BackendAlertResponse): AlertItem {
  return {
    id: raw.id,
    userId: raw.user_id,
    role: raw.role,
    type: raw.type,
    title: raw.title,
    message: raw.message,
    relatedTrackId: raw.related_track_id,
    relatedEntityId: raw.related_entity_id,
    actionUrl: raw.action_url,
    priority: raw.priority || 'Normal',
    isRead: Boolean(raw.is_read),
    readAt: raw.read_at,
    isDismissed: Boolean(raw.is_dismissed),
    eventKey: raw.event_key,
    createdAt: raw.created_at,
  }
}

/**
 * Formats an ISO date into a human-friendly relative time string.
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return 'Just now'
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }
    if (diffDays === 1) {
      return 'Yesterday'
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`
    }
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  } catch {
    return dateString
  }
}

export interface FetchAlertsOptions {
  unreadOnly?: boolean
  type?: string
  priority?: string
  limit?: number
  offset?: number
}

/**
 * Fetch live alerts for the authenticated Government officer.
 */
export async function fetchAlerts(options?: FetchAlertsOptions): Promise<AlertItem[]> {
  const token = await getAlertsAuthToken()
  if (!token) {
    throw new Error('Authentication session not found. Please log in.')
  }

  const query = new URLSearchParams()
  if (options?.unreadOnly) query.set('unread_only', 'true')
  if (options?.type) query.set('type', options.type)
  if (options?.priority) query.set('priority', options.priority)
  if (options?.limit) query.set('limit', String(options.limit))
  if (options?.offset) query.set('offset', String(options.offset))

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/alerts${queryString}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch alerts (Status ${response.status})`)
  }

  const data: BackendAlertResponse[] = await response.json()
  return data.map(mapBackendAlertToAlertItem)
}

/**
 * Fetch current unread alerts count for the authenticated officer.
 */
export async function fetchUnreadAlertsCount(): Promise<number> {
  const token = await getAlertsAuthToken()
  if (!token) return 0

  try {
    const response = await fetch(`${API_BASE_URL}/api/alerts/unread-count`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return typeof data.unread_count === 'number' ? data.unread_count : 0
    }
  } catch {
    // ignore
  }
  return 0
}

/**
 * Mark a specific alert as read in PostgreSQL.
 */
export async function markAlertAsRead(alertId: number): Promise<AlertItem> {
  const token = await getAlertsAuthToken()
  if (!token) {
    throw new Error('Authentication session not found.')
  }

  const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to mark alert as read (Status ${response.status})`)
  }

  const data: BackendAlertResponse = await response.json()
  return mapBackendAlertToAlertItem(data)
}

/**
 * Mark all visible alerts for the authenticated officer as read in PostgreSQL.
 */
export async function markAllAlertsAsRead(): Promise<{ message: string; updated_count?: number }> {
  const token = await getAlertsAuthToken()
  if (!token) {
    throw new Error('Authentication session not found.')
  }

  const response = await fetch(`${API_BASE_URL}/api/alerts/mark-all-read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to mark all alerts as read (Status ${response.status})`)
  }

  return response.json()
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(alertId: number): Promise<AlertItem> {
  const token = await getAlertsAuthToken()
  if (!token) {
    throw new Error('Authentication session not found.')
  }

  const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/dismiss`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to dismiss alert (Status ${response.status})`)
  }

  const data: BackendAlertResponse = await response.json()
  return mapBackendAlertToAlertItem(data)
}
