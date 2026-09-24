import { useState, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Layers,
  GraduationCap,
  Building2,
  Handshake,
  MessageSquareQuote,
  UserCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardSidebar, type NavigationItem } from '../components/navigation/DashboardSidebar'
import { DashboardTopbar } from '../components/navigation/DashboardTopbar'
import { useAuth } from '../context/AuthContext'

interface HEILayoutProps {
  children: ReactNode
  title: string
  breadcrumbs?: { label: string; href?: string }[]
}

const items: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/university',
    icon: LayoutDashboard,
  },
  {
    label: 'Problem Queue',
    href: '/university/problem-queue',
    icon: Layers,
  },
  {
    label: 'Faculty Assigned',
    href: '/university/faculty-assigned',
    icon: GraduationCap,
  },
  {
    label: 'Resources & Support',
    href: '/university/resources-support',
    icon: Building2,
  },
  {
    label: 'Industry / CSR Collaboration',
    href: '/university/collaborations',
    icon: Handshake,
  },
  {
    label: 'Government Feedback',
    href: '/university/feedback',
    icon: MessageSquareQuote,
  },
  {
    label: 'Profile',
    href: '/university/profile',
    icon: UserCheck,
  },
]

export function HEILayout({ children, title, breadcrumbs }: HEILayoutProps) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  if (!currentUser) return null

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-[#f7f9fc]">
      <DashboardSidebar
        items={items}
        user={currentUser}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapsedChange={setCollapsed}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={signOut}
      />
      <div className="min-w-0 flex-1">
        <DashboardTopbar
          portalName="University Portal"
          title={title}
          breadcrumbs={breadcrumbs}
          user={currentUser}
          notificationCount={3}
          onNotificationsClick={() => navigate('/hei/notifications')}
          onMenuClick={() => setMobileOpen(true)}
          onProfile={() => navigate('/university/profile')}
          onLogout={signOut}
        />
        <main>{children}</main>
      </div>
    </div>
  )
}

export const UniversityLayout = HEILayout