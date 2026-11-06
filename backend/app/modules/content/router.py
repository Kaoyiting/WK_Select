from fastapi import APIRouter, Depends
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import admin
from app.core.exceptions import fail
from app.modules.audit.service import record
from .models import SiteContent
from .schemas import ContentInput
from .service import validate_content

router = APIRouter()


@router.get("/site-content")
def public_content(db=Depends(get_db)):
    row = db.get(SiteContent, "main")
    return {
        "data": {
            k: v
            for k, v in (row.value if row else {}).items()
            if k != "ckeditorLicenseKey"
        }
    }


@router.get("/admin/site-content")
def content(a=Depends(admin), db=Depends(get_db)):
    row = db.get(SiteContent, "main")
    return {"data": {"value": row.value, "version": row.version}}


@router.patch("/admin/site-content")
def save(payload: ContentInput, a=Depends(admin), db=Depends(get_db)):
    row = db.scalar(
        select(SiteContent).where(SiteContent.key == "main").with_for_update()
    )
    if row.version != payload.expected_version:
        fail("VERSION_CONFLICT", "網站內容已修改，請重新載入", 409)
    row.value = validate_content(db, payload.value)
    row.version += 1
    record(db, a, "content.save")
    db.commit()
    return {"data": {"value": row.value, "version": row.version}}
