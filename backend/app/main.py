import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.db.migrate import run_migrations
from app.api.routes import (
    health_router,
    auth_router,
    reports_router,
    notifications_router,
    alerts_router,
    announcements_router,
    analytics_router,
    audit_logs_router,
    ai_management_router,
    profile_router,
)

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run safe idempotent database migrations and demo seed checks on startup
    try:
        run_migrations()
    except Exception as e:
        logger.error(f"Error during startup migrations: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


@app.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
def redirect_api_docs():
    return RedirectResponse(url="/docs")


@app.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False)
def redirect_api_openapi():
    return RedirectResponse(url="/openapi.json")

# CORS configuration for frontend
cors_origins = (
    settings.CORS_ORIGINS
    if isinstance(settings.CORS_ORIGINS, list)
    else [settings.CORS_ORIGINS]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(health_router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(profile_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(announcements_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(audit_logs_router, prefix=settings.API_V1_STR)
app.include_router(ai_management_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to ImpactForge API",
        "health_check": f"{settings.API_V1_STR}/health",
        "reports": f"{settings.API_V1_STR}/reports",
        "auth": f"{settings.API_V1_STR}/auth",
        "analytics": f"{settings.API_V1_STR}/analytics",
        "notifications": f"{settings.API_V1_STR}/notifications",
        "announcements": f"{settings.API_V1_STR}/announcements",
        "docs": "/docs",
        "api_docs": f"{settings.API_V1_STR}/docs",
    }
