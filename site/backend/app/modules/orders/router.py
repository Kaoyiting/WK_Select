from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import member, admin
from app.core.exceptions import fail
from app.modules.audit.service import record
from app.integrations.seven_eleven import stores, towns
from .models import Order
from .schemas import OrderInput, Transition, ShipmentInput
from .service import create_order, idempotent, serialize, transition, ship

router = APIRouter()


@router.get("/shipping/711-stores")
async def store_list(city: str, town: str = ""):
    return {"data": await stores(city, town)}


@router.get("/shipping/711-towns")
async def town_list(city: str):
    return {"data": await towns(city)}


@router.post("/orders", status_code=201)
async def create(
    payload: OrderInput,
    m=Depends(member),
    db=Depends(get_db),
    idempotency_key: str = Header(default=""),
):
    # Store must come from a recent server-side verified city lookup, not arbitrary form text.
    from app.integrations.seven_eleven import cache
    import time

    valid = any(
        s == payload.store.model_dump()
        for expiry, rows in cache.values()
        if expiry > time.monotonic()
        for s in rows
    )
    from app.modules.customers.models import Customer
    customer = db.scalar(select(Customer).where(Customer.member_id == m.id))
    valid = valid or bool(customer and customer.preferred_store == payload.store.model_dump())
    if not valid:
        fail("VALIDATION_ERROR", "請重新查詢並選擇有效711門市")
    return {
        "data": idempotent(
            db,
            m.id,
            "create_order",
            idempotency_key,
            payload.model_dump(),
            lambda: create_order(db, m, payload),
        )
    }


@router.get("/orders")
def mine(m=Depends(member), db=Depends(get_db)):
    return {
        "data": [
            serialize(o, db)
            for o in db.scalars(
                select(Order)
                .where(Order.member_id == m.id)
                .order_by(Order.created_at.desc())
            )
        ]
    }


@router.get("/orders/{id}")
def detail(id: str, m=Depends(member), db=Depends(get_db)):
    o = db.scalar(select(Order).where(Order.id == id, Order.member_id == m.id))
    if not o:
        fail("NOT_FOUND", "找不到訂單", 404)
    return {"data": serialize(o, db)}


@router.get("/admin/orders")
def all_orders(a=Depends(admin), db=Depends(get_db)):
    return {
        "data": [
            serialize(o, db)
            for o in db.scalars(select(Order).order_by(Order.created_at.desc()))
        ]
    }


@router.post("/admin/orders/{id}/transition")
def change(id: str, payload: Transition, a=Depends(admin), db=Depends(get_db)):
    o = transition(db, id, payload)
    record(db, a, "order." + payload.to_status, id, {"reason": payload.reason})
    db.commit()
    return {"data": serialize(o, db)}


@router.post("/admin/orders/{id}/shipment", status_code=201)
def shipment(id: str, payload: ShipmentInput, a=Depends(admin), db=Depends(get_db)):
    o = ship(db, id, payload, a)
    record(db, a, "order.ship", id)
    db.commit()
    return {"data": serialize(o, db)}
