"""Super-admin APIs — privacy-limited farmer summaries (no soil chemistry)."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.models import FarmProfile, RecommendationRun, SoilReading, UserAccount, UserRole
from app.services.district_utils import resolve_district

# Automated test / seed accounts — never shown in live admin mode
_TEST_EMAIL = re.compile(
    r"(@example\.com$|@farmsense\.test$|^(test-|reset-|e2e-|exists-|new-))",
    re.IGNORECASE,
)
_TEST_DISTRICTS = {"test district", "reset district", "reset region", "test region"}


def _is_demo_farmer(user: UserAccount, farm: FarmProfile | None = None) -> bool:
    email = (user.email or "").strip().lower()
    if _TEST_EMAIL.search(email):
        return True
    if farm:
        for label in (farm.district_name, farm.region_label):
            if label and label.strip().lower() in _TEST_DISTRICTS:
                return True
    return False


def _live_farmer_filter():
    return UserAccount.role == UserRole.farmer


def _district_for_farm(farm: FarmProfile | None) -> str:
    if not farm:
        return "Unknown"
    raw = farm.district_name or farm.region_label
    district = resolve_district(raw, use_api=True)
    # Persist a cleaner short name when the stored value was a full address
    if farm.district_name and district and farm.district_name.strip() != district:
        if "," in farm.district_name or len(farm.district_name) > len(district) + 8:
            farm.district_name = district
            if farm.region_label and (
                "," in farm.region_label or "United Kingdom" in farm.region_label
            ):
                farm.region_label = district
    return district


def _plan_flags(run: RecommendationRun | None) -> dict:
    if not run:
        return {
            "hasRecommendations": False,
            "planStatus": "none",
            "finalized": False,
            "topCrop": None,
            "lastPlanAt": None,
        }
    ranked = run.ranked_output or {}
    finalized = bool(ranked.get("finalized")) or run.status.value == "completed"
    plan_status = ranked.get("planStatus") or ("finalized" if finalized else "draft")
    return {
        "hasRecommendations": True,
        "planStatus": plan_status,
        "finalized": finalized,
        "topCrop": run.top_crop,
        "lastPlanAt": run.created_at.isoformat() if run.created_at else None,
    }


def _farmer_summary(db: Session, user: UserAccount, farm: FarmProfile | None) -> dict:
    has_soil = False
    soil_count = 0
    latest_run = None
    district = _district_for_farm(farm)
    if farm:
        soil_count = (
            db.scalar(
                select(func.count())
                .select_from(SoilReading)
                .where(SoilReading.farm_profile_id == farm.id)
            )
            or 0
        )
        has_soil = soil_count > 0
        latest_run = db.scalar(
            select(RecommendationRun)
            .where(RecommendationRun.farm_profile_id == farm.id)
            .order_by(desc(RecommendationRun.created_at))
            .limit(1)
        )

    plan = _plan_flags(latest_run)
    return {
        "id": str(user.id),
        "name": user.full_name,
        "email": user.email,
        "isActive": user.is_active,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
        "district": district,
        "region": district,
        "farmSize": float(farm.area_hectares) if farm and farm.area_hectares else None,
        "countryCode": farm.country_code if farm else None,
        "hasSoilData": has_soil,
        "soilReadingsCount": soil_count,
        **plan,
    }


def admin_overview(db: Session) -> dict:
    users = db.scalars(select(UserAccount).where(_live_farmer_filter())).all()
    real_users: list[tuple[UserAccount, FarmProfile | None]] = []
    for user in users:
        farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
        if _is_demo_farmer(user, farm):
            continue
        real_users.append((user, farm))

    total = len(real_users)
    active = sum(1 for u, _ in real_users if u.is_active)
    with_soil = 0
    draft_plans = 0
    finalized_plans = 0
    district_counts: dict[str, int] = {}

    for user, farm in real_users:
        district = _district_for_farm(farm)
        district_counts[district] = district_counts.get(district, 0) + 1

        if not farm:
            continue

        soil_n = (
            db.scalar(
                select(func.count())
                .select_from(SoilReading)
                .where(SoilReading.farm_profile_id == farm.id)
            )
            or 0
        )
        if soil_n > 0:
            with_soil += 1

        latest = db.scalar(
            select(RecommendationRun)
            .where(RecommendationRun.farm_profile_id == farm.id)
            .order_by(desc(RecommendationRun.created_at))
            .limit(1)
        )
        flags = _plan_flags(latest)
        if flags["planStatus"] == "draft":
            draft_plans += 1
        elif flags["finalized"] or flags["planStatus"] == "finalized":
            finalized_plans += 1

    db.commit()

    by_district = [
        {"district": name, "farmers": count}
        for name, count in sorted(district_counts.items(), key=lambda x: (-x[1], x[0]))
    ]

    return {
        "mode": "live",
        "totals": {
            "farmers": total,
            "active": active,
            "inactive": total - active,
            "withSoilData": with_soil,
            "draftPlans": draft_plans,
            "finalizedPlans": finalized_plans,
        },
        "byDistrict": by_district,
    }


def list_farmers(db: Session, *, q: str | None = None, page: int = 1, limit: int = 20) -> dict:
    page = max(1, page)
    limit = min(100, max(1, limit))

    stmt = select(UserAccount).where(_live_farmer_filter())
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(UserAccount.full_name).like(term),
                func.lower(UserAccount.email).like(term),
            )
        )
    stmt = stmt.order_by(desc(UserAccount.created_at))
    users = db.scalars(stmt).all()

    summaries = []
    for user in users:
        farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
        if _is_demo_farmer(user, farm):
            continue
        summaries.append(_farmer_summary(db, user, farm))

    db.commit()

    total = len(summaries)
    offset = (page - 1) * limit
    items = summaries[offset : offset + limit]

    return {
        "mode": "live",
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "totalPages": max(1, (total + limit - 1) // limit) if total else 0,
    }


def get_farmer(db: Session, farmer_id: uuid.UUID) -> dict:
    user = db.get(UserAccount, farmer_id)
    if not user or user.role != UserRole.farmer:
        raise NotFoundError("Farmer not found")
    farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
    if _is_demo_farmer(user, farm):
        raise NotFoundError("Farmer not found")
    summary = _farmer_summary(db, user, farm)
    db.commit()
    return summary


def set_farmer_active(db: Session, farmer_id: uuid.UUID, is_active: bool) -> dict:
    settings = get_settings()
    user = db.get(UserAccount, farmer_id)
    if not user or user.role != UserRole.farmer:
        raise NotFoundError("Farmer not found")
    if user.email.strip().lower() == settings.super_admin_email.strip().lower():
        raise ForbiddenError("Cannot change the super-admin account from farmer controls")
    if _is_demo_farmer(user):
        raise NotFoundError("Farmer not found")

    user.is_active = bool(is_active)
    db.commit()
    db.refresh(user)
    farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
    return _farmer_summary(db, user, farm)


def delete_farmer(db: Session, farmer_id: uuid.UUID) -> dict:
    """Permanently delete a farmer account and cascaded farm data."""
    settings = get_settings()
    user = db.get(UserAccount, farmer_id)
    if not user or user.role != UserRole.farmer:
        raise NotFoundError("Farmer not found")
    if user.email.strip().lower() == settings.super_admin_email.strip().lower():
        raise ForbiddenError("Cannot delete the super-admin account")
    if user.role == UserRole.admin:
        raise ForbiddenError("Cannot delete an admin account")
    if _is_demo_farmer(user):
        raise NotFoundError("Farmer not found")

    email = user.email
    name = user.full_name
    db.delete(user)
    db.commit()
    return {"deleted": True, "id": str(farmer_id), "email": email, "name": name}


def _pct(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round((part / whole) * 100, 1)


def _build_insights(
    *,
    total: int,
    with_soil: int,
    finalized: int,
    draft: int,
    no_plan: int,
    inactive: int,
    by_district: list[dict],
    top_crops: list[dict],
) -> list[str]:
    if total == 0:
        return ["No farmers yet. Analytics will appear after the first registration."]

    insights: list[str] = []
    soil_pct = _pct(with_soil, total)
    fin_pct = _pct(finalized, total)

    if soil_pct >= 60:
        insights.append(f"Soil data adoption is strong at {soil_pct}% of farmers.")
    elif soil_pct > 0:
        insights.append(
            f"Only {soil_pct}% of farmers have submitted soil data — worth nudging new sign-ups to complete Plan."
        )
    else:
        insights.append("No soil submissions yet. Plan completion will unlock crop insights.")

    if fin_pct >= 40:
        insights.append(f"{fin_pct}% of farmers have a finalized crop plan.")
    elif draft > finalized:
        insights.append(
            f"More draft plans ({draft}) than finalized ({finalized}) — farmers may need help confirming picks."
        )
    elif no_plan == total:
        insights.append("No crop plans yet. Encourage farmers to start from Plan after registration.")

    if inactive:
        insights.append(f"{inactive} inactive account(s) are blocked from signing in.")

    if by_district:
        top = by_district[0]
        insights.append(f"Most farmers are in {top['district']} ({top['farmers']}).")

    if top_crops:
        lead = top_crops[0]
        insights.append(f"Leading finalized crop: {lead['crop']} ({lead['farmers']} farm(s)).")

    return insights[:5]


def admin_analytics(db: Session) -> dict:
    """Privacy-safe platform analytics for the super-admin Analysis page."""
    users = db.scalars(select(UserAccount).where(_live_farmer_filter())).all()
    rows: list[dict] = []
    for user in users:
        farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
        if _is_demo_farmer(user, farm):
            continue
        rows.append(_farmer_summary(db, user, farm))
    db.commit()

    total = len(rows)
    active = sum(1 for r in rows if r["isActive"])
    inactive = total - active
    with_soil = sum(1 for r in rows if r["hasSoilData"])
    finalized = sum(1 for r in rows if r.get("finalized") or r.get("planStatus") == "finalized")
    draft = sum(1 for r in rows if r.get("planStatus") == "draft" and not r.get("finalized"))
    no_plan = total - finalized - draft

    district_counts: dict[str, int] = {}
    crop_counts: dict[str, int] = {}
    month_counts: dict[str, int] = {}
    sizes: list[float] = []

    for r in rows:
        d = r.get("district") or "Unknown"
        district_counts[d] = district_counts.get(d, 0) + 1

        if r.get("finalized") and r.get("topCrop"):
            crop = str(r["topCrop"]).strip()
            if crop:
                crop_counts[crop] = crop_counts.get(crop, 0) + 1

        if r.get("createdAt"):
            month_key = r["createdAt"][:7]  # YYYY-MM
            month_counts[month_key] = month_counts.get(month_key, 0) + 1

        if r.get("farmSize") is not None:
            try:
                sizes.append(float(r["farmSize"]))
            except (TypeError, ValueError):
                pass

    by_district = [
        {"district": name, "farmers": count}
        for name, count in sorted(district_counts.items(), key=lambda x: (-x[1], x[0]))
    ]
    top_crops = [
        {"crop": name, "farmers": count}
        for name, count in sorted(crop_counts.items(), key=lambda x: (-x[1], x[0]))
    ][:8]

    signups = []
    for month in sorted(month_counts.keys()):
        year, mon = month.split("-")
        months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
        label = f"{months[int(mon) - 1]} {year}"
        signups.append({"month": month, "label": label, "farmers": month_counts[month]})

    farm_size = {
        "avgHa": round(sum(sizes) / len(sizes), 2) if sizes else None,
        "minHa": round(min(sizes), 2) if sizes else None,
        "maxHa": round(max(sizes), 2) if sizes else None,
        "reported": len(sizes),
    }

    return {
        "mode": "live",
        "totals": {
            "farmers": total,
            "active": active,
            "inactive": inactive,
            "withSoilData": with_soil,
            "draftPlans": draft,
            "finalizedPlans": finalized,
            "noPlan": no_plan,
        },
        "rates": {
            "soilAdoptionPct": _pct(with_soil, total),
            "finalizedPct": _pct(finalized, total),
            "draftPct": _pct(draft, total),
            "noPlanPct": _pct(no_plan, total),
            "activePct": _pct(active, total),
        },
        "planStatus": [
            {"status": "Finalized", "count": finalized},
            {"status": "Draft", "count": draft},
            {"status": "No plan", "count": no_plan},
        ],
        "byDistrict": by_district,
        "topCrops": top_crops,
        "signupsByMonth": signups,
        "farmSize": farm_size,
        "insights": _build_insights(
            total=total,
            with_soil=with_soil,
            finalized=finalized,
            draft=draft,
            no_plan=no_plan,
            inactive=inactive,
            by_district=by_district,
            top_crops=top_crops,
        ),
    }
