from fastapi import APIRouter, Depends
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import admin
from app.core.exceptions import fail
from app.modules.audit.service import record
from app.modules.customers.models import Customer
from app.modules.catalog.models import Product
from app.modules.orders.models import Order
from .models import PurchaseRequest
from .schemas import RequestInput
from .service import apply_request

router = APIRouter()


def serialize(x):
    return {c.name: getattr(x, c.name) for c in PurchaseRequest.__table__.columns if c.name != "tenant_id"}


@router.get("/admin/purchase-requests")
def listing(a=Depends(admin), db=Depends(get_db)):
    return {"data": [serialize(x) for x in db.scalars(select(PurchaseRequest))]}


@router.post("/admin/purchase-requests", status_code=201)
@router.patch("/admin/purchase-requests/{id}")
def save(
    payload: RequestInput, id: str | None = None, a=Depends(admin), db=Depends(get_db)
):
    for key, cls in [
        ("customer_id", Customer),
        ("product_id", Product),
        ("order_id", Order),
    ]:
        value = getattr(payload, key)
        if value and not db.get(cls, value):
            fail("VALIDATION_ERROR", "關聯資料不存在")
    x = db.get(PurchaseRequest, id) if id else PurchaseRequest()
    if not x:
        fail("NOT_FOUND", "找不到需求", 404)
    apply_request(x, payload, bool(id))
    db.add(x)
    db.flush()
    record(db, a, "request.save", x.id)
    db.commit()
    return {"data": serialize(x)}
