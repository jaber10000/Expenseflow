from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import csrf_protect
from app.api.routes.auth import router as auth_router
from app.api.routes.transactions import router as transactions_router
from app.core.config import settings

# Tables are created by Alembic migrations (`alembic upgrade head`), not at import time.
app = FastAPI(title=settings.app_name, version="1.1.0", description="ExpenseFlow expense management API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Requested-With"],
)
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"], dependencies=[Depends(csrf_protect)])
app.include_router(
    transactions_router, prefix="/api/transactions", tags=["Transactions"], dependencies=[Depends(csrf_protect)]
)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}
