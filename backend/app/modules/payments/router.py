from fastapi import APIRouter, Depends, Header
from app.core.database import get_db
from app.core.dependencies import admin, member
from app.modules.orders.service import idempotent
from app.modules.audit.service import record
from .schemas import PaymentAction
from .service import payment_action

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


# Sandbox records cannot reference real orders or payments.
from fastapi import Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from . import sandbox
from .models import AtmSandboxTransaction
from .schemas import AtmSandboxInput, AtmSandboxEvent
from app.core.exceptions import fail


@router.get("/admin/payments/sandbox")
def sandbox_list(a=Depends(admin), db=Depends(get_db)):
    sandbox.require_sandbox()
    return {"data":{"stage_ready":bool(sandbox.callback_origin()),"transactions":[sandbox.serialize(t) for t in db.scalars(select(AtmSandboxTransaction).where(AtmSandboxTransaction.order_id.is_(None)).order_by(AtmSandboxTransaction.created_at.desc()).limit(30))]}}


@router.post("/admin/payments/sandbox",status_code=201)
def sandbox_create(payload:AtmSandboxInput,a=Depends(admin),db=Depends(get_db),idempotency_key:str=Header(default="")):
    sandbox.require_sandbox()
    def action():
        t=sandbox.create(db,a,payload)
        record(db,a,"payment.sandbox.create",t.id)
        return sandbox.serialize(t)
    return {"data":idempotent(db,a.id,"payment.sandbox.create",idempotency_key,payload.model_dump(),action)}


def sandbox_transaction(db,id):
    t=db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.id==id).with_for_update())
    if not t:
        fail("NOT_FOUND","找不到測試交易",404)
    return t


@router.post("/admin/payments/sandbox/{id}/simulate")
def sandbox_simulate(id:str,payload:AtmSandboxEvent,a=Depends(admin),db=Depends(get_db)):
    sandbox.require_sandbox()
    t=sandbox.simulate(db,sandbox_transaction(db,id),payload.event)
    record(db,a,"payment.sandbox.simulate."+payload.event,t.id)
    db.commit()
    return {"data":sandbox.serialize(t)}


@router.post("/admin/payments/sandbox/{id}/checkout")
def sandbox_checkout(id:str,a=Depends(admin),db=Depends(get_db)):
    sandbox.require_sandbox()
    t=sandbox_transaction(db,id)
    if t.order_id:
        fail("TEST_ORDER","Use the member order checkout",409)
    if t.status!="created":
        fail("INVALID_TRANSITION","請建立新的測試交易以進行綠界取號",409)
    result=sandbox.checkout(t)
    t.source="ecpay_stage"
    record(db,a,"payment.sandbox.checkout",t.id)
    db.commit()
    return {"data":result}


async def sandbox_callback(request,db,kind):
    sandbox.require_sandbox()
    # No session/CSRF on server callbacks; validate the provider signature instead.
    if not request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
        fail("VALIDATION_ERROR","通知格式不符",400)
    body=await request.body()
    if len(body)>16384:
        fail("VALIDATION_ERROR","通知過大",413)
    from urllib.parse import parse_qsl
    try:
        pairs=parse_qsl(body.decode("utf-8"),keep_blank_values=True,max_num_fields=100)
    except (UnicodeError,ValueError):
        fail("VALIDATION_ERROR","通知格式不符",400)
    fields=dict(pairs)
    if len(pairs)!=len(fields):
        fail("VALIDATION_ERROR","通知欄位重複",400)
    t=sandbox.receive(db,fields,kind,"ecpay_stage")
    record(db,None,"payment.sandbox.callback."+kind,t.id)
    db.commit()
    return PlainTextResponse("1|OK")


@router.post("/payments/sandbox/ecpay/info")
async def sandbox_info(request:Request,db=Depends(get_db)):
    return await sandbox_callback(request,db,"info")


@router.post("/payments/sandbox/ecpay/notify")
async def sandbox_notify(request:Request,db=Depends(get_db)):
    return await sandbox_callback(request,db,"notify")


@router.get("/payments/options")
def payment_options():
    from .order_atm import enabled
    return {"data":{"atm_test_enabled":enabled() and bool(sandbox.callback_origin())}}


@router.post("/orders/{id}/atm-checkout")
def order_atm_checkout(id:str,request:Request,m=Depends(member),db=Depends(get_db)):
    from app.modules.orders.models import Order
    from .order_atm import prepare_checkout
    o=db.scalar(select(Order).where(Order.id==id,Order.member_id==m.id))
    if not o:
        fail("NOT_FOUND","找不到訂單",404)
    return {"data":prepare_checkout(db,o,request.headers["origin"])}


@router.get("/admin/payments/order-tests")
def order_tests(a=Depends(admin),db=Depends(get_db)):
    from .order_atm import require_order_testing
    from app.modules.orders.models import Order
    from app.modules.orders.service import serialize
    require_order_testing()
    return {"data":[serialize(o,db) for o in db.scalars(select(Order).where(Order.is_test.is_(True)).order_by(Order.created_at.desc()).limit(30))]}


@router.post("/admin/payments/order-tests/{id}/expire")
def expire_order_test(id:str,a=Depends(admin),db=Depends(get_db)):
    from datetime import timedelta
    from .order_atm import require_order_testing,expire_one
    from app.core.security import now
    from app.core.locks import order_lock
    from app.modules.orders.models import Order
    from app.modules.orders.service import serialize
    from .models import Payment
    require_order_testing()
    order_lock(db,id)
    o=db.get(Order,id,populate_existing=True)
    if not o or not o.is_test or o.payment_method!="ecpay_atm_test":
        fail("NOT_FOUND","Test order not found",404)
    p=db.scalar(select(Payment).where(Payment.order_id==id))
    if o.status not in {"pending","confirmed"} or p.status!="unpaid":
        fail("INVALID_TRANSITION","Only unpaid pending test orders can expire",409)
    o.payment_deadline=now()-timedelta(seconds=1)
    db.flush()
    try:
        expire_one(db,id)
    except Exception:
        db.rollback()
        fail("PROVIDER_UNAVAILABLE","Unable to verify ECPay status; no stock released. Retry later.",503)
    record(db,a,"order.test.accelerate_expiry",id)
    db.commit()
    return {"data":serialize(o,db)}
