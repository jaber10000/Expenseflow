import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from tests.conftest import register


def test_register_sets_httponly_cookie_and_hides_password(client):
    r = register(client, email="  Alice@Example.COM ")
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "alice@example.com"
    assert body["base_currency"] == "BDT"
    assert "password" not in body and "password_hash" not in body
    set_cookie = r.headers["set-cookie"].lower()
    assert settings.cookie_name in set_cookie and "httponly" in set_cookie and "samesite=lax" in set_cookie
    assert client.get("/api/auth/me").json()["email"] == "alice@example.com"


def test_password_is_stored_as_argon2_hash(client, session_factory):
    register(client)
    with session_factory() as db:
        stored = db.scalar(select(User.password_hash))
    assert stored.startswith("$argon2id$")
    assert "correct-horse" not in stored


def test_duplicate_email_is_rejected_case_insensitively(client, make_client):
    assert register(client).status_code == 201
    assert register(make_client(), email="ALICE@example.com").status_code == 409


@pytest.mark.parametrize(
    "extra",
    [{"password": "short"}, {"password": "x" * 129}, {"email": "not-an-email"}, {"base_currency": "XYZ"}, {"full_name": "   "}, {"is_active": False}],
)
def test_register_validation(client, extra):
    assert register(client, **extra).status_code == 422


def test_login_success_and_failures(client, make_client):
    register(client)
    other = make_client()
    ok = other.post("/api/auth/login", json={"email": "ALICE@example.com", "password": "correct-horse-battery"})
    assert ok.status_code == 200 and other.get("/api/auth/me").status_code == 200

    wrong = make_client().post("/api/auth/login", json={"email": "alice@example.com", "password": "nope-nope-nope"})
    unknown = make_client().post("/api/auth/login", json={"email": "ghost@example.com", "password": "nope-nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()  # same message: no account enumeration


def test_logout_clears_session(alice):
    assert alice.get("/api/auth/me").status_code == 200
    assert alice.post("/api/auth/logout").status_code == 204
    assert alice.get("/api/auth/me").status_code == 401


def test_me_requires_login(client):
    assert client.get("/api/auth/me").status_code == 401


def test_garbage_and_expired_tokens_are_rejected(client):
    register(client)
    client.cookies.set(settings.cookie_name, "not.a.jwt")
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set(settings.cookie_name, create_access_token(1, minutes=-5))
    assert client.get("/api/auth/me").status_code == 401


def test_token_signed_with_other_key_is_rejected(client):
    import jwt

    register(client)
    forged = jwt.encode({"sub": "1", "exp": 4102444800}, "x" * 40, algorithm="HS256")
    client.cookies.set(settings.cookie_name, forged)
    assert client.get("/api/auth/me").status_code == 401


def test_state_changing_requests_need_csrf_header(client):
    client.headers.pop("X-Requested-With")
    r = client.post("/api/auth/register", json={"email": "a@example.com", "password": "correct-horse-battery", "full_name": "A"})
    assert r.status_code == 403


def test_password_hash_helpers():
    h = hash_password("secret-secret")
    assert verify_password("secret-secret", h)
    assert not verify_password("other", h)
    assert not verify_password("anything", None)
