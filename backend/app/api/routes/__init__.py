from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.reports import router as reports_router
from app.api.routes.notifications import router as notifications_router, alerts_router
from app.api.routes.announcements import router as announcements_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.audit_logs import router as audit_logs_router
from app.api.routes.ai_management import router as ai_management_router
from app.api.routes.profile import router as profile_router

__all__ = [
    "health_router",
    "auth_router",
    "reports_router",
    "notifications_router",
    "alerts_router",
    "announcements_router",
    "analytics_router",
    "audit_logs_router",
    "ai_management_router",
    "profile_router",
]
