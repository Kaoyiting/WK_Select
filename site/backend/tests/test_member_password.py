from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.auth.models import Member
from app.core.security import verify_password
from sqlalchemy import select


def test_member_registration_login_and_isolation(client):
    origin = {"Origin": settings().public_origin}
    body = {"name": "Test shopper", "email": "Shopper@example.com", "password": "long-test-password-123"}
    r = client.post("/api/v1/auth/register", json=body, headers=origin)
    assert r.status_code == 201, r.text
    assert r.json()["data"]["authenticated"]
    assert client.get("/api/v1/auth/session").json()["data"]["authenticated"]
    assert not client.get("/api/v1/admin/auth/session").json()["data"]["authenticated"]
    with SessionLocal() as db:
        p = db.scalar(select(Member).where(Member.login_email == "shopper@example.com"))
        assert p.google_sub is None
        assert p.password_hash != body["password"]
        assert verify_password(p.password_hash, body["password"])
    assert client.post("/api/v1/auth/register", json={**body,"email":"shopper@example.com"}, headers=origin).status_code == 409
    assert client.post("/api/v1/auth/login", json={"email":body["email"],"password":"wrong"}, headers=origin).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email":body["email"],"password":body["password"]}, headers=origin).status_code == 200


def test_registration_validation_and_origin(client, seeded):
    body = {"name":"Shopper", "email":"shopper@example.com", "password":"short"}
    assert client.post("/api/v1/auth/register",json=body,headers={"Origin":settings().public_origin}).status_code == 422
    body["password"]="long-test-password-123"
    assert client.post("/api/v1/auth/register",json=body,headers={"Origin":"https://evil.invalid"}).status_code == 403
    body["email"]="member@example.invalid"
    assert client.post("/api/v1/auth/register",json=body,headers={"Origin":settings().public_origin}).status_code == 409


def test_member_login_rate_limit(client):
    for i in range(8):
        assert client.post("/api/v1/auth/login",json={"email":"missing@example.com","password":"wrong"},headers={"Origin":settings().public_origin}).status_code == 401
    assert client.post("/api/v1/auth/login",json={"email":"missing@example.com","password":"wrong"},headers={"Origin":settings().public_origin}).status_code == 429
