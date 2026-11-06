"""HTTP endpoints for recording real payment confirmations and refunds."""

from fastapi import APIRouter, Depends, Header

from app.core.database import get_db
from app.core.dependencies import admin
from app.modules.audit.service import record
from app.modules.orders.service import idempotent
from .schemas import PaymentAction
from .service import payment_action
from .order_atm_router import router as order_atm_router
from .sandbox_router import router as sandbox_router

router = APIRouter()


@router.post("/admin/payments/{id}/confirm")
def confirm(
    id: str,
    payload: PaymentAction,
    a=Depends(admin),
    db=Depends(get_db),
    idempotency_key: str = Header(default=""),
):
    def action():
        result = payment_action(db, id, payload)
        record(db, a, "payment.confirm", id, {"amount": payload.amount})
        return result

    return {
        "data": idempotent(
            db,
            a.id,
            "payment.confirm:" + id,
            idempotency_key,
            payload.model_dump(),
            action,
        )
    }


@router.post("/admin/payments/{id}/record-refund")
def refund(
    id: str,
    payload: PaymentAction,
    a=Depends(admin),
    db=Depends(get_db),
    idempotency_key: str = Header(default=""),
):
    def action():
        result = payment_action(db, id, payload, True)
        record(db, a, "payment.refund", id, {"amount": payload.amount})
        return result

    return {
        "data": idempotent(
            db,
            a.id,
            "payment.refund:" + id,
            idempotency_key,
            payload.model_dump(),
            action,
        )
    }


router.include_router(sandbox_router)
router.include_router(order_atm_router)
