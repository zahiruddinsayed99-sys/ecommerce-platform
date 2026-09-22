from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.database.session import get_db
from app.modules.auth.dependencies import require_admin
from app.modules.auth.models.user import User
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone
import uuid

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    created_at: datetime.datetime
    role: str

    class Config:
        from_attributes = True

admin_user_router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin Users"])

@admin_user_router.get("", response_model=List[UserResponse], dependencies=[Depends(require_admin)])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).options(joinedload(User.role)).all()
    return [
UserResponse(
        id=str(u.id),
        email=u.email,
        is_active=getattr(u, "is_active", True),
        created_at=(
            getattr(u, "created_at").isoformat()
            if getattr(u, "created_at", None) is not None
            else datetime.now(timezone.utc).isoformat()
        ),
        role=u.role.name if getattr(u, "role", None) else "UNKNOWN"
    )
    for u in users
    ]
