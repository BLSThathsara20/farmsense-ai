from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.models import FarmProfile, RecommendationRun, SoilReading, UserAccount
from app.services.auth_service import user_to_json
from app.services.soil_service import get_primary_farm, soil_reading_to_json


def get_user_profile(db: Session, user: UserAccount) -> dict:
    farm = get_primary_farm(db, user)

    soil_count = db.scalar(
        select(func.count()).select_from(SoilReading).where(SoilReading.farm_profile_id == farm.id)
    ) or 0
    rec_count = db.scalar(
        select(func.count())
        .select_from(RecommendationRun)
        .where(RecommendationRun.farm_profile_id == farm.id)
    ) or 0

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
        "account": {
            "id": str(user.id),
            "email": user.email,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
        },
        "farm": {
            "id": str(farm.id),
            "district": farm.district_name,
            "region": farm.region_label,
            "areaHectares": float(farm.area_hectares) if farm.area_hectares else None,
            "countryCode": farm.country_code,
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
            }
            if latest_run
            else None,
            "recentSoilDates": [r.recorded_at.isoformat() for r in recent_soil],
        },
    }
