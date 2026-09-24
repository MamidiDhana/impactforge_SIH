import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { NotificationBell } from '../notifications/NotificationBell'
import { UserMenu } from './UserMenu'
import type { BreadcrumbItem } from '../common/Breadcrumbs'
import type { User } from '../../types'
interface DashboardTopbarProps {
  portalName?: string
  title: string
  breadcrumbs?: BreadcrumbItem[]
  user?: User
  onMenuClick?: () => void
  onNotificationsClick?: () => void
  notificationCount?: number
  onProfile?: () => void
  onLogout?: () => void
  search?: ReactNode
  actions?: ReactNode
}

function getDerivedPortalName(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const path = window.location.pathname
  if (path.startsWith('/citizen')) return 'Citizen'
  if (path.startsWith('/government')) return 'Government'
  if (path.startsWith('/hei') || path.startsWith('/university') || path.startsWith('/faculty')) return 'University Portal'
  if (path.startsWith('/partner')) return 'Industry Partnerships'
  if (path.startsWith('/admin')) return 'Super Admin'
  return undefined
}

export function DashboardTopbar({
  portalName,
  title,
  breadcrumbs: _breadcrumbs,
  user,
  onMenuClick,
  onNotificationsClick,
  notificationCount: _notificationCount,
  onProfile,
  onLogout,
  search,
  actions,
}: DashboardTopbarProps) {
  const activePortalName = portalName || getDerivedPortalName()
  // Show portal identity on feature pages where title !== portalName.
  // On the main dashboard page, the portal name is displayed once as the page heading.
  const showPortalIdentity = Boolean(activePortalName && title !== activePortalName)

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        {showPortalIdentity && (
          <span className="font-[Manrope] text-base sm:text-lg font-bold text-[#13243b] tracking-tight">
            {activePortalName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        {search && <div className="hidden w-52 md:block">{search}</div>}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        <NotificationBell onClick={onNotificationsClick} />
        {user && <UserMenu user={user} onProfile={onProfile} onLogout={onLogout} />}
      </div>
    </header>
  )
}