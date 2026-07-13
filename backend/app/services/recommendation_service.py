from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import CropReference, DistrictCropAggregate, FarmProfile, OversupplyAlert, RecommendationRun
from app.ml.loader import district_oversupply_warning, predict_suitability, rank_by_profit
from app.services.soil_service import soil_to_ml_vector


def _title_case_crop(name: str) -> str:
    return name.replace("_", " ").title()


def build_recommendations_from_rf(probabilities: dict[str, float], preferences: list[str]) -> list[dict]:
    ranked_probs = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)[:5]
    recommendations = []
    for idx, (crop, prob) in enumerate(ranked_probs, start=1):
        display = _title_case_crop(crop)
        pref_boost = 8 if display in preferences or crop in [p.lower() for p in preferences] else 0
        soil_match = int(min(99, prob * 100 + pref_boost))
        profit = int(1800 + prob * 2600 + pref_boost * 20)
        recommendations.append(
            {
                "id": idx,
                "crop": display,
                "confidence": soil_match,
                "profitEstimate": profit,
                "soilMatch": soil_match,
                "weatherFit": max(65, soil_match - 6),
                "priceTrend": max(55, soil_match - 10),
                "demandSignal": max(58, soil_match - 8),
                "plantingWindow": {
                    "sow": "Week 3–4",
                    "harvest": "Week 14–16",
                    "sell": "Week 8–10",
                },
                "oversupplyRisk": round(max(0.1, 0.7 - prob), 2),
                "reasoning": f"L1 Random Forest suitability {prob:.1%} for {display}.",
                "rank": idx,
            }
        )
    return rank_by_profit(recommendations)


def generate_recommendation_run(db: Session, farm: FarmProfile, reading) -> dict:
    ml_input = soil_to_ml_vector(reading)
    rf = predict_suitability(ml_input)
    recommendations = build_recommendations_from_rf(
        rf["probabilities"],
        reading.crop_preferences or [],
    )
    for i, rec in enumerate(recommendations, start=1):
        rec["rank"] = i

    payload = {
        "recommendations": recommendations,
        "topRecommendation": recommendations[0] if recommendations else None,
        "runDate": datetime.now(UTC).isoformat(),
        "modelLayers": {"l1": "rf_suitability.pkl"},
        "rfTopLabel": rf["label"],
    }

    run = RecommendationRun(
        farm_profile_id=farm.id,
        soil_reading_id=reading.id,
        model_bundle_version="v1",
        ranked_output=payload,
        top_crop=recommendations[0]["crop"] if recommendations else None,
        top_profit_estimate=recommendations[0]["profitEstimate"] if recommendations else None,
        explainability={"rf": rf},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return payload


def latest_recommendations(db: Session, farm: FarmProfile) -> dict | None:
    run = db.scalar(
        select(RecommendationRun)
        .where(RecommendationRun.farm_profile_id == farm.id)
        .order_by(desc(RecommendationRun.created_at))
        .limit(1)
    )
    return run.ranked_output if run else None


def get_market_payload(db: Session, crop_name: str) -> dict:
    crop = db.scalar(
        select(CropReference).where(CropReference.display_name.ilike(crop_name)).limit(1)
    )
    base = 40.0
    if crop:
        base = 30 + (crop.id % 7) * 5

    weekly = []
    for i in range(-6, 6):
        is_forecast = i >= 0
        price = round(base + i * 0.6, 1)
        weekly.append(
            {
                "week": f"W{i + 7}" if i < 0 else f"W{i + 1}",
                "weekNum": i,
                "price": price,
                "forecast": price + 2 if is_forecast else None,
                "lower": price - 3 if is_forecast else None,
                "upper": price + 5 if is_forecast else None,
                "isForecast": is_forecast,
            }
        )

    trend = 7.2 if crop_name.lower() != "cabbage" else -8.4
    verdict = "good" if trend > 0 else "wait" if trend > -5 else "avoid"
    return {
        "currentPrice": round(base + 8, 1),
        "trend": trend,
        "sellVerdict": verdict,
        "sellMessage": "Prices are rising — good time to sell within the next 2 weeks."
        if verdict == "good"
        else "Monitor market before selling.",
        "demand": {"googleTrends": "Rising" if trend > 0 else "Stable", "reddit": "Positive sentiment"},
        "weeklyPrices": weekly,
    }


def list_active_crops(db: Session) -> list[str]:
    rows = db.scalars(select(CropReference.display_name).where(CropReference.is_active.is_(True))).all()
    return list(rows) or ["Tomato", "Maize", "Rice", "Potato", "Cabbage"]


def community_payload(db: Session, farm: FarmProfile) -> dict:
    settings = get_settings()
    year = datetime.now(UTC).year
    week = datetime.now(UTC).isocalendar().week

    aggregates = db.scalars(
        select(DistrictCropAggregate)
        .where(
            DistrictCropAggregate.district_code == farm.district_code,
            DistrictCropAggregate.season_year == year,
            DistrictCropAggregate.week_number == week,
        )
        .order_by(DistrictCropAggregate.plan_count.desc())
    ).all()

    if not aggregates:
        return _default_community(farm.district_name)

    total = sum(a.plan_count for a in aggregates) or 1
    crop_popularity = []
    oversupply_risk = []
    for agg in aggregates:
        crop = db.get(CropReference, agg.crop_id)
        if not crop:
            continue
        pct = round(100.0 * agg.plan_count / total, 1)
        crop_popularity.append(
            {"crop": crop.display_name, "percentage": pct, "farmers": agg.plan_count}
        )
        risk = min(0.95, agg.plan_count / settings.oversupply_threshold)
        level = "high" if risk >= 0.65 else "medium" if risk >= 0.35 else "low"
        oversupply_risk.append({"crop": crop.display_name, "risk": round(risk, 2), "level": level})

    return {
        "district": farm.district_name,
        "week": f"Week {week}",
        "cropPopularity": crop_popularity,
        "oversupplyRisk": oversupply_risk,
    }


def _default_community(district_name: str) -> dict:
    return {
        "district": district_name,
        "week": f"Week {datetime.now(UTC).isocalendar().week}",
        "cropPopularity": [
            {"crop": "Tomato", "percentage": 34, "farmers": 128},
            {"crop": "Maize", "percentage": 22, "farmers": 83},
            {"crop": "Rice", "percentage": 18, "farmers": 68},
        ],
        "oversupplyRisk": [
            {"crop": "Cabbage", "risk": 0.72, "level": "high"},
            {"crop": "Tomato", "risk": 0.15, "level": "low"},
        ],
    }


def dashboard_payload(db: Session, user, farm: FarmProfile, recs: dict | None, reading) -> dict:
    top = recs.get("topRecommendation") if recs else None
    stats = {
        "topCropScore": top["confidence"] if top else 0,
        "priceTrend": top.get("priceTrend", 0) if top else 0,
        "demandSignal": "Rising",
        "sellWindow": {"start": 8, "end": 10},
        "oversupplyWarning": None,
        "recentActivity": [],
    }
    if top and top.get("oversupplyRisk", 0) >= 0.65:
        stats["oversupplyWarning"] = {
            "crop": top["crop"],
            "risk": top["oversupplyRisk"],
            "message": f"High {top['crop']} planting in your district — consider alternatives.",
        }
    if reading:
        stats["recentActivity"].append(
            {"type": "soil", "message": "Soil reading updated", "date": reading.recorded_at.date().isoformat()}
        )
    if recs:
        stats["recentActivity"].append(
            {"type": "recommendation", "message": "Crop plan generated", "date": recs["runDate"][:10]}
        )

    from app.services.auth_service import user_to_json
    from app.services.soil_service import soil_reading_to_json

    return {
        "stats": stats,
        "topRecommendation": top,
        "recommendations": recs.get("recommendations", []) if recs else [],
        "soilReadings": soil_reading_to_json(reading, farm.region_label) if reading else {},
        "currentFarmer": user_to_json(user, farm),
        "hasSoilData": reading is not None,
    }
