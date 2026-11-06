"""HTTP endpoints for isolated local and ECPay stage payment exercises."""

from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import admin
from app.core.exceptions import fail
from app.modules.audit.service import record
from app.modules.orders.service import idempotent
from . import sandbox
from .models import AtmSandboxTransaction
from .schemas import AtmSandboxEvent, AtmSandboxInput

router = APIRouter()


@router.get("/admin/payments/sandbox")
def sandbox_list(a=Depends(admin), db=Depends(get_db)):
    sandbox.require_sandbox()
    transactions = db.scalars(
        select(AtmSandboxTransaction)
        .where(AtmSandboxTransaction.order_id.is_(None))
        .order_by(AtmSandboxTransaction.created_at.desc())
        .limit(30)
    )
    return {
        "data": {
            "stage_ready": bool(sandbox.callback_origin()),
            "transactions": [sandbox.serialize(t) for t in transactions],
        }
    }


@router.post("/admin/payments/sandbox", status_code=201)
def sandbox_create(
    payload: AtmSandboxInput,
    a=Depends(admin),
    db=Depends(get_db),
    idempotency_key: str = Header(default=""),
):
    sandbox.require_sandbox()

    def action():
        transaction = sandbox.create(db, a, payload)
        record(db, a, "payment.sandbox.create", transaction.id)
        return sandbox.serialize(transaction)

    return {
        "data": idempotent(
            db,
            a.id,
            "payment.sandbox.create",
            idempotency_key,
            payload.model_dump(),
            action,
        )
    }


def sandbox_transaction(db, transaction_id):
    transaction = db.scalar(
        select(AtmSandboxTransaction)
        .where(AtmSandboxTransaction.id == transaction_id)
        .with_for_update()
    )
    if not transaction:
        fail("NOT_FOUND", "找不到測試交易", 404)
    return transaction


@router.post("/admin/payments/sandbox/{id}/simulate")
def sandbox_simulate(
    id: str,
    payload: AtmSandboxEvent,
    a=Depends(admin),
    db=Depends(get_db),
):
    sandbox.require_sandbox()
    transaction = sandbox.simulate(
        db, sandbox_transaction(db, id), payload.event
    )
    record(db, a, "payment.sandbox.simulate." + payload.event, transaction.id)
    db.commit()
    return {"data": sandbox.serialize(transaction)}


@router.post("/admin/payments/sandbox/{id}/checkout")
def sandbox_checkout(id: str, a=Depends(admin), db=Depends(get_db)):
    sandbox.require_sandbox()
    transaction = sandbox_transaction(db, id)
    if transaction.order_id:
        fail("TEST_ORDER", "Use the member order checkout", 409)
    if transaction.status != "created":
        fail("INVALID_TRANSITION", "請建立新的測試交易以進行綠界取號", 409)

    result = sandbox.checkout(transaction)
    transaction.source = "ecpay_stage"
    record(db, a, "payment.sandbox.checkout", transaction.id)
    db.commit()
    return {"data": result}


async def sandbox_callback(request: Request, db, kind: str):
    sandbox.require_sandbox()
    # Provider callbacks have no browser session or CSRF token; their signature is checked below.
    if not request.headers.get("content-type", "").startswith(
        "application/x-www-form-urlencoded"
    ):
        fail("VALIDATION_ERROR", "通知格式不符", 400)

    body = await request.body()
    if len(body) > 16384:
        fail("VALIDATION_ERROR", "通知過大", 413)
    try:
        pairs = parse_qsl(
            body.decode("utf-8"), keep_blank_values=True, max_num_fields=100
        )
    except (UnicodeError, ValueError):
        fail("VALIDATION_ERROR", "通知格式不符", 400)
    fields = dict(pairs)
    if len(pairs) != len(fields):
        fail("VALIDATION_ERROR", "通知欄位重複", 400)

    transaction = sandbox.receive(db, fields, kind, "ecpay_stage")
    record(db, None, "payment.sandbox.callback." + kind, transaction.id)
    db.commit()
    return PlainTextResponse("1|OK")


@router.post("/payments/sandbox/ecpay/info")
async def sandbox_info(request: Request, db=Depends(get_db)):
    return await sandbox_callback(request, db, "info")


@router.post("/payments/sandbox/ecpay/notify")
async def sandbox_notify(request: Request, db=Depends(get_db)):
    return await sandbox_callback(request, db, "notify")
