import os

os.environ.setdefault("ENVIRONMENT", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.database import Base, get_db
from app.main import app

HEADERS = {"X-Requested-With": "ExpenseFlow"}


@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, autocommit=False)
    engine.dispose()


@pytest.fixture()
def make_client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    clients = []

    def factory() -> TestClient:
        c = TestClient(app, headers=HEADERS)  # each client has its own cookie jar
        clients.append(c)
        return c

    yield factory
    app.dependency_overrides.clear()


@pytest.fixture()
def client(make_client):
    return make_client()


def register(c, email="alice@example.com", password="correct-horse-battery", **extra):
    body = {"email": email, "password": password, "full_name": "Alice", **extra}
    return c.post("/api/auth/register", json=body)


@pytest.fixture()
def alice(client):
    assert register(client).status_code == 201
    return client


@pytest.fixture()
def bob(make_client):
    c = make_client()
    assert register(c, email="bob@example.com").status_code == 201
    return c


def tx(**over):
    base = {
        "title": "Lunch",
        "category": "Food",
        "transaction_type": "expense",
        "amount": "10.10",
        "currency": "USD",
        "transaction_date": "2026-10-01",
        "payment_method": "Card",
    }
    base.update(over)
    return base
