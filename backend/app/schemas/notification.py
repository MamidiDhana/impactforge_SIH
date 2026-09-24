from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
    type: str = Field(default="system")
    title: str
    message: str
    related_track_id: Optional[str] = None
    related_entity_id: Optional[str] = None
    action_url: Optional[str] = None
    priority: str = Field(default="Normal")
    event_key: Optional[str] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    role: Optional[str] = None
    type: str
    title: str
    message: str
    related_track_id: Optional[str] = None
    related_entity_id: Optional[str] = None
    action_url: Optional[str] = None
    priority: str
    is_read: bool
    read_at: Optional[datetime] = None
    is_dismissed: bool
    event_key: Optional[str] = None
    created_at: datetime


class UnreadCountResponse(BaseModel):
    unread_count: int
