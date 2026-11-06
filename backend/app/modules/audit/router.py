from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import admin
from .models import Audit

router = APIRouter()


@router.get("/admin/audit-logs")
def list_logs(a=Depends(admin), db=Depends(get_db)):
    return {
        "data": [
            {
                "id": row.id,
                "admin_id": row.admin_id,
                "action": row.action,
                "target_id": row.target_id,
                "created_at": row.created_at.isoformat(),
            }
            for row in db.scalars(
                select(Audit).order_by(Audit.created_at.desc()).limit(200)
            )
        ]
    }
