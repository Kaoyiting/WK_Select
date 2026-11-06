"""HTTP endpoints for member ATM checkout and order-linked payment tests."""

from datetime import timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import admin, member
from app.core.exceptions import fail
from app.core.locks import order_lock
from app.core.security import now
from app.modules.audit.service import record
from app.modules.orders.models import Order
from app.modules.orders.service import serialize
from . import sandbox
from .models import Payment

router = APIRouter()


@router.get("/payments/options")
def payment_options():
    from .order_atm import enabled

    return {"data": {"atm_test_enabled": enabled() and bool(sandbox.callback_origin())}}


@router.post("/orders/{id}/atm-checkout")
def order_atm_checkout(
    id: str, request: Request, m=Depends(member), db=Depends(get_db)
):
    from .order_atm import prepare_checkout

    order = db.scalar(select(Order).where(Order.id == id, Order.member_id == m.id))
    if not order:
        fail("NOT_FOUND", "找不到訂單", 404)
    return {"data": prepare_checkout(db, order, request.headers["origin"])}


@router.get("/admin/payments/order-tests")
def order_tests(a=Depends(admin), db=Depends(get_db)):
    from .order_atm import require_order_testing

    require_order_testing()
    orders = db.scalars(
        select(Order)
        .where(Order.is_test.is_(True))
        .order_by(Order.created_at.desc())
        .limit(30)
    )
    return {"data": [serialize(order, db) for order in orders]}


@router.post("/admin/payments/order-tests/{id}/expire")
def expire_order_test(id: str, a=Depends(admin), db=Depends(get_db)):
    from .order_atm import expire_one, require_order_testing

    require_order_testing()
    order_lock(db, id)
    order = db.get(Order, id, populate_existing=True)
    if not order or not order.is_test or order.payment_method != "ecpay_atm_test":
        fail("NOT_FOUND", "Test order not found", 404)

    payment = db.scalar(select(Payment).where(Payment.order_id == id))
    if order.status not in {"pending", "confirmed"} or payment.status != "unpaid":
        fail("INVALID_TRANSITION", "Only unpaid pending test orders can expire", 409)

    order.payment_deadline = now() - timedelta(seconds=1)
    db.flush()
    try:
        expire_one(db, id)
    except Exception:
        db.rollback()
        fail(
            "PROVIDER_UNAVAILABLE",
            "Unable to verify ECPay status; no stock released. Retry later.",
            503,
        )
    record(db, a, "order.test.accelerate_expiry", id)
    db.commit()
    return {"data": serialize(order, db)}
