import secrets
from fastapi import Depends, Request
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.core.security import hash_token, cookie_name, now
from app.core.exceptions import fail


def check_origin(request):
    config = settings()
    allowed = {config.public_origin}
    if config.app_env == "local":
        allowed.update(x.strip() for x in config.local_allowed_origins.split(",") if x.strip())
    if request.headers.get("origin") not in allowed:
        fail("CSRF_INVALID", "來源驗證失敗", 403)


def resolve_session(request, db, kind, required=True):
    from app.modules.auth.models import Session, Admin, Member

    token = request.cookies.get(cookie_name(kind), "")
    session = (
        db.scalar(
            select(Session).where(
                Session.token_hash == hash_token(token),
                Session.kind == kind,
                Session.revoked.is_(False),
                Session.expires_at > now(),
            )
        )
        if token
        else None
    )
    cls = Admin if kind == "admin" else Member
    principal = db.get(cls, session.principal_id) if session else None
    if not principal or principal.status != "active":
        if required:
            fail(
                "AUTH_REQUIRED",
                "請先登入" if kind == "member" else "請登入管理後台",
                401,
            )
        return None, None
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        check_origin(request)
        if not secrets.compare_digest(
            hash_token(request.headers.get("x-csrf-token", "")), session.csrf_hash
        ):
            fail("CSRF_INVALID", "驗證已失效，請重新整理", 403)
    return principal, session


def admin(request: Request, db=Depends(get_db)):
    return resolve_session(request, db, "admin")[0]


def member(request: Request, db=Depends(get_db)):
    return resolve_session(request, db, "member")[0]
