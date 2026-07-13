from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import CropReference, DistrictCropAggregate, OversupplyAlert, OversupplyLevel
from app.db.models import FarmProfile
from app.ml.loader import district_oversupply_warning


def seed_reference_data(db: Session) -> None:
    settings = get_settings()
    crops = [
        ("tomato", "Tomato", "tomato"),
        ("maize", "Maize", "maize"),
        ("rice", "Rice", "rice"),
        ("potato", "Potato", "potato"),
        ("cabbage", "Cabbage", "cabbage"),
        ("onion", "Onion", "onion"),
        ("carrot", "Carrot", "carrot"),
        ("chili", "Chili", "chili"),
        ("beans", "Beans", "kidneybeans"),
    ]
    for slug, display, l1 in crops:
        if db.scalar(select(CropReference).where(CropReference.slug == slug)):
            continue
        db.add(CropReference(slug=slug, display_name=display, l1_label=l1))
    db.commit()

    year = datetime.now(UTC).year
    week = datetime.now(UTC).isocalendar().week
    demo_district = "demo-district"

    demo_counts = [("tomato", 128), ("maize", 83), ("rice", 68), ("cabbage", 30)]
    for slug, count in demo_counts:
        crop = db.scalar(select(CropReference).where(CropReference.slug == slug))
        if not crop:
            continue
        existing = db.scalar(
            select(DistrictCropAggregate).where(
                DistrictCropAggregate.district_code == demo_district,
                DistrictCropAggregate.crop_id == crop.id,
                DistrictCropAggregate.season_year == year,
                DistrictCropAggregate.week_number == week,
            )
        )
        if existing:
            continue
        db.add(
            DistrictCropAggregate(
                district_code=demo_district,
                crop_id=crop.id,
                season_year=year,
                week_number=week,
                plan_count=count,
            )
        )

        if district_oversupply_warning(count, settings.oversupply_threshold):
            level = OversupplyLevel.high if count >= settings.oversupply_threshold else OversupplyLevel.medium
            db.add(
                OversupplyAlert(
                    district_code=demo_district,
                    crop_id=crop.id,
                    threshold_count=settings.oversupply_threshold,
                    current_count=count,
                    risk_level=level,
                    warning_message=f"High {crop.display_name} concentration in district",
                )
            )
    db.commit()


def ensure_farm_has_demo_aggregates(db: Session, farm: FarmProfile) -> None:
    """Copy demo aggregates to user's district if they have none yet."""
    year = datetime.now(UTC).year
    week = datetime.now(UTC).isocalendar().week
    has = db.scalar(
        select(DistrictCropAggregate.id)
        .where(
            DistrictCropAggregate.district_code == farm.district_code,
            DistrictCropAggregate.season_year == year,
        )
        .limit(1)
    )
    if has:
        return

    demo = db.scalars(
        select(DistrictCropAggregate).where(DistrictCropAggregate.district_code == "demo-district")
    ).all()
    for row in demo:
        db.add(
            DistrictCropAggregate(
                district_code=farm.district_code,
                crop_id=row.crop_id,
                season_year=row.season_year,
                week_number=row.week_number,
                plan_count=max(10, row.plan_count // 2),
            )
        )
    db.commit()
