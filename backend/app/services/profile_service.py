from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.models import FarmProfile, RecommendationRun, SoilReading, UserAccount
from app.services.auth_service import user_to_json


def get_user_profile(db: Session, user: UserAccount) -> dict:
    farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))

    account = {
        "id": str(user.id),
        "email": user.email,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
    }

    if not farm:
        return {
            "user": user_to_json(user, None),
            "account": account,
            "farm": None,
            "savedData": {
                "soilReadingsCount": 0,
                "recommendationRunsCount": 0,
                "hasSoilData": False,
                "hasRecommendations": False,
                "lastSoilReading": None,
                "lastRecommendation": None,
                "recentSoilDates": [],
            },
        }

    from app.services.soil_service import soil_reading_to_json

    soil_count = (
        db.scalar(
            select(func.count()).select_from(SoilReading).where(SoilReading.farm_profile_id == farm.id)
        )
        or 0
    )
    rec_count = (
        db.scalar(
            select(func.count())
            .select_from(RecommendationRun)
            .where(RecommendationRun.farm_profile_id == farm.id)
        )
        or 0
    )

    latest_soil = db.scalar(
        select(SoilReading)
        .where(SoilReading.farm_profile_id == farm.id)
        .order_by(desc(SoilReading.recorded_at))
        .limit(1)
    )
    latest_run = db.scalar(
        select(RecommendationRun)
        .where(RecommendationRun.farm_profile_id == farm.id)
        .order_by(desc(RecommendationRun.created_at))
        .limit(1)
    )

    recent_soil = db.scalars(
        select(SoilReading)
        .where(SoilReading.farm_profile_id == farm.id)
        .order_by(desc(SoilReading.recorded_at))
        .limit(5)
    ).all()

    return {
        "user": user_to_json(user, farm),
        "account": account,
        "farm": {
            "id": str(farm.id),
            "district": farm.district_name,
            "region": farm.region_label,
            "areaHectares": float(farm.area_hectares) if farm.area_hectares else None,
            "countryCode": farm.country_code,
            "location": {
                "id": f"farm-{farm.id}",
                "label": farm.region_label,
                "fullLabel": farm.district_name or farm.region_label,
                "country": (farm.country_code or "GB").upper(),
                "source": "saved",
            }
            if farm.region_label
            else None,
        },
        "savedData": {
            "soilReadingsCount": soil_count,
            "recommendationRunsCount": rec_count,
            "hasSoilData": soil_count > 0,
            "hasRecommendations": rec_count > 0,
            "lastSoilReading": soil_reading_to_json(latest_soil, farm.region_label)
            if latest_soil
            else None,
            "lastRecommendation": {
                "topCrop": latest_run.top_crop,
                "runDate": latest_run.created_at.isoformat(),
                "profitEstimate": float(latest_run.top_profit_estimate)
                if latest_run.top_profit_estimate
                else None,
                "planStatus": (latest_run.ranked_output or {}).get("planStatus")
                or ("finalized" if latest_run.status.value == "completed" else "draft"),
                "finalized": bool((latest_run.ranked_output or {}).get("finalized"))
                or latest_run.status.value == "completed",
                "finalizedAt": (latest_run.ranked_output or {}).get("finalizedAt"),
                "selectedCrops": (latest_run.ranked_output or {}).get("selectedCrops") or [],
            }
            if latest_run
            else None,
            "recentSoilDates": [r.recorded_at.isoformat() for r in recent_soil],
        },
    }
