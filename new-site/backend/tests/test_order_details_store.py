import time
from conftest import authenticate
from test_commerce import make_order, order_payload
from app.core.database import SessionLocal
from app.modules.catalog.models import Product
from app.modules.auth.models import Member
from app.modules.customers.models import Customer
from app.modules.orders.models import OrderItem
from sqlalchemy import select


def test_order_photo_snapshot_and_member_isolation(client, seeded):
    with SessionLocal() as db:
        db.get(Product, seeded["product"]).gallery = ["/assets/order-test.png"]
        db.commit()
    order = make_order(seeded)
    assert order["items"][0]["image_url"] == "/assets/order-test.png"
    with SessionLocal() as db:
        db.get(Product, seeded["product"]).gallery = ["/assets/changed.png"]
        other = Member(google_sub="another-identity", email="other@example.invalid")
        db.add(other)
        db.commit()
        other_id = other.id
    authenticate(client, seeded["member"], "member")
    r = client.get("/api/v1/orders/" + order["id"])
    assert r.status_code == 200
    assert r.json()["data"]["items"][0]["image_url"] == "/assets/order-test.png"
    assert r.json()["data"]["shipped_at"] is None
    authenticate(client, other_id, "member")
    assert client.get("/api/v1/orders/" + order["id"]).status_code == 404


def test_preferred_store_saved_and_checkout(client, seeded, monkeypatch):
    from app.integrations import seven_eleven
    store = {"id":"123456", "name":"Test store", "address":"Test address"}
    monkeypatch.setattr(seven_eleven,"cache",{("city","town"):(time.monotonic()+100,[store])})
    headers = authenticate(client, seeded["member"], "member")
    r = client.put("/api/v1/me/preferred-store", json={"store":store}, headers=headers)
    assert r.status_code == 200, r.text
    assert client.get("/api/v1/me/profile").json()["data"]["preferred_store"] == store
    assert client.put("/api/v1/me/preferred-store",json={"store":{**store,"name":"tampered"}},headers=headers).status_code == 422
    monkeypatch.setattr(seven_eleven,"cache",{})
    headers["Idempotency-Key"] = "preferred-checkout"
    r = client.post("/api/v1/orders",json=order_payload(seeded["variant"]).model_dump(),headers=headers)
    assert r.status_code == 201, r.text
    with SessionLocal() as db:
        assert db.scalar(select(Customer).where(Customer.member_id==seeded["member"])).preferred_store == store
    assert client.put("/api/v1/me/preferred-store",json={"store":None},headers=headers).status_code == 200
    assert client.get("/api/v1/me/profile").json()["data"]["preferred_store"] is None
