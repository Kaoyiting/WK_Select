import hashlib
from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit
from PIL import Image, UnidentifiedImageError
from app.core.config import settings
from app.core.exceptions import fail
from app.modules.auth.models import uid
from .models import Asset

Image.MAX_IMAGE_PIXELS = 40000000


def validate_image_url(db, value):
    if value.startswith("assets/"):
        value = "/" + value  # Original website uses relative static asset paths.
    if len(value) > 1600:
        fail("INVALID_IMAGE", "圖片路徑過長")
    if value.startswith("/assets/") and ".." not in value and "\\" not in value:
        return
    if value.startswith("/media/"):
        id = value.removeprefix("/media/")
        if db.get(Asset, id):
            return
    # Existing externally hosted product photos remain references, never fetched by arbitrary URL.
    if (
        urlsplit(value).scheme == "https"
        and urlsplit(value).hostname == "myship.7-11.com.tw"
    ):
        return
    fail("INVALID_IMAGE", "請上傳圖片，不能儲存本機或任意外部路徑")


def upload(db, raw):
    if len(raw) > 5 * 1024 * 1024:
        fail("UPLOAD_TOO_LARGE", "每張圖片最大5MB", 413)
    try:
        with Image.open(BytesIO(raw)) as img:
            width, height = img.size
            if width * height > 40000000 or img.format not in {
                "JPEG",
                "PNG",
                "WEBP",
                "GIF",
            }:
                raise ValueError()
            img.verify()
        # Re-encode to remove metadata and ambiguous/polyglot file payloads.
        with Image.open(BytesIO(raw)) as img:
            buf = BytesIO()
            img.convert("RGBA").save(buf, format="PNG")
            body = buf.getvalue()
    except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError):
        fail("INVALID_IMAGE", "無法讀取圖片或圖片尺寸過大")
    if len(body) > 20 * 1024 * 1024:
        fail("UPLOAD_TOO_LARGE", "圖片解碼後過大", 413)
    id = uid()
    key = f"{settings().app_env}/shops/wk-select/{id}.png"
    if settings().storage_backend == "r2":
        from app.integrations.r2 import client

        client().put_object(
            Bucket=settings().r2_bucket, Key=key, Body=body, ContentType="image/png"
        )
    else:
        folder = Path(settings().upload_dir)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / (id + ".png")).write_bytes(body)
    asset = Asset(
        id=id,
        object_key=key,
        mime_type="image/png",
        byte_size=len(body),
        width=width,
        height=height,
        sha256=hashlib.sha256(body).hexdigest(),
    )
    db.add(asset)
    db.commit()
    return asset
