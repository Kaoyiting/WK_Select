from datetime import timedelta
from sqlalchemy import select
from app.modules.auth.models import Admin, LoginAttempt
from app.core.security import password_hasher, verify_password, hash_token, now
from app.core.exceptions import fail

# Dummy hash keeps a nonexistent account on the same password verification path.
DUMMY_HASH = password_hasher.hash("not-an-account-" + hash_token("dummy"))


def authenticate(db, payload, source):
    key = hash_token(source + ":" + payload.username.casefold())
    attempt = db.get(LoginAttempt, key)
    if (
        attempt
        and attempt.window_at > now() - timedelta(minutes=15)
        and attempt.count >= 8
    ):
        fail("RATE_LIMITED", "登入嘗試過多，請15分鐘後再試", 429)
    principal = db.scalar(
        select(Admin).where(Admin.username == payload.username.casefold())
    )
    valid = verify_password(
        principal.password_hash if principal else DUMMY_HASH, payload.password
    )
    if not valid or not principal or principal.status != "active":
        if not attempt:
            attempt = LoginAttempt(key=key, count=0, window_at=now())
            db.add(attempt)
        if attempt.window_at < now() - timedelta(minutes=15):
            attempt.count = 0
            attempt.window_at = now()
        attempt.count += 1
        db.commit()
        fail("INVALID_CREDENTIALS", "帳號或密碼錯誤", 401)
    if attempt:
        db.delete(attempt)
    return principal


def member_credentials(db, payload, source, register=False):
    from .models import Member
    from app.modules.customers.models import Customer
    from sqlalchemy.exc import IntegrityError
    email = payload.email.strip().casefold()
    key = hash_token("member:" + source + ":" + email)
    attempt = db.get(LoginAttempt, key)
    if attempt and attempt.window_at > now() - timedelta(minutes=15) and attempt.count >= 8:
        fail("RATE_LIMITED", "嘗試過多，請15分鐘後再試", 429)
    if not attempt:
        attempt = LoginAttempt(key=key, count=0, window_at=now())
        db.add(attempt)
    if attempt.window_at < now() - timedelta(minutes=15):
        attempt.count = 0
        attempt.window_at = now()
    attempt.count += 1
    db.commit()
    p = db.scalar(select(Member).where(Member.login_email == email))
    if register:
        # Do not attach an unverified email/password to an existing Google identity.
        if p or db.scalar(select(Member.id).where(Member.email == email)):
            fail("ACCOUNT_EXISTS", "此電子郵件已註冊，請使用原登入方式", 409)
        p = Member(login_email=email, email=email, display_name=payload.name.strip(), password_hash=password_hasher.hash(payload.password))
        if not p.display_name:
            fail("VALIDATION_ERROR", "請填寫姓名")
        db.add(p)
        try:
            db.flush()
            db.add(Customer(member_id=p.id, name=p.display_name, email=email))
        except IntegrityError:
            db.rollback()
            fail("ACCOUNT_EXISTS", "此電子郵件已註冊", 409)
    elif not verify_password(p.password_hash if p and p.password_hash else DUMMY_HASH, payload.password) or not p or p.status != "active":
        fail("INVALID_CREDENTIALS", "電子郵件或密碼錯誤", 401)
    if not register:
        db.delete(attempt)
    return p
