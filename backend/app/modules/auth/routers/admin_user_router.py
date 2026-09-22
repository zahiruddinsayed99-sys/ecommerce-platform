import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.modules.auth.dependencies import require_admin
from app.modules.auth.models.user import User


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    created_at: str  # Frontend ISO string expect kar raha hai
    role: str

    model_config = ConfigDict(from_attributes=True)


def resolve_created_at(user) -> str:
    """Safely extracts created_at from user model or falls back to current UTC ISO timestamp."""
    raw_val = getattr(user, "created_at", None)
    if isinstance(raw_val, datetime):
        return raw_val.isoformat()
    elif isinstance(raw_val, str):
        return raw_val
    return datetime.now(timezone.utc).isoformat()


admin_user_router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin Users"])


@admin_user_router.get("", response_model=List[UserResponse], dependencies=[Depends(require_admin)])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).options(joinedload(User.role)).all()
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            is_active=getattr(u, "is_active", True),
            created_at=resolve_created_at(u),
            role=u.role.name if getattr(u, "role", None) else "UNKNOWN"
        )
        for u in users
    ]