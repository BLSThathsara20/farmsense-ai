import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ServiceUnavailableError, UnauthorizedError
from app.core.security import hash_password
from app.db.models import PasswordResetToken, UserAccount
from app.services.email_service import send_password_reset_email


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def request_password_reset(db: Session, email: str) -> dict:
    """Create a reset token and email the link. Returns clear status for the UI."""
    settings = get_settings()
    cleaned = email.lower().strip()

    user = db.scalar(select(UserAccount).where(UserAccount.email == cleaned))
    if not user:
        raise NotFoundError(
            "No account found with this email. Please register first, or check the address."
        )
    if not user.is_active:
        raise UnauthorizedError(
            "Your account has been deactivated. Please contact the FarmSense admin to reactivate it."
        )

    # Invalidate unused tokens for this user
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=datetime.now(UTC))
    )

    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.password_reset_expire_minutes)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(raw_token),
            expires_at=expires_at,
        )
    )
    db.commit()

    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={raw_token}"
    delivery = send_password_reset_email(
        to_email=user.email,
        reset_url=reset_url,
        name=user.full_name,
    )

    if delivery.get("sent"):
        return {
            "message": (
                f"Password reset email sent to {user.email}. Check your inbox (and spam). "
                "Older reset links stop working — use only the newest email."
            ),
            "emailSent": True,
            "provider": delivery.get("provider"),
            "accountFound": True,
        }

    # Local demo without Resend key — still allow reset via shown link
    if settings.environment == "development":
        return {
            "message": (
                "Account found, but email was not sent (RESEND_API_KEY missing). "
                "Use the development reset link below."
            ),
            "emailSent": False,
            "provider": delivery.get("provider", "console"),
            "accountFound": True,
            "devResetUrl": reset_url,
        }

    raise ServiceUnavailableError(
        "Could not send the reset email right now. Please try again later, or contact support."
    )


def reset_password(db: Session, token: str, new_password: str) -> dict:
    # Tokens may arrive URL-encoded from email clients
    from urllib.parse import unquote

    raw = unquote((token or "").strip())
    if not raw or len(raw) < 20:
        raise UnauthorizedError("Invalid or expired reset link")

    row = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_token(raw))
    )
    now = datetime.now(UTC)
    if not row:
        raise UnauthorizedError(
            "Invalid reset link. Request a new one from Forgot password and open the latest email."
        )
    if row.used_at is not None:
        raise UnauthorizedError(
            "This reset link was already used or replaced by a newer one. "
            "Request a fresh link and open the newest email only."
        )
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < now:
        raise UnauthorizedError("This reset link has expired. Request a new one.")

    user = db.get(UserAccount, row.user_id)
    if not user:
        raise UnauthorizedError("Invalid or expired reset link")
    if not user.is_active:
        raise UnauthorizedError(
            "Your account has been deactivated. Please contact the FarmSense admin to reactivate it."
        )

    user.password_hash = hash_password(new_password)
    row.used_at = now
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != row.id,
        )
        .values(used_at=now)
    )
    db.commit()
    return {"message": "Password updated. You can sign in with your new password."}
