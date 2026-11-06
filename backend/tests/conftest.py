import secrets
import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app import models
from app.main import app
from app.core.security import password_hasher, hash_token, now
from datetime import timedelta

if not engine.url.database.endswith("_test"):
    raise RuntimeError("Tests require an isolated database whose name ends in _test")


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(
            models.SiteContent(
                key="main", value={"shippingFee": 60, "freeShippingThreshold": 1800}
            )
        )
        db.commit()
    yield


@pytest.fixture
def client():
    with TestClient(app, base_url=settings().public_origin) as c:
        yield c


@pytest.fixture
def seeded():
    with SessionLocal() as db:
        m = models.Member(
            google_sub="test-google-sub",
            email="member@example.invalid",
            display_name="Test member",
        )
        a = models.Admin(
            username="owner-test",
            password_hash=password_hasher.hash("only-for-isolated-tests"),
        )
        h = models.Admin(
            username="helper-test",
            password_hash=password_hasher.hash("only-for-isolated-tests"),
        )
        db.add_all([m, a, h])
        db.flush()
        p = models.Product(
            title="Test stock",
            kind="stock",
            status="published",
            price_amount=1000,
            gallery=[],
        )
        pre = models.Product(
            title="Test preorder",
            kind="preorder",
            status="published",
            price_amount=2280,
            gallery=[],
        )
        db.add_all([p, pre])
        db.flush()
        v = models.Variant(product_id=p.id, color="黑", size="M", stock_qty=1)
        pv = models.Variant(product_id=pre.id, color="", size="", stock_qty=None)
        db.add_all([v, pv])
        db.flush()
        db.commit()
        return {
            "member": m.id,
            "owner": a.id,
            "helper": h.id,
            "product": p.id,
            "variant": v.id,
            "prevariant": pv.id,
        }


def authenticate(client, principal_id, kind):
    from app.core.security import cookie_name

    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    with SessionLocal() as db:
        db.add(
            models.Session(
                kind=kind,
                principal_id=principal_id,
                token_hash=hash_token(token),
                csrf_hash=hash_token(csrf),
                csrf_token=csrf,
                expires_at=now() + timedelta(hours=1),
            )
        )
        db.commit()
    client.cookies.set(cookie_name(kind), token)
    return {"Origin": settings().public_origin, "X-CSRF-Token": csrf}
