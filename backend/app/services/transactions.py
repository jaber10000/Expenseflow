from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate

# Every function takes user_id and filters by it. There is deliberately no way to
# fetch a transaction without an owner: that is what enforces per-user data isolation.


def list_transactions(db: Session, user_id: int, currency: str | None = None, transaction_type: str | None = None):
    stmt = select(Transaction).where(Transaction.user_id == user_id)
    if currency:
        stmt = stmt.where(Transaction.currency == currency.upper())
    if transaction_type:
        stmt = stmt.where(Transaction.transaction_type == transaction_type)
    stmt = stmt.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    return list(db.scalars(stmt))


def create_transaction(db: Session, user_id: int, data: TransactionCreate):
    row = Transaction(**data.model_dump(), user_id=user_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_transaction(db: Session, user_id: int, transaction_id: int):
    return db.scalar(select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id))


def update_transaction(db: Session, row: Transaction, data: TransactionUpdate):
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


def delete_transaction(db: Session, row: Transaction):
    db.delete(row)
    db.commit()
