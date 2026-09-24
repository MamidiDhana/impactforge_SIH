from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])
alerts_router = APIRouter(prefix="/alerts", tags=["Alerts"])


def is_user_authorized_for_notification(notif: Notification, user: User) -> bool:
    """Verifies that the user owns or is targeted by the notification/alert."""
    if user.role == "admin":
        return True
    if notif.user_id is not None:
        return notif.user_id == user.id
    if notif.role is not None:
        return notif.role in [user.role, "All Users"]
    return True


def query_visible_notifications(
    current_user: User,
    db: Session,
    unread_only: bool = False,
    alert_type: Optional[str] = None,
    priority: Optional[str] = None,
):
    filters = [
        Notification.is_dismissed == False,
        or_(
            Notification.user_id == current_user.id,
            and_(
                Notification.user_id == None,
                or_(
                    Notification.role == current_user.role,
                    Notification.role == "All Users",
                    Notification.role == None,
                ),
            ),
        ),
    ]

    if unread_only:
        filters.append(Notification.is_read == False)

    if alert_type:
        filters.append(Notification.type == alert_type)

    if priority:
        filters.append(Notification.priority == priority)

    return db.query(Notification).filter(*filters)


# ==================== /notifications Endpoints ====================

@router.get(
    "",
    response_model=List[NotificationResponse],
    summary="Get user-specific and role-targeted notifications",
)
def get_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    type: Optional[str] = Query(None, description="Filter by notification type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Notification]:
    query = query_visible_notifications(
        current_user,
        db,
        unread_only=unread_only,
        alert_type=type,
        priority=priority,
    )
    return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get count of unread notifications",
)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnreadCountResponse:
    count = query_visible_notifications(current_user, db, unread_only=True).count()
    return UnreadCountResponse(unread_count=count)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read",
)
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    if not is_user_authorized_for_notification(notif, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this notification.",
        )

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notif)
    return notif


@router.patch(
    "/read-all",
    summary="Mark all visible notifications as read",
)
@router.patch(
    "/mark-all-read",
    summary="Mark all visible notifications as read (alias)",
)
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = query_visible_notifications(current_user, db, unread_only=True)
    count = query.update(
        {
            Notification.is_read: True,
            Notification.read_at: datetime.now(timezone.utc),
        },
        synchronize_session=False,
    )
    db.commit()
    return {"message": f"Marked {count} notifications as read.", "updated_count": count}


@router.patch(
    "/{notification_id}/dismiss",
    response_model=NotificationResponse,
    summary="Dismiss a notification",
)
def dismiss_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    if not is_user_authorized_for_notification(notif, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this notification.",
        )

    notif.is_dismissed = True
    db.commit()
    db.refresh(notif)
    return notif


# ==================== /alerts Endpoints (Aliases & Specialized Alerts) ====================

@alerts_router.get(
    "",
    response_model=List[NotificationResponse],
    summary="Get user-specific and role-targeted alerts",
)
def get_alerts(
    unread_only: bool = Query(False, description="Filter only unread alerts"),
    type: Optional[str] = Query(None, description="Filter by alert type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Notification]:
    return get_notifications(
        unread_only=unread_only,
        type=type,
        priority=priority,
        limit=limit,
        offset=offset,
        current_user=current_user,
        db=db,
    )


@alerts_router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get count of unread alerts",
)
def get_alerts_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnreadCountResponse:
    return get_unread_count(current_user=current_user, db=db)


@alerts_router.patch(
    "/{alert_id}/read",
    response_model=NotificationResponse,
    summary="Mark an alert as read",
)
def mark_alert_as_read(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    return mark_as_read(notification_id=alert_id, current_user=current_user, db=db)


@alerts_router.patch(
    "/mark-all-read",
    summary="Mark all visible alerts as read",
)
@alerts_router.patch(
    "/read-all",
    summary="Mark all visible alerts as read (alias)",
)
def mark_all_alerts_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return mark_all_as_read(current_user=current_user, db=db)


@alerts_router.patch(
    "/{alert_id}/dismiss",
    response_model=NotificationResponse,
    summary="Dismiss an alert",
)
@alerts_router.delete(
    "/{alert_id}",
    summary="Dismiss an alert via DELETE",
)
def dismiss_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return dismiss_notification(notification_id=alert_id, current_user=current_user, db=db)
