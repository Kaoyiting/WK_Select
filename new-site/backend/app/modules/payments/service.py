from sqlalchemy import select
from app.core.exceptions import fail
from app.core.security import now
from .models import Payment


def payment_action(db, id, payload, refund=False):
    from app.core.locks import order_lock
    old=db.get(Payment,id)
    if old:
        order_lock(db,old.order_id)
        from app.modules.orders.models import Order
        if db.get(Order,old.order_id).is_test:
            fail("TEST_ORDER", "測試訂單請使用綠界測試付款通知，不可人工記錄真實收退款",409)
    p = db.scalar(select(Payment).where(Payment.id == id).with_for_update())
    if not p:
        fail("NOT_FOUND", "找不到付款紀錄", 404)
    if p.version != payload.expected_version:
        fail("VERSION_CONFLICT", "付款紀錄已更新", 409)
    if refund:
        if (
            p.status not in {"paid", "partially_refunded"}
            or payload.amount > p.amount - p.refunded_amount
        ):
            fail("PAYMENT_MISMATCH", "退款不得超過實際已收金額", 409)
        p.refunded_amount += payload.amount
        p.status = "refunded" if p.refunded_amount == p.amount else "partially_refunded"
    else:
        if p.status == "paid" or p.status in {"partially_refunded", "refunded"}:
            fail("INVALID_TRANSITION", "已確認收款", 409)
        if payload.amount != p.amount:
            fail("PAYMENT_MISMATCH", "實收金額與訂單不符，請人工核對", 409)
        p.status = "paid"
        p.paid_at = now()
    p.reference = payload.reference
    p.version += 1
    return {
        k: getattr(p, k)
        for k in ["id", "status", "amount", "refunded_amount", "version"]
    }
