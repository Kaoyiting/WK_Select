import hashlib, json, secrets
from collections import defaultdict
from sqlalchemy import select, text
from app.core.exceptions import fail
from app.core.security import now
from app.modules.catalog.models import Product, Variant
from app.modules.content.models import SiteContent
from app.modules.payments.models import Payment
from app.core.locks import order_lock
from .models import Order, OrderItem, Shipment, Idempotency


def serialize(o, db):
    payment = db.scalar(select(Payment).where(Payment.order_id == o.id))
    shipment = db.scalar(select(Shipment).where(Shipment.order_id == o.id))
    return {
        **{
            k: getattr(o, k)
            for k in [
                "id",
                "order_number",
                "status",
                "subtotal_amount",
                "shipping_amount",
                "total_amount",
                "receiver",
                "store",
                "shipping_method",
                "payment_method",
                "note",
                "version",
            ]
        },
        "is_test": o.is_test,
        "payment_deadline": o.payment_deadline.isoformat() if o.payment_deadline else None,
        "atm": atm_details(o, db),
        "created_at": o.created_at.isoformat(),
        "items": [
            {
                k: getattr(i, k)
                for k in [
                    "id",
                    "product_id",
                    "variant_id",
                    "title",
                    "image_url",
                    "color",
                    "size",
                    "kind",
                    "quantity",
                    "unit_amount",
                ]
            }
            for i in o.items
        ],
        "payment": {
            **{
            k: getattr(payment, k)
            for k in [
                "id",
                "status",
                "amount",
                "refunded_amount",
                "reference",
                "version",
            ]
        },
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        }
        if payment
        else None,
        "tracking_number": shipment.tracking_number if shipment else "",
        "shipped_at": shipment.shipped_at.isoformat() if shipment else None,
    }


def idempotent(db, actor, operation, key, payload, fn):
    if not key or len(key) > 128:
        fail("VALIDATION_ERROR", "缺少有效Idempotency-Key")
    # PostgreSQL transaction advisory lock serializes only the same actor/operation/key.
    raw = f"{actor}:{operation}:{key}"
    lock = int.from_bytes(hashlib.sha256(raw.encode()).digest()[:8], "big", signed=True)
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock})
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
    old = db.scalar(
        select(Idempotency).where(
            Idempotency.actor_id == actor,
            Idempotency.operation == operation,
            Idempotency.key == key,
        )
    )
    if old:
        if old.request_hash != digest:
            fail("IDEMPOTENCY_CONFLICT", "相同請求識別碼不可更換內容", 409)
        return old.response
    result = fn()
    db.add(
        Idempotency(
            actor_id=actor,
            operation=operation,
            key=key,
            request_hash=digest,
            response=result,
        )
    )
    db.commit()
    return result


def create_order(db, member, payload):
    if payload.payment_method == "ecpay_atm_test":
        from app.modules.payments.order_atm import require_order_testing
        require_order_testing()
    if (payload.shipping_method == "711_cod") != (payload.payment_method == "711_cod"):
        fail("VALIDATION_ERROR", "配送與付款方式不符")
    quantities = defaultdict(int)
    for item in payload.items:
        quantities[item.variant_id] += item.quantity
    variants = list(
        db.scalars(
            select(Variant)
            .where(Variant.id.in_(quantities))
            .order_by(Variant.id)
            .with_for_update()
        )
    )
    if len(variants) != len(quantities):
        fail("PRODUCT_NOT_PURCHASABLE", "商品規格不存在", 409)
    subtotal = 0
    details = []
    for v in variants:
        p = db.get(Product, v.product_id)
        db.refresh(p)
        from app.modules.catalog.service import active_sale
        amount = p.sale_amount if active_sale(p) else p.price_amount
        if p.status != "published" or not v.enabled or amount is None or amount <= 0:
            fail("PRODUCT_NOT_PURCHASABLE", "商品未上架或尚未設定價格", 409)
        qty = quantities[v.id]
        if qty > 1000:
            fail("VALIDATION_ERROR", "單一規格數量過多")
        if p.kind == "stock" and (v.stock_qty is None or v.stock_qty < qty):
            fail("OUT_OF_STOCK", p.title + " 庫存不足", 409)
        subtotal += amount * qty
        details.append((v, p, amount, qty))
    config = db.get(SiteContent, "main").value
    shipping = (
        0 if subtotal >= config["freeShippingThreshold"] else config["shippingFee"]
    )
    if subtotal + shipping != payload.expected_total_amount:
        fail("PRICE_CHANGED", "商品或運費已更新，請重新確認金額", 409)
    order = Order(
        order_number="WK" + now().strftime("%Y%m%d") + secrets.token_hex(5).upper(),
        member_id=member.id,
        subtotal_amount=subtotal,
        shipping_amount=shipping,
        total_amount=subtotal + shipping,
        receiver=payload.receiver.model_dump(),
        store=payload.store.model_dump(),
        shipping_method=payload.shipping_method,
        payment_method=payload.payment_method,
        note=payload.note,
        is_test=payload.payment_method == "ecpay_atm_test",
    )
    db.add(order)
    db.flush()
    for v, p, amount, qty in details:
        if p.kind == "stock":
            v.stock_qty -= qty
            v.version += 1
            p.version += 1
        db.add(
            OrderItem(
                image_url=p.gallery[0] if p.gallery else "",
                order_id=order.id,
                product_id=p.id,
                variant_id=v.id,
                title=p.title,
                color=v.color,
                size=v.size,
                kind=p.kind,
                unit_amount=amount,
                quantity=qty,
            )
        )
    db.add(Payment(order_id=order.id, amount=order.total_amount))
    if order.is_test:
        from app.modules.payments.order_atm import initialize
        initialize(db, order)
    db.flush()
    db.refresh(order)
    return serialize(order, db)


def transition(db, id, payload):
    order_lock(db,id)
    # Read immutable item IDs first, then lock variants consistently with checkout/product edits.
    ids = list(db.scalars(select(OrderItem.variant_id).where(OrderItem.order_id == id)))
    variants = {
        v.id: v
        for v in db.scalars(
            select(Variant)
            .where(Variant.id.in_(ids))
            .order_by(Variant.id)
            .with_for_update()
        )
    }
    o = db.scalar(select(Order).where(Order.id == id).with_for_update())
    if not o:
        fail("NOT_FOUND", "找不到訂單", 404)
    if o.version != payload.expected_version:
        fail("VERSION_CONFLICT", "訂單已更新，請重新載入", 409)
    allowed = {
        "pending": {"confirmed", "cancelled"},
        "confirmed": {"cancelled"},
        "shipped": {"completed"},
    }
    if payload.to_status not in allowed.get(o.status, set()):
        fail("INVALID_TRANSITION", "不允許此狀態變更", 409)
    if payload.to_status == "cancelled":
        for item in o.items:
            if item.kind == "stock":
                v = variants[item.variant_id]
                v.stock_qty += item.quantity
                v.version += 1
                p = db.get(Product, v.product_id)
                p.version += 1
    o.status = payload.to_status
    o.version += 1
    return o


def ship(db, id, payload, admin):
    order_lock(db,id)
    o = db.scalar(select(Order).where(Order.id == id).with_for_update())
    if not o:
        fail("NOT_FOUND", "找不到訂單", 404)
    if o.version != payload.expected_version:
        fail("VERSION_CONFLICT", "訂單已更新", 409)
    if o.is_test:
        fail("TEST_ORDER", "測試訂單不可實際出貨",409)
    if o.status != "confirmed":
        fail("INVALID_TRANSITION", "請先確認訂單", 409)
    p = db.scalar(select(Payment).where(Payment.order_id == id))
    if o.payment_method == "bank_transfer" and p.status != "paid":
        fail("INVALID_TRANSITION", "銀行轉帳尚未確認入帳", 409)
    db.add(
        Shipment(
            order_id=o.id,
            tracking_number=payload.tracking_number,
            confirmed_by=admin.id,
        )
    )
    o.status = "shipped"
    o.version += 1
    return o


def atm_details(o,db):
    if o.payment_method != "ecpay_atm_test":
        return None
    from app.modules.payments.models import AtmSandboxTransaction
    t=db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.order_id==o.id))
    return {"bank_code":t.bank_code,"virtual_account":t.virtual_account,"expires_on":t.expires_on,"status":t.status,"merchant_trade_no":t.merchant_trade_no} if t else None
