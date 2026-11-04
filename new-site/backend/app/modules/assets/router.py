from fastapi import APIRouter, UploadFile, Depends, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from pathlib import Path
from app.core.database import get_db
from app.core.dependencies import admin, resolve_session
from app.core.config import settings
from app.core.exceptions import fail
from .models import Asset
from .service import upload

router = APIRouter()
media_router = APIRouter()


@router.post("/admin/assets", status_code=201)
async def upload_asset(file: UploadFile, a=Depends(admin), db=Depends(get_db)):
    asset = upload(db, await file.read(5 * 1024 * 1024 + 1))
    return {
        "data": {
            "id": asset.id,
            "url": "/media/" + asset.id,
            "width": asset.width,
            "height": asset.height,
        }
    }


@media_router.api_route("/media/{id}", methods=["GET", "HEAD"])
def media(id: str, request: Request, db=Depends(get_db)):
    from app.modules.catalog.models import Product
    from app.modules.content.models import SiteContent

    asset = db.get(Asset, id)
    if not asset:
        fail("NOT_FOUND", "找不到圖片", 404)
    url = "/media/" + id
    published = any(
        url in p.gallery or ('src="' + url + '"') in p.size_guide_html or ('src="' + url + '"') in p.description_html
        for p in db.scalars(select(Product).where(Product.status == "published"))
    )
    c = db.get(SiteContent, "main")
    if c:
        published = (
            published
            or c.value.get("logoUrl") == url
            or any(
                s.get("image") == url and s.get("enabled", True)
                for s in c.value.get("heroSlides", [])
            )
        )
    if not published:
        a, _ = resolve_session(request, db, "admin", False)
        if not a:
            m, _ = resolve_session(request, db, "member", False)
            from app.modules.orders.models import Order, OrderItem
            owned = m and db.scalar(select(OrderItem.id).join(Order, Order.id == OrderItem.order_id).where(Order.member_id == m.id, OrderItem.image_url == url).limit(1))
            if not owned:
                fail("NOT_FOUND", "找不到圖片", 404)
    headers = {
        "Cache-Control": "public, max-age=3600" if published else "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if settings().storage_backend == "r2":
        from app.integrations.r2 import client

        obj = client().get_object(Bucket=settings().r2_bucket, Key=asset.object_key)
        return Response(
            obj["Body"].read() if request.method != "HEAD" else b"",
            media_type=asset.mime_type,
            headers=headers,
        )
    path = Path(settings().upload_dir) / (id + ".png")
    if not path.is_file():
        fail("NOT_FOUND", "圖片檔案不存在", 404)
    return FileResponse(path, media_type=asset.mime_type, headers=headers)
