import logging, uuid
from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.database import get_db
from app.modules.auth.router import router as auth
from app.modules.catalog.router import router as catalog
from app.modules.content.router import router as content
from app.modules.assets.router import router as assets, media_router
from app.modules.customers.router import router as customers
from app.modules.requests.router import router as requests
from app.modules.orders.router import router as orders
from app.modules.payments.router import router as payments
from app.modules.audit.router import router as audit

app = FastAPI(
    title="WK.SELECT API",
    version="0.1.0",
    docs_url="/api/docs" if settings().app_env != "production" else None,
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings().session_secret,
    session_cookie="wk_oauth_flow",
    https_only=settings().secure_cookie,
    same_site="lax",
    max_age=600,
)
for router in [
    auth,
    catalog,
    content,
    assets,
    customers,
    requests,
    orders,
    payments,
    audit,
]:
    app.include_router(router, prefix="/api/v1")
app.include_router(media_router)


@app.middleware("http")
async def trace(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    try:
        response = await call_next(request)
    except Exception:
        logging.exception("request failed id=%s", request.state.request_id)
        response = JSONResponse(
            {
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "系統暫時無法處理，請稍後再試",
                },
                "request_id": request.state.request_id,
            },
            500,
        )
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


from fastapi import HTTPException


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    detail = (
        exc.detail
        if isinstance(exc.detail, dict)
        else {"code": "HTTP_ERROR", "message": str(exc.detail)}
    )
    return JSONResponse(
        {"error": detail, "request_id": getattr(request.state, "request_id", "")},
        exc.status_code,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Do not echo rejected password/contact payloads.
    return JSONResponse(
        {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "欄位格式不正確，請檢查必填資料",
                "fields": [".".join(map(str, e["loc"])) for e in exc.errors()],
            },
            "request_id": getattr(request.state, "request_id", ""),
        },
        422,
    )


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(
        {"error": {"code": "RESOURCE_IN_USE", "message": "資料重複或仍有其他資料引用"}},
        409,
    )


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready(db=Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
