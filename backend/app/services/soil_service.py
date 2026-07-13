from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.models import FarmProfile, SoilReading, UserAccount


def get_primary_farm(db: Session, user: UserAccount) -> FarmProfile:
    farm = db.scalar(select(FarmProfile).where(FarmProfile.user_id == user.id).limit(1))
    if not farm:
        raise NotFoundError("Farm profile not found")
    return farm


def create_soil_reading(db: Session, farm: FarmProfile, payload: dict) -> SoilReading:
    reading = SoilReading(
        farm_profile_id=farm.id,
        nitrogen=payload["nitrogen"],
        phosphorus=payload["phosphorus"],
        potassium=payload["potassium"],
        ph=payload["ph"],
        temperature=payload.get("temperature", 20.0),
        humidity=payload.get("humidity", 70.0),
        rainfall=payload.get("rainfall", 100.0),
        texture=payload.get("texture") or None,
        crop_preferences=payload.get("preferences") or [],
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


def soil_to_ml_vector(reading: SoilReading) -> dict:
    return {
        "N": float(reading.nitrogen),
        "P": float(reading.phosphorus),
        "K": float(reading.potassium),
        "temperature": float(reading.temperature or 20.0),
        "humidity": float(reading.humidity or 70.0),
        "ph": float(reading.ph),
        "rainfall": float(reading.rainfall or 100.0),
    }


def soil_reading_to_json(reading: SoilReading, region: str | None = None) -> dict:
    return {
        "region": region,
        "area": None,
        "nitrogen": float(reading.nitrogen),
        "phosphorus": float(reading.phosphorus),
        "potassium": float(reading.potassium),
        "ph": float(reading.ph),
        "texture": reading.texture,
        "preferences": reading.crop_preferences or [],
        "lastUpdated": reading.recorded_at.isoformat(),
    }
