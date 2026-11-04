import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from app.core.config import settings

password_hasher = PasswordHasher()


def hash_token(value):
    return hashlib.sha256(value.encode()).hexdigest()


def now():
    return datetime.now(timezone.utc)


def verify_password(encoded, password):
    try:
        return password_hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False


def cookie_name(kind):
    prefix = "__Host-" if settings().secure_cookie else ""
    return prefix + "wk_" + kind + "_session"


def issue_session(db, response, principal, kind):
    from app.modules.auth.models import Session

    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    db.add(
        Session(
            kind=kind,
            principal_id=principal.id,
            token_hash=hash_token(token),
            csrf_hash=hash_token(csrf),
            csrf_token=csrf,
            expires_at=now() + timedelta(hours=settings().session_hours),
        )
    )
    response.set_cookie(
        cookie_name(kind),
        token,
        httponly=True,
        secure=settings().secure_cookie,
        samesite="lax",
        path="/",
        max_age=settings().session_hours * 3600,
    )
    return csrf
