from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select, update
from app.core.database import get_db
from app.core.dependencies import admin, member, resolve_session, check_origin
from app.core.security import (
    issue_session,
    cookie_name,
    password_hasher,
    verify_password,
)
from app.core.config import settings
from app.core.exceptions import fail
from .models import Member, Session
from .schemas import Login, ChangePassword, MemberLogin, MemberRegister
from .service import authenticate, member_credentials

router = APIRouter()


@router.post("/admin/auth/login")
def login(payload: Login, request: Request, response: Response, db=Depends(get_db)):
    check_origin(request)
    principal = authenticate(db, payload, request.client.host)
    csrf = issue_session(db, response, principal, "admin")
    db.commit()
    return {
        "data": {
            "authenticated": True,
            "username": principal.username,
            "csrf_token": csrf,
        }
    }


@router.get("/admin/auth/session")
def admin_session(request: Request, db=Depends(get_db)):
    p, s = resolve_session(request, db, "admin", False)
    return {
        "data": {
            "authenticated": bool(p),
            "username": p.username if p else "",
            "csrf_token": s.csrf_token if s else "",
        }
    }


@router.get("/auth/session")
def member_session(request: Request, db=Depends(get_db)):
    p, s = resolve_session(request, db, "member", False)
    return {
        "data": {
            "authenticated": bool(p),
            "name": p.display_name if p else "",
            "email": p.email if p else "",
            "csrf_token": s.csrf_token if s else "",
            "google_configured": bool(settings().google_client_id),
        }
    }


@router.post("/admin/auth/logout", status_code=204)
def admin_logout(
    request: Request, response: Response, p=Depends(admin), db=Depends(get_db)
):
    _, s = resolve_session(request, db, "admin")
    s.revoked = True
    db.commit()
    response.delete_cookie(cookie_name("admin"), path="/")


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, p=Depends(member), db=Depends(get_db)):
    _, s = resolve_session(request, db, "member")
    s.revoked = True
    db.commit()
    response.delete_cookie(cookie_name("member"), path="/")


@router.post("/admin/auth/change-password", status_code=204)
def change_password(payload: ChangePassword, p=Depends(admin), db=Depends(get_db)):
    if not verify_password(p.password_hash, payload.current_password):
        fail("INVALID_CREDENTIALS", "目前密碼錯誤", 401)
    p.password_hash = password_hasher.hash(payload.new_password)
    db.execute(
        update(Session)
        .where(Session.kind == "admin", Session.principal_id == p.id)
        .values(revoked=True)
    )
    db.commit()


@router.get("/auth/google/start")
async def google_start(request: Request):
    if not settings().google_client_id or not settings().google_client_secret:
        fail(
            "INTEGRATION_NOT_CONFIGURED", "尚未設定Google登入，請店主完成OAuth設定", 503
        )
    from app.integrations.google import oauth

    return await oauth.google.authorize_redirect(
        request, settings().public_origin + "/api/v1/auth/google/callback"
    )


@router.get("/auth/google/callback")
async def google_callback(request: Request, db=Depends(get_db)):
    from app.integrations.google import oauth

    try:
        token = await oauth.google.authorize_access_token(request)
        info = token["userinfo"]
        if not info.get("sub") or not info.get("email_verified"):
            raise ValueError("unverified identity")
    except Exception:
        return RedirectResponse("/#member?error=oauth", status_code=303)
    p = db.scalar(select(Member).where(Member.google_sub == info["sub"]))
    if not p:
        p = Member(
            google_sub=info["sub"],
            email=info.get("email", ""),
            display_name=info.get("name", ""),
        )
        db.add(p)
        db.flush()
    if p.status != "active":
        return RedirectResponse("/#member?error=disabled", status_code=303)
    from app.modules.customers.models import Customer

    if not db.scalar(select(Customer.id).where(Customer.member_id == p.id)):
        db.add(
            Customer(member_id=p.id, name=p.display_name or "Google會員", email=p.email)
        )
    response = RedirectResponse("/#member", status_code=303)
    issue_session(db, response, p, "member")
    db.commit()
    return response


@router.post("/auth/register", status_code=201)
def register_member(payload: MemberRegister, request: Request, response: Response, db=Depends(get_db)):
    check_origin(request)
    p = member_credentials(db, payload, request.client.host, register=True)
    csrf = issue_session(db, response, p, "member")
    db.commit()
    return {"data": {"authenticated": True, "name": p.display_name, "email": p.email, "csrf_token": csrf, "google_configured": bool(settings().google_client_id)}}


@router.post("/auth/login")
def login_member(payload: MemberLogin, request: Request, response: Response, db=Depends(get_db)):
    check_origin(request)
    p = member_credentials(db, payload, request.client.host)
    csrf = issue_session(db, response, p, "member")
    db.commit()
    return {"data": {"authenticated": True, "name": p.display_name, "email": p.email, "csrf_token": csrf, "google_configured": bool(settings().google_client_id)}}
