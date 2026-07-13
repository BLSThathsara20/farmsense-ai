import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, UnauthorizedError
from app.core.middleware import stable_request_hash
from app.core.security import safe_decode_token
from app.db.models import IdempotencyRecord, UserAccount, UserRole
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> UserAccount:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Missing or invalid authorization header")
    payload = safe_decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise UnauthorizedError("Invalid or expired token")
    user = db.get(UserAccount, uuid.UUID(payload["sub"]))
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return user


def require_admin(
    user: Annotated[UserAccount, Depends(get_current_user)],
) -> UserAccount:
    if user.role != UserRole.admin:
        raise ForbiddenError("Admin access required")
    return user


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> UserAccount | None:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except UnauthorizedError:
        return None


class IdempotencyGuard:
    """Replay stored response when the same Idempotency-Key + body is resent."""

    def __init__(self, ttl_hours: int):
        self.ttl_hours = ttl_hours

    def check_or_store(
        self,
        db: Session,
        *,
        key: str | None,
        user_id: uuid.UUID | None,
        method: str,
        path: str,
        body: dict[str, Any] | None,
        handler: callable,
    ) -> tuple[int, dict[str, Any], bool]:
        if not key:
            status, payload = handler()
            return status, payload, False

        req_hash = stable_request_hash(body)
        existing = db.scalar(select(IdempotencyRecord).where(IdempotencyRecord.idempotency_key == key))
        if existing:
            if existing.request_hash != req_hash:
                raise ConflictError("Idempotency-Key reused with a different request body")
            return existing.response_status, existing.response_body, True

        status, payload = handler()
        record = IdempotencyRecord(
            idempotency_key=key,
            user_id=user_id,
            method=method,
            path=path,
            request_hash=req_hash,
            response_status=status,
            response_body=payload,
            expires_at=datetime.now(UTC) + timedelta(hours=self.ttl_hours),
        )
        db.add(record)
        db.commit()
        return status, payload, False


def idempotency_key_header(
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> str | None:
    return idempotency_key
