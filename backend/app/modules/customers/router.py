from fastapi import APIRouter, Depends
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import admin, member
from app.core.exceptions import fail
from app.modules.audit.service import record
from .models import Customer
from .schemas import CustomerInput, MemberStatusInput
from app.modules.auth.models import Member, Session
from .service import apply_customer

router = APIRouter()


def serialize(c):
    return {
        k: getattr(c, k)
        for k in ["id", "member_id", "name", "phone", "email", "notes", "version", "preferred_store"]
    }


@router.get("/admin/customers")
def listing(a=Depends(admin), db=Depends(get_db)):
    return {
        "data": [
            {**serialize(x), "member_status": db.get(Member, x.member_id).status if x.member_id else None}
            for x in db.scalars(select(Customer).order_by(Customer.name))
        ]
    }


@router.post("/admin/customers", status_code=201)
@router.patch("/admin/customers/{id}")
def save(
    payload: CustomerInput, id: str | None = None, a=Depends(admin), db=Depends(get_db)
):
    c = db.get(Customer, id) if id else Customer()
    if not c:
        fail("NOT_FOUND", "找不到客戶", 404)
    apply_customer(c, payload, bool(id))
    db.add(c)
    db.flush()
    record(db, a, "customer.save", c.id)
    db.commit()
    return {"data": serialize(c)}


@router.get("/me/profile")
def profile(m=Depends(member), db=Depends(get_db)):
    c = db.scalar(select(Customer).where(Customer.member_id == m.id))
    return {
        "data": {k: v for k, v in serialize(c).items() if k != "notes"}
        if c
        else {"name": m.display_name, "email": m.email, "phone": "", "version": 0}
    }


@router.patch("/me/profile")
def save_profile(payload: CustomerInput, m=Depends(member), db=Depends(get_db)):
    c = db.scalar(select(Customer).where(Customer.member_id == m.id).with_for_update())
    if payload.notes:
        fail("FORBIDDEN", "不能修改內部備註", 403)
    if c:
        # Internal notes are never overwritten by member input.
        notes = c.notes
        apply_customer(c, payload, True)
        c.notes = notes
    else:
        c = apply_customer(Customer(member_id=m.id), payload)
        db.add(c)
    db.commit()
    return {"data": {k: v for k, v in serialize(c).items() if k != "notes"}}


@router.patch("/admin/members/{id}")
def member_status(id: str, payload: MemberStatusInput, a=Depends(admin), db=Depends(get_db)):
    from sqlalchemy import update
    m = db.get(Member, id)
    if not m:
        fail("NOT_FOUND", "找不到會員", 404)
    m.status = payload.status
    if payload.status == "disabled":
        db.execute(update(Session).where(Session.kind == "member", Session.principal_id == id).values(revoked=True))
    record(db, a, "member.status", id, {"status": payload.status})
    db.commit()
    return {"data": {"id": m.id, "status": m.status}}


from pydantic import BaseModel
from app.modules.orders.schemas import Store as StoreInput

class PreferredStoreInput(BaseModel):
    store: StoreInput | None = None

@router.put("/me/preferred-store")
def preferred_store(payload: PreferredStoreInput, m=Depends(member), db=Depends(get_db)):
    if payload.store:
        import time
        from app.integrations.seven_eleven import cache
        if not any(s == payload.store.model_dump() for expiry, rows in cache.values() if expiry > time.monotonic() for s in rows):
            fail("VALIDATION_ERROR", "請重新查詢並選擇有效711門市")
    c = db.scalar(select(Customer).where(Customer.member_id == m.id).with_for_update())
    if not c:
        c = Customer(member_id=m.id, name=m.display_name, email=m.email)
        db.add(c)
    c.preferred_store = payload.store.model_dump() if payload.store else None
    c.version = (c.version or 0) + 1
    db.commit()
    return {"data": c.preferred_store}
