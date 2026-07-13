import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import FarmProfile, UserAccount


def _slugify_district(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
    return slug[:32] or "unknown"


def register_user(db: Session, payload: dict) -> tuple[UserAccount, FarmProfile, str]:
    existing = db.scalar(select(UserAccount).where(UserAccount.email == payload["email"]))
    if existing:
        raise ConflictError("Email already registered")

    user = UserAccount(
        email=payload["email"].lower(),
        password_hash=hash_password(payload["password"]),
        full_name=payload["name"],
    )
    db.add(user)
    db.flush()

    district_name = payload.get("region") or "Unknown"
    location = payload.get("location") or {}
    farm = FarmProfile(
        user_id=user.id,
        district_code=_slugify_district(district_name),
        district_name=district_name,
        region_label=district_name,
        area_hectares=payload.get("farmSize"),
        country_code=(location.get("country") or "GB")[:2].upper(),
    )
    db.add(farm)
    db.commit()
    db.refresh(user)
    db.refresh(farm)

    token = create_access_token(str(user.id))
    return user, farm, token


def login_user(db: Session, email: str, password: str) -> tuple[UserAccount, FarmProfile | None, str]:
    user = db.scalar(select(UserAccount).where(UserAccount.email == email.lower().strip()))
    if not user or not user.is_active:
        raise UnauthorizedError(
            "No account found with this email. Please register first, or check the address."
        )
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError("Incorrect password. Try again or use Forgot password.")

    user.last_login_at = datetime.now(UTC)
    farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
    db.commit()

    token = create_access_token(str(user.id))
    return user, farm, token


def user_to_json(user: UserAccount, farm: FarmProfile | None) -> dict:
    return {
        "id": str(user.id),
        "name": user.full_name,
        "email": user.email,
        "region": farm.region_label if farm else None,
        "farmSize": float(farm.area_hectares) if farm and farm.area_hectares else None,
        "district": farm.district_name if farm else None,
        "location": {"label": farm.region_label} if farm else None,
    }
