import pytest

from tests.conftest import tx


@pytest.mark.parametrize(
    "method,path",
    [("get", "/api/transactions"), ("post", "/api/transactions"), ("get", "/api/transactions/1"), ("put", "/api/transactions/1"), ("delete", "/api/transactions/1")],
)
def test_endpoints_require_authentication(client, method, path):
    kwargs = {"json": tx()} if method in ("post", "put") else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401


def test_create_list_update_delete_own_transaction(alice):
    created = alice.post("/api/transactions", json=tx())
    assert created.status_code == 201
    tid = created.json()["id"]
    assert "user_id" not in created.json()
    assert len(alice.get("/api/transactions").json()) == 1

    updated = alice.put(f"/api/transactions/{tid}", json=tx(title="Dinner", amount="25.50"))
    assert updated.status_code == 200 and updated.json()["title"] == "Dinner"

    assert alice.delete(f"/api/transactions/{tid}").status_code == 204
    assert alice.get(f"/api/transactions/{tid}").status_code == 404


def test_amount_keeps_exact_decimals(alice):
    r = alice.post("/api/transactions", json=tx(amount="0.10"))
    assert r.json()["amount"] == "0.10"
    alice.post("/api/transactions", json=tx(amount="0.20"))
    amounts = [a["amount"] for a in alice.get("/api/transactions").json()]
    assert sorted(amounts) == ["0.10", "0.20"]  # no 0.1000000000000000055 float noise


@pytest.mark.parametrize("amount", ["0", "-5", "1.234", "abc", "1000000000000.00"])
def test_invalid_amounts_rejected(alice, amount):
    assert alice.post("/api/transactions", json=tx(amount=amount)).status_code == 422


def test_unsupported_currency_and_unknown_fields_rejected(alice):
    assert alice.post("/api/transactions", json=tx(currency="JPY")).status_code == 422
    assert alice.post("/api/transactions", json=tx(user_id=999)).status_code == 422


def test_users_cannot_see_each_others_transactions(alice, bob):
    tid = alice.post("/api/transactions", json=tx(title="Alice secret")).json()["id"]
    bob.post("/api/transactions", json=tx(title="Bob thing"))

    assert [t["title"] for t in bob.get("/api/transactions").json()] == ["Bob thing"]
    assert [t["title"] for t in alice.get("/api/transactions").json()] == ["Alice secret"]
    assert bob.get(f"/api/transactions/{tid}").status_code == 404


def test_users_cannot_modify_or_delete_each_others_transactions(alice, bob):
    tid = alice.post("/api/transactions", json=tx(title="Mine")).json()["id"]
    assert bob.put(f"/api/transactions/{tid}", json=tx(title="Hacked")).status_code == 404
    assert bob.delete(f"/api/transactions/{tid}").status_code == 404
    still = alice.get(f"/api/transactions/{tid}")
    assert still.status_code == 200 and still.json()["title"] == "Mine"


def test_filters(alice):
    alice.post("/api/transactions", json=tx(currency="USD", transaction_type="expense"))
    alice.post("/api/transactions", json=tx(currency="BDT", transaction_type="income"))
    assert len(alice.get("/api/transactions", params={"currency": "bdt"}).json()) == 1
    assert len(alice.get("/api/transactions", params={"transaction_type": "expense"}).json()) == 1
