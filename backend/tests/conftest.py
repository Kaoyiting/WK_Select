import os
import secrets

import pytest
from sqlalchemy.engine import make_url

from app.core.config import Settings

# Tests recreate every table. Require an explicit opt-in and a separate URL
# before importing app.core.database, which creates the SQLAlchemy engine.
test_settings = Settings()
if not test_settings.testing:
    raise RuntimeError("Tests require TESTING=true")
if not test_settings.test_database_url:
    raise RuntimeError("Tests require a separate TEST_DATABASE_URL")
try:
    test_database = make_url(test_settings.test_database_url)
except Exception as exc:
    raise RuntimeError("TEST_DATABASE_URL is invalid") from exc
if not test_database.database or not test_database.database.endswith("_test"):
    raise RuntimeError("TEST_DATABASE_URL database name must end in _test")
if os.getenv("APP_ENV", "local").lower() == "production":
    raise RuntimeError("Tests cannot run with APP_ENV=production")

# The test URL wins even if DATABASE_URL points at a development or production DB.
os.environ["DATABASE_URL"] = test_settings.test_database_url

from fastapi.testclient import TestClient
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app import models
from app.main import app
from app.core.security import password_hasher, hash_token, now
from datetime import timedelta

if engine.url.database != test_database.database:
    raise RuntimeError("The test engine did not use TEST_DATABASE_URL")


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
