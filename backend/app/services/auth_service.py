import re
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AppError, ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import FarmProfile, UserAccount, UserRole
from app.services.district_utils import resolve_district


def _slugify_district(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
    return slug[:32] or "unknown"


def _is_super_admin_email(email: str) -> bool:
    settings = get_settings()
    return email.strip().lower() == settings.super_admin_email.strip().lower()


def _token_for(user: UserAccount) -> str:
    return create_access_token(str(user.id), extra={"role": user.role.value})


def register_user(db: Session, payload: dict) -> tuple[UserAccount, FarmProfile | None, str]:
    email = payload["email"].strip().lower()
    existing = db.scalar(select(UserAccount).where(UserAccount.email == email))
    if existing:
        raise ConflictError("Email already registered")

    is_admin = _is_super_admin_email(email)

    if not is_admin:
        region = (payload.get("region") or "").strip()
        farm_size = payload.get("farmSize")
        if len(region) < 2:
            raise AppError("Farm location (region) is required", code="validation_error", status_code=400)
        if farm_size is None or float(farm_size) <= 0:
            raise AppError("Farm size is required", code="validation_error", status_code=400)

    user = UserAccount(
        email=email,
        password_hash=hash_password(payload["password"]),
        full_name=payload["name"],
        role=UserRole.admin if is_admin else UserRole.farmer,
    )
    db.add(user)
    db.flush()

    farm: FarmProfile | None = None
    if not is_admin:
        district_name = payload.get("region") or "Unknown"
        location = payload.get("location") or {}
        short_district = resolve_district(district_name, use_api=True)
        farm = FarmProfile(
            user_id=user.id,
            district_code=_slugify_district(short_district),
            district_name=short_district,
            region_label=short_district,
            area_hectares=payload.get("farmSize"),
            country_code=(location.get("country") or "GB")[:2].upper(),
        )
        db.add(farm)

    db.commit()
    db.refresh(user)
    if farm:
        db.refresh(farm)

    return user, farm, _token_for(user)


def login_user(db: Session, email: str, password: str) -> tuple[UserAccount, FarmProfile | None, str]:
    user = db.scalar(select(UserAccount).where(UserAccount.email == email.lower().strip()))
    if not user:
        raise UnauthorizedError(
            "No account found with this email. Please register first, or check the address."
        )
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError("Incorrect password. Try again or use Forgot password.")
    if not user.is_active:
        raise ForbiddenError(
            "Your account has been deactivated. Please contact the FarmSense admin to reactivate it."
        )

    user.last_login_at = datetime.now(UTC)
    farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
    db.commit()

    return user, farm, _token_for(user)


def user_to_json(user: UserAccount, farm: FarmProfile | None) -> dict:
    location = None
    if farm and farm.region_label:
        location = {
            "id": f"farm-{farm.id}",
            "label": farm.region_label,
            "fullLabel": farm.district_name or farm.region_label,
            "country": (farm.country_code or "GB").upper(),
            "source": "saved",
        }
    return {
        "id": str(user.id),
        "name": user.full_name,
        "email": user.email,
        "role": user.role.value if user.role else UserRole.farmer.value,
        "region": farm.region_label if farm else None,
        "farmSize": float(farm.area_hectares) if farm and farm.area_hectares else None,
        "district": farm.district_name if farm else None,
        "countryCode": farm.country_code if farm else None,
        "location": location,
    }
