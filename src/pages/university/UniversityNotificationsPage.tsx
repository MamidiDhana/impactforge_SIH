import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { HEILayout } from '../../layouts/HEILayout'
import { PageContainer } from '../../components/common/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'
import { useNotifications } from '../../context/NotificationContext'

export function UniversityNotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications()

  return (
    <HEILayout title="Notifications">
      <PageContainer>
        <PageHeader
          title="University Notifications & Alerts"
          description="Stay updated with challenge allocations, government directives, and industry CSR collaboration requests."
          breadcrumbs={[
            { label: 'University', href: '/university' },
            { label: 'Notifications' },
          ]}
          action={
            notifications.length > 0 ? (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <CheckCheck size={14} className="text-[#187e8d]" />
                <span>Mark all as read</span>
              </button>
            ) : undefined
          }
        />

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No Notifications"
              description="You have no unread notifications or alerts at this time."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
              {notifications.map((item) => (
                <article
                  key={item.id}
                  className={`flex items-start gap-4 p-5 transition ${
                    item.read ? 'bg-white' : 'bg-teal-50/30'
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                      item.read
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-teal-100 text-[#187e8d]'
                    }`}
                  >
                    <Bell size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#13243b]">{item.title}</h3>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {item.message || 'No additional details provided.'}
                    </p>

                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="mt-2 text-xs font-bold text-[#187e8d] hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </HEILayout>
  )
}
