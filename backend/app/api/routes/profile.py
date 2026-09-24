import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user, get_db
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
    ChangePasswordRequest,
)

logger = logging.getLogger("app.api.routes.profile")

router = APIRouter(prefix="/profile", tags=["User Profile"])


@router.get(
    "/me",
    response_model=ProfileResponse,
    summary="Get current user profile",
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    """Retrieves the profile of the currently authenticated user from the database."""
    return current_user


@router.put(
    "/me",
    response_model=ProfileResponse,
    summary="Update current user profile",
)
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Updates editable profile information for the authenticated user in PostgreSQL."""
    updated_fields = {}

    if payload.full_name is not None:
        trimmed_name = payload.full_name.strip()
        if trimmed_name != current_user.full_name:
            current_user.full_name = trimmed_name
            updated_fields["full_name"] = trimmed_name

    if payload.department is not None:
        trimmed_dept = payload.department.strip() if payload.department.strip() else None
        if trimmed_dept != current_user.department:
            current_user.department = trimmed_dept
            updated_fields["department"] = trimmed_dept

    if payload.designation is not None:
        trimmed_desig = payload.designation.strip() if payload.designation.strip() else None
        if trimmed_desig != current_user.designation:
            current_user.designation = trimmed_desig
            updated_fields["designation"] = trimmed_desig

    if payload.phone is not None:
        trimmed_phone = payload.phone.strip() if payload.phone.strip() else None
        if trimmed_phone != current_user.phone:
            current_user.phone = trimmed_phone
            updated_fields["phone"] = trimmed_phone

    if payload.office_location is not None:
        trimmed_loc = payload.office_location.strip() if payload.office_location.strip() else None
        if trimmed_loc != current_user.office_location:
            current_user.office_location = trimmed_loc
            updated_fields["office_location"] = trimmed_loc

    if payload.organization_name is not None:
        trimmed_org = payload.organization_name.strip() if payload.organization_name.strip() else None
        if trimmed_org != current_user.organization_name:
            current_user.organization_name = trimmed_org
            updated_fields["organization_name"] = trimmed_org

    if payload.avatar_url is not None:
        trimmed_avatar = payload.avatar_url.strip() if payload.avatar_url.strip() else None
        if trimmed_avatar != current_user.avatar_url:
            current_user.avatar_url = trimmed_avatar
            updated_fields["avatar_url"] = trimmed_avatar

    if updated_fields:
        current_user.updated_at = func.now()
        try:
            audit = AuditLog(
                actor_user_id=current_user.id,
                actor_email=current_user.email,
                action="UPDATE_PROFILE",
                entity_type="user",
                entity_id=str(current_user.id),
                metadata_json=json.dumps({"updated_fields": list(updated_fields.keys())}),
            )
            db.add(audit)
            db.commit()
            db.refresh(current_user)
            logger.info(f"Profile updated successfully for user {current_user.email}: {list(updated_fields.keys())}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update profile for user {current_user.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile due to an internal database error.",
            )

    return current_user


@router.post(
    "/change-password",
    summary="Change current user password",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Securely updates the authenticated user's password after verifying the current password."""
    # 1. Verify current password
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect. Please verify your current password and try again.",
        )

    # 2. Check that new password is not identical to current password
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )

    # 3. Hash and store new password securely
    try:
        new_hash = hash_password(payload.new_password)
        current_user.password_hash = new_hash
        current_user.updated_at = func.now()

        audit = AuditLog(
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            action="CHANGE_PASSWORD",
            entity_type="user",
            entity_id=str(current_user.id),
            metadata_json=json.dumps({"status": "success"}),
        )
        db.add(audit)
        db.commit()
        logger.info(f"Password changed successfully for user {current_user.email}")
        return {"message": "Password changed successfully."}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to change password for user {current_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password due to an internal database error.",
        )
