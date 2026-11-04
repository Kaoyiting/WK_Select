import concurrent.futures, uuid, time
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from app.core.database import SessionLocal
from app.modules.orders.schemas import OrderInput, Transition
from app.modules.orders.service import create_order, idempotent, transition
from app.modules.catalog.models import Variant, Product
from app.modules.orders.models import Order
from app.modules.auth.models import Member
from conftest import authenticate


def order_payload(variant, amount=1060):
    return OrderInput(
        items=[{"variant_id": variant, "quantity": 1}],
        receiver={"name": "Test", "phone": "0912345678", "email": ""},
        store={"id": "123456", "name": "Test store", "address": "Test address"},
        shipping_method="711_cod",
        payment_method="711_cod",
        expected_total_amount=amount,
    )


def make_order(ids, variant=None, amount=1060, key=None):
    with SessionLocal() as db:
        m = db.get(Member, ids["member"])
        payload = order_payload(variant or ids["variant"], amount)
        return idempotent(
            db,
            m.id,
            "test-order",
            key or str(uuid.uuid4()),
            payload.model_dump(),
            lambda: create_order(db, m, payload),
        )


def test_guest_cannot_order(client, seeded):
    r = client.post(
        "/api/v1/orders", json=order_payload(seeded["variant"]).model_dump()
    )
    assert r.status_code == 401


def test_stock_deduct_and_cancel_once(seeded):
    o = make_order(seeded)
    with SessionLocal() as db:
        assert db.get(Variant, seeded["variant"]).stock_qty == 0
        transition(
            db,
            o["id"],
            Transition(to_status="cancelled", expected_version=o["version"]),
        )
        db.commit()
        assert db.get(Variant, seeded["variant"]).stock_qty == 1
        with pytest.raises(HTTPException):
            transition(
                db,
                o["id"],
                Transition(to_status="cancelled", expected_version=o["version"]),
            )
    with SessionLocal() as db:
        assert db.get(Variant, seeded["variant"]).stock_qty == 1


def test_preorder_has_no_stock_and_free_shipping(seeded):
    o = make_order(seeded, seeded["prevariant"], 2280)
    assert o["shipping_amount"] == 0
    with SessionLocal() as db:
        assert db.get(Variant, seeded["prevariant"]).stock_qty is None


def test_duplicate_key_returns_same_order(seeded):
    a = make_order(seeded, key="same-request")
    b = make_order(seeded, key="same-request")
    assert a["id"] == b["id"]
    with SessionLocal() as db:
        assert len(db.scalars(select(Order)).all()) == 1


def test_price_change_rolls_back_stock(seeded):
    with pytest.raises(HTTPException) as e:
        make_order(seeded, amount=1)
    assert e.value.detail["code"] == "PRICE_CHANGED"
    with SessionLocal() as db:
        assert db.get(Variant, seeded["variant"]).stock_qty == 1
        assert len(db.scalars(select(Order)).all()) == 0


def test_concurrent_last_item_only_one_success(seeded):
    def run():
        try:
            return make_order(seeded)["id"]
        except HTTPException as e:
            return e.detail["code"]

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        result = list(pool.map(lambda _: run(), range(2)))
    assert result.count("OUT_OF_STOCK") == 1
    with SessionLocal() as db:
        assert db.get(Variant, seeded["variant"]).stock_qty == 0
        assert len(db.scalars(select(Order)).all()) == 1


def test_two_admins_equal_permission(client, seeded):
    for user in ["owner-test", "helper-test"]:
        r = client.post(
            "/api/v1/admin/auth/login",
            headers={"Origin": "http://localhost:8089"},
            json={"username": user, "password": "only-for-isolated-tests"},
        )
        assert r.status_code == 200
        assert client.get("/api/v1/admin/products").status_code == 200
        assert client.get("/api/v1/admin/audit-logs").status_code == 200


def test_member_cookie_not_admin(client, seeded):
    authenticate(client, seeded["member"], "member")
    assert client.get("/api/v1/admin/products").status_code == 401


def test_admin_cookie_not_member(client, seeded):
    authenticate(client, seeded["owner"], "admin")
    assert client.get("/api/v1/orders").status_code == 401


def test_other_member_cannot_read_order(client, seeded):
    o = make_order(seeded)
    with SessionLocal() as db:
        m = Member(google_sub="other")
        db.add(m)
        db.commit()
        mid = m.id
    authenticate(client, mid, "member")
    assert client.get("/api/v1/orders/" + o["id"]).status_code == 404


def test_csrf_rejected(client, seeded):
    authenticate(client, seeded["owner"], "admin")
    assert (
        client.post("/api/v1/admin/catalog/brands", json={"name": "Test"}).status_code
        == 403
    )


def test_paste_image_upload_preview_and_magic_bytes(client, seeded):
    from PIL import Image
    from io import BytesIO

    h = authenticate(client, seeded["helper"], "admin")
    buf = BytesIO()
    Image.new("RGB", (20, 20)).save(buf, format="PNG")
    r = client.post(
        "/api/v1/admin/assets",
        headers=h,
        files={"file": ("clipboard.png", buf.getvalue(), "image/png")},
    )
    assert r.status_code == 201
    url = r.json()["data"]["url"]
    assert client.get(url).status_code == 200
    r = client.post(
        "/api/v1/admin/assets",
        headers=h,
        files={"file": ("bad.png", b"<script>bad</script>", "image/png")},
    )
    assert r.status_code == 422


def test_no_stock_required_for_preorder_schema():
    from app.modules.catalog.schemas import ProductInput

    p = ProductInput(
        title="No brand", variants=[{"color": "", "size": "", "stock_qty": None}]
    )
    assert p.brand == ""
    with pytest.raises(ValueError):
        ProductInput(title="stock", kind="stock", variants=[{"color": "", "size": ""}])
