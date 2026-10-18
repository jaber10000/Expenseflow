from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionRead, TransactionUpdate
from app.services import transactions as service

router = APIRouter()
NOT_FOUND = HTTPException(status_code=404, detail="Transaction not found")


@router.get("", response_model=list[TransactionRead])
def read_transactions(
    user: CurrentUser,
    currency: str | None = Query(default=None, min_length=3, max_length=3),
    transaction_type: Literal["income", "expense"] | None = None,
    db: Session = Depends(get_db),
):
    """Return the signed-in user's transactions; optional filters are currency and transaction_type."""
    return service.list_transactions(db, user.id, currency, transaction_type)


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, user: CurrentUser, db: Session = Depends(get_db)):
    return service.create_transaction(db, user.id, payload)


@router.get("/{transaction_id}", response_model=TransactionRead)
def read_transaction(transaction_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    row = service.get_transaction(db, user.id, transaction_id)
    if row is None:
        raise NOT_FOUND  # 404 (not 403) so IDs belonging to others are indistinguishable from missing ones
    return row


@router.put("/{transaction_id}", response_model=TransactionRead)
def update_transaction(transaction_id: int, payload: TransactionUpdate, user: CurrentUser, db: Session = Depends(get_db)):
    row = service.get_transaction(db, user.id, transaction_id)
    if row is None:
        raise NOT_FOUND
    return service.update_transaction(db, row, payload)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_transaction(transaction_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    row = service.get_transaction(db, user.id, transaction_id)
    if row is None:
        raise NOT_FOUND
    service.delete_transaction(db, row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
