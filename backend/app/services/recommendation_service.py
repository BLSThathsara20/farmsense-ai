from datetime import UTC, datetime

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from sqlalchemy.orm.attributes import flag_modified

from app.db.models import (
    ConfirmedCropPlan,
    CropReference,
    DistrictCropAggregate,
    FarmProfile,
    OversupplyAlert,
    RecommendationRun,
    RecommendationStatus,
    SoilReading,
)
from app.ml.loader import district_oversupply_warning, predict_suitability, rank_by_profit
from app.services.soil_service import soil_to_ml_vector

# Crops FarmSense markets as UK-relevant (aligns with GOV.UK / Plan UI)
UK_FOCUS_CROPS = {
    "tomato",
    "potato",
    "onion",
    "cabbage",
    "carrot",
    "beans",
    "bean",
    "chili",
    "chilli",
    "maize",
    "corn",
    "wheat",
}

# Labels that are agronomically poor fits for temperate UK field systems
TROPICAL_LABELS = {
    "rice",
    "jute",
    "coffee",
    "banana",
    "coconut",
    "papaya",
    "mango",
    "orange",
    "watermelon",
    "muskmelon",
    "pomegranate",
    "cotton",
    "pigeonpeas",
    "blackgram",
    "mungbean",
    "mothbeans",
    "lentil",
    "chickpea",
    "kidneybeans",
    "grapes",
    "apple",
}


def _title_case_crop(name: str) -> str:
    return name.replace("_", " ").title()


def _normalize_crop_key(name: str) -> str:
    return name.replace(" ", "_").replace("-", "_").lower().strip()


def _is_uk_focus(label: str) -> bool:
    k = _normalize_crop_key(label)
    return k in UK_FOCUS_CROPS or k.rstrip("s") in UK_FOCUS_CROPS


def _district_crop_share(
    db: Session | None,
    farm: FarmProfile | None,
    crop_name: str,
) -> tuple[float | None, float | None, str | None]:
    """Return district share/risk for a crop from finalized community plans when available."""
    if not db or not farm:
        return None, None, None

    now = datetime.now(UTC)
    crop = db.scalar(
        select(CropReference).where(CropReference.display_name.ilike(crop_name.strip())).limit(1)
    )
    if not crop:
        return None, None, None

    crop_count = (
        db.scalar(
            select(func.coalesce(func.sum(DistrictCropAggregate.plan_count), 0)).where(
                DistrictCropAggregate.district_code == farm.district_code,
                DistrictCropAggregate.crop_id == crop.id,
                DistrictCropAggregate.season_year == now.year,
                DistrictCropAggregate.week_number == now.isocalendar().week,
            )
        )
        or 0
    )
    district_total = (
        db.scalar(
            select(func.coalesce(func.sum(DistrictCropAggregate.plan_count), 0)).where(
                DistrictCropAggregate.district_code == farm.district_code,
                DistrictCropAggregate.season_year == now.year,
                DistrictCropAggregate.week_number == now.isocalendar().week,
            )
        )
        or 0
    )
    if district_total <= 0:
        return None, None, None

    settings = get_settings()
    share_pct = round((float(crop_count) / float(district_total)) * 100, 1)
    oversupply_risk = min(0.95, float(crop_count) / float(settings.oversupply_threshold))
    return (
        share_pct,
        oversupply_risk,
        f"{crop_count} of {district_total} finalized local plans chose {crop.display_name}.",
    )


def _select_ranked_probs(
    probabilities: dict[str, float],
    *,
    country_code: str,
    preferences: list[str],
    limit: int = 5,
) -> list[tuple[str, float]]:
    """For GB farms, rank only UK-focus RF classes (never tropical tops)."""
    items = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
    code = (country_code or "GB").upper()
    if code != "GB":
        return items[:limit]

    pref_keys = {_normalize_crop_key(p) for p in preferences}
    uk_map: dict[str, float] = {
        c: float(p) for c, p in probabilities.items() if _is_uk_focus(c)
    }
    for pref in preferences or []:
        pk = _normalize_crop_key(pref)
        match = next(
            (
                c
                for c in probabilities
                if _normalize_crop_key(c) == pk
                or _normalize_crop_key(c).rstrip("s") == pk.rstrip("s")
            ),
            None,
        )
        if match:
            uk_map[match] = max(float(probabilities.get(match, 0.0)), 0.08)
        elif pk in UK_FOCUS_CROPS or pk.rstrip("s") in UK_FOCUS_CROPS:
            uk_map[pref] = max(uk_map.get(pref, 0.0), 0.08)

    if uk_map:
        ranked = sorted(uk_map.items(), key=lambda x: x[1], reverse=True)
        ranked.sort(key=lambda x: (_normalize_crop_key(x[0]) not in pref_keys, -x[1]))
        return ranked[:limit]

    filtered = [
        (c, p) for c, p in items if _normalize_crop_key(c) not in TROPICAL_LABELS
    ]
    return (filtered or items)[:limit]


def build_recommendations_from_rf(
    probabilities: dict[str, float],
    preferences: list[str],
    ml_input: dict | None = None,
    *,
    db: Session | None = None,
    farm: FarmProfile | None = None,
    country_code: str = "GB",
    district: str | None = None,
    price_outlook: dict | None = None,
) -> list[dict]:
    """Rank crops with real multi-layer scores (soil RF + weather + price + demand)."""
    from app.ml.pipeline_layers import (
        forecast_crop_price_outlook,
        forecast_weather_outlook,
        score_demand_outlook,
    )
    from app.services.demand_signals_service import get_public_demand

    ml_input = ml_input or {
        "temperature": 20.0,
        "humidity": 70.0,
        "rainfall": 100.0,
    }
    generic_price = price_outlook
    ranked_probs = _select_ranked_probs(
        probabilities, country_code=country_code, preferences=preferences or []
    )
    top_prob = ranked_probs[0][1] if ranked_probs else 1.0
    recommendations = []

    for idx, (crop, prob) in enumerate(ranked_probs, start=1):
        display = _title_case_crop(crop)
        crop_key = _normalize_crop_key(crop)
        pref_boost = 8 if display in preferences or crop_key in {
            _normalize_crop_key(p) for p in preferences
        } else 0
        uk_boost = 6 if crop_key in UK_FOCUS_CROPS or crop_key.rstrip("s") in UK_FOCUS_CROPS else 0
        tropical_cut = 18 if crop_key in TROPICAL_LABELS else 0
        relative = (prob / top_prob) if top_prob > 0 else 0.0
        soil_match = int(
            min(99, max(1, round(relative * 92) + pref_boost + uk_boost - tropical_cut))
        )

        weather = forecast_weather_outlook(
            ml_input=ml_input,
            country_code=country_code,
            crop=display,
            district=district,
        )
        crop_price = forecast_crop_price_outlook(display)
        share_pct, district_risk, share_detail = _district_crop_share(db, farm, display)
        oversupply = district_risk if district_risk is not None else max(0.1, 0.7 - prob)

        search_change = None
        try:
            public = get_public_demand(display)
            search_change = public.get("googleTrendsChangePct")
        except Exception:
            search_change = None

        demand = score_demand_outlook(
            oversupply_risk=oversupply,
            district_plan_share=share_pct,
            search_change_pct=search_change,
        )
        if share_detail:
            demand["detail"] = f"{share_detail} {demand['detail']}"

        weather_fit = weather["score"]
        # Extra temperate filter — cool GB weeks should not promote rice/banana
        if (country_code or "GB").upper() == "GB" and crop_key in TROPICAL_LABELS:
            weather_fit = max(30, weather_fit - 20)

        price_trend = crop_price["score"]
        demand_signal = demand["score"]

        confidence = int(
            min(
                99,
                round(
                    0.35 * soil_match
                    + 0.22 * weather_fit
                    + 0.28 * price_trend
                    + 0.15 * demand_signal
                ),
            )
        )
        forecast_mean = crop_price.get("forecast_mean") or (
            generic_price.get("forecast_mean", 100) if generic_price else 100
        )
        profit = int(1800 + prob * 2600 + pref_boost * 20 + uk_boost * 15 + float(forecast_mean) * 8)

        soil_detail = (
            f"Your soil looks a {soil_match}% match for {display} "
            f"(N, P, K, pH and texture checked against what this crop needs)."
        )
        if (country_code or "GB").upper() == "GB" and uk_boost:
            soil_detail += " Good fit for UK growing conditions."
        if tropical_cut:
            soil_detail += " Less suited to cool UK field conditions."

        factors = [
            {
                "key": "soil",
                "title": "Soil status",
                "score": soil_match,
                "detail": soil_detail,
                "source": "rf_suitability.pkl · UK crop bias",
                "method": "l1_soil_uk_biased",
            },
            {
                "key": "weather",
                "title": "Weather forecast",
                "score": weather_fit,
                "detail": weather["detail"],
                "source": weather["source"],
                "method": weather["method"],
            },
            {
                "key": "price",
                "title": "Future price (£)",
                "score": price_trend,
                "detail": crop_price["detail"],
                "source": crop_price["source"],
                "method": crop_price["method"],
            },
            {
                "key": "demand",
                "title": "Demand and community pressure",
                "score": demand_signal,
                "detail": demand["detail"],
                "source": demand["source"],
                "method": demand["method"],
            },
        ]

        recommendations.append(
            {
                "id": idx,
                "crop": display,
                "confidence": confidence,
                "profitEstimate": profit,
                "soilMatch": soil_match,
                "weatherFit": weather_fit,
                "priceTrend": price_trend,
                "demandSignal": demand_signal,
                "factors": factors,
                "plantingWindow": {
                    "sow": "Week 3–4",
                    "harvest": "Week 14–16",
                    "sell": "Week 8–10",
                },
                "oversupplyRisk": round(oversupply, 2),
                "reasoning": (
                    f"{display} scored {confidence}% overall from UK-biased soil (L1), "
                    f"hybrid weather ({weather['method']}), dampened GOV.UK price, "
                    f"and public demand plus district planting signals."
                ),
                "rank": idx,
            }
        )
    return rank_by_profit(recommendations)


def generate_recommendation_run(db: Session, farm: FarmProfile, reading) -> dict:
    from app.ml.pipeline_layers import forecast_price_outlook

    ml_input = soil_to_ml_vector(reading)
    rf = predict_suitability(ml_input)
    price_outlook = forecast_price_outlook()
    recommendations = build_recommendations_from_rf(
        rf["probabilities"],
        reading.crop_preferences or [],
        ml_input,
        db=db,
        farm=farm,
        country_code=farm.country_code or "GB",
        district=farm.district_name or farm.region_label,
        price_outlook=price_outlook,
    )
    for i, rec in enumerate(recommendations, start=1):
        rec["rank"] = i

    top_name = recommendations[0]["crop"] if recommendations else "Crop"
    title = f"Plan · {top_name} · {datetime.now(UTC).strftime('%d %b %Y')}"

    payload = {
        "recommendations": recommendations,
        "topRecommendation": recommendations[0] if recommendations else None,
        "runDate": datetime.now(UTC).isoformat(),
        # Draft until farmer taps Confirm on Recommendations
        "planStatus": "draft",
        "finalized": False,
        "finalizedAt": None,
        "selectedCrops": [],
        "runId": None,
        "planId": None,
        "title": title,
        "modelLayers": {
            "l1": "rf_suitability.pkl",
            "l2_weather": "lstm_weather.h5 + Open-Meteo agri (ET₀, soil moisture)",
            "l3_price": "GOV.UK crop indices + lstm_price.h5",
            "l4_demand": "district aggregates + Google Trends / Wikipedia",
        },
        "rfTopLabel": rf["label"],
        "priceOutlook": {
            "latestIndex": price_outlook.get("latest_index"),
            "forecastMean": price_outlook.get("forecast_mean"),
            "changePct": price_outlook.get("change_pct"),
            "method": price_outlook.get("method"),
        },
        "decisionBasis": [
            "Soil status — Random Forest (L1)",
            "Weather — LSTM + Open-Meteo agri ET₀ / soil moisture (L2)",
            "Future price — GOV.UK crop indices + LSTM (L3)",
            "Market demand — district planting + UK search interest",
        ],
    }

    run = RecommendationRun(
        farm_profile_id=farm.id,
        soil_reading_id=reading.id,
        title=title,
        model_bundle_version="v2-layers",
        status=RecommendationStatus.partial,  # draft — not finalized yet
        ranked_output=payload,
        top_crop=recommendations[0]["crop"] if recommendations else None,
        top_profit_estimate=recommendations[0]["profitEstimate"] if recommendations else None,
        explainability={"rf": rf, "price": price_outlook},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    payload["runId"] = str(run.id)
    payload["planId"] = str(run.id)
    run.ranked_output = payload
    flag_modified(run, "ranked_output")
    db.commit()
    return payload


def _resolve_crop(db: Session, name: str) -> CropReference | None:
    return db.scalar(
        select(CropReference).where(CropReference.display_name.ilike(name)).limit(1)
    )


def _bump_district_plans(
    db: Session,
    farm: FarmProfile,
    crop_names: list[str],
    *,
    run: RecommendationRun | None = None,
) -> None:
    """Count finalized crop choices toward district planting pressure + confirmed_crop_plan rows."""
    year = datetime.now(UTC).year
    week = datetime.now(UTC).isocalendar().week
    for name in crop_names:
        crop = _resolve_crop(db, name)
        if not crop:
            continue
        agg = db.scalar(
            select(DistrictCropAggregate).where(
                DistrictCropAggregate.district_code == farm.district_code,
                DistrictCropAggregate.crop_id == crop.id,
                DistrictCropAggregate.season_year == year,
                DistrictCropAggregate.week_number == week,
            )
        )
        if agg:
            agg.plan_count = int(agg.plan_count or 0) + 1
        else:
            db.add(
                DistrictCropAggregate(
                    district_code=farm.district_code,
                    crop_id=crop.id,
                    season_year=year,
                    week_number=week,
                    plan_count=1,
                )
            )
        if run is not None:
            db.add(
                ConfirmedCropPlan(
                    farm_profile_id=farm.id,
                    recommendation_run_id=run.id,
                    crop_id=crop.id,
                    season_year=year,
                    week_number=week,
                    contributes_to_district=True,
                )
            )


def _decrement_district_for_run(db: Session, farm: FarmProfile, run: RecommendationRun) -> None:
    """Remove confirmed_crop_plan rows and decrement district aggregates for a finalized plan."""
    rows = db.scalars(
        select(ConfirmedCropPlan).where(
            ConfirmedCropPlan.recommendation_run_id == run.id,
            ConfirmedCropPlan.contributes_to_district.is_(True),
        )
    ).all()
    for row in rows:
        agg = db.scalar(
            select(DistrictCropAggregate).where(
                DistrictCropAggregate.district_code == farm.district_code,
                DistrictCropAggregate.crop_id == row.crop_id,
                DistrictCropAggregate.season_year == row.season_year,
                DistrictCropAggregate.week_number == row.week_number,
            )
        )
        if agg and int(agg.plan_count or 0) > 0:
            agg.plan_count = int(agg.plan_count) - 1
        db.delete(row)


def _plan_payload_from_run(run: RecommendationRun) -> dict:
    payload = dict(run.ranked_output or {})
    payload["runId"] = str(run.id)
    payload["planId"] = str(run.id)
    payload["title"] = run.title or payload.get("title") or f"Plan · {run.top_crop or 'Crop'}"
    if run.created_at:
        payload["createdAt"] = run.created_at.isoformat()
    if run.status == RecommendationStatus.completed:
        payload.setdefault("planStatus", "finalized")
        payload.setdefault("finalized", True)
    else:
        payload.setdefault("planStatus", "draft")
        payload.setdefault("finalized", False)
    return payload


def _get_farm_run(db: Session, farm: FarmProfile, run_id) -> RecommendationRun | None:
    import uuid as uuid_mod

    try:
        rid = run_id if isinstance(run_id, uuid_mod.UUID) else uuid_mod.UUID(str(run_id))
    except (ValueError, TypeError):
        return None
    return db.scalar(
        select(RecommendationRun).where(
            RecommendationRun.id == rid,
            RecommendationRun.farm_profile_id == farm.id,
        )
    )


def list_plans(db: Session, farm: FarmProfile) -> list[dict]:
    runs = db.scalars(
        select(RecommendationRun)
        .where(RecommendationRun.farm_profile_id == farm.id)
        .order_by(desc(RecommendationRun.created_at))
    ).all()
    items = []
    for run in runs:
        payload = _plan_payload_from_run(run)
        selected = payload.get("selectedCrops") or []
        items.append(
            {
                "planId": str(run.id),
                "runId": str(run.id),
                "title": payload.get("title"),
                "planStatus": payload.get("planStatus"),
                "finalized": bool(payload.get("finalized")),
                "finalizedAt": payload.get("finalizedAt"),
                "topCrop": run.top_crop or (selected[0].get("crop") if selected else None),
                "topProfitEstimate": float(run.top_profit_estimate)
                if run.top_profit_estimate is not None
                else None,
                "selectedCrops": [
                    {"id": c.get("id"), "crop": c.get("crop"), "confidence": c.get("confidence")}
                    for c in selected
                ],
                "createdAt": run.created_at.isoformat() if run.created_at else None,
                "runDate": payload.get("runDate"),
            }
        )
    return items


def get_plan(db: Session, farm: FarmProfile, run_id) -> dict | None:
    run = _get_farm_run(db, farm, run_id)
    if not run:
        return None
    payload = _plan_payload_from_run(run)
    if run.soil_reading_id:
        reading = db.get(SoilReading, run.soil_reading_id)
        if reading:
            from app.services.soil_service import soil_reading_to_json

            payload["soilReading"] = soil_reading_to_json(reading, farm.region_label)
    return payload


def plans_overview(db: Session, farm: FarmProfile) -> dict:
    plans = list_plans(db, farm)
    drafts = [p for p in plans if p.get("planStatus") == "draft" and not p.get("finalized")]
    finalized = [p for p in plans if p.get("finalized") or p.get("planStatus") == "finalized"]
    crop_map: dict[str, dict] = {}
    for p in finalized:
        for c in p.get("selectedCrops") or []:
            name = c.get("crop")
            if not name:
                continue
            if name not in crop_map:
                crop_map[name] = {
                    "crop": name,
                    "planId": p["planId"],
                    "planTitle": p.get("title"),
                    "confidence": c.get("confidence"),
                }
    return {
        "totalPlans": len(plans),
        "draftCount": len(drafts),
        "finalizedCount": len(finalized),
        "allSelectedCrops": list(crop_map.values()),
        "plans": plans,
        "latestPlanId": plans[0]["planId"] if plans else None,
        "latestActivity": [
            {
                "planId": p["planId"],
                "title": p.get("title"),
                "status": p.get("planStatus"),
                "date": (p.get("finalizedAt") or p.get("createdAt") or "")[:10],
            }
            for p in plans[:5]
        ],
    }


def rename_plan(db: Session, farm: FarmProfile, run_id, title: str) -> dict:
    run = _get_farm_run(db, farm, run_id)
    if not run:
        raise ValueError("Plan not found.")
    clean = (title or "").strip()[:160]
    if not clean:
        raise ValueError("Title cannot be empty.")
    run.title = clean
    payload = dict(run.ranked_output or {})
    payload["title"] = clean
    run.ranked_output = payload
    flag_modified(run, "ranked_output")
    db.commit()
    db.refresh(run)
    return _plan_payload_from_run(run)


def finalize_recommendation_run(
    db: Session,
    farm: FarmProfile,
    selected_crop_ids: list[int],
    run_id=None,
) -> dict:
    """Lock in the farmer's crop choices for a specific plan (or latest if run_id omitted)."""
    if run_id is not None:
        run = _get_farm_run(db, farm, run_id)
        if not run:
            raise ValueError("Plan not found.")
    else:
        run = db.scalar(
            select(RecommendationRun)
            .where(RecommendationRun.farm_profile_id == farm.id)
            .order_by(desc(RecommendationRun.created_at))
            .limit(1)
        )
    if not run:
        raise ValueError("No recommendation run to finalize — submit soil plan first.")

    payload = dict(run.ranked_output or {})
    already_final = bool(payload.get("finalized")) or run.status == RecommendationStatus.completed
    all_recs = payload.get("recommendations") or []
    if not all_recs:
        raise ValueError("Recommendation run has no crops.")

    id_set = set(selected_crop_ids)
    selected = [r for r in all_recs if r.get("id") in id_set]
    if not selected:
        raise ValueError("Pick at least one recommended crop to confirm.")

    # Prefer highest-confidence selected as the "top" displayed plan
    selected_sorted = sorted(selected, key=lambda r: r.get("confidence", 0), reverse=True)
    now = datetime.now(UTC).isoformat()
    payload.update(
        {
            "planStatus": "finalized",
            "finalized": True,
            "finalizedAt": now,
            "selectedCrops": selected_sorted,
            "topRecommendation": selected_sorted[0],
            "runId": str(run.id),
            "planId": str(run.id),
            "title": run.title or payload.get("title"),
        }
    )

    # Re-finalize: remove previous district contributions first
    if already_final:
        _decrement_district_for_run(db, farm, run)

    run.ranked_output = payload
    flag_modified(run, "ranked_output")
    run.status = RecommendationStatus.completed
    run.top_crop = selected_sorted[0].get("crop")
    run.top_profit_estimate = selected_sorted[0].get("profitEstimate")
    if run.top_crop and not run.title:
        run.title = f"Plan · {run.top_crop} · {datetime.now(UTC).strftime('%d %b %Y')}"
        payload["title"] = run.title

    _bump_district_plans(
        db,
        farm,
        [c.get("crop") for c in selected_sorted if c.get("crop")],
        run=run,
    )
    db.commit()
    db.refresh(run)
    return _plan_payload_from_run(run)


def delete_plan(db: Session, farm: FarmProfile, run_id) -> dict:
    """Delete one plan and adjust district aggregates if it was finalized."""
    run = _get_farm_run(db, farm, run_id)
    if not run:
        raise ValueError("Plan not found.")
    _decrement_district_for_run(db, farm, run)
    db.delete(run)
    db.commit()
    return {"deleted": True, "planId": str(run_id), "runsDeleted": 1}


def delete_recommendation_plans(db: Session, farm: FarmProfile) -> dict:
    """Permanently delete all crop-plan recommendation runs for this farm."""
    runs = db.scalars(
        select(RecommendationRun).where(RecommendationRun.farm_profile_id == farm.id)
    ).all()
    count = len(runs)
    for run in runs:
        _decrement_district_for_run(db, farm, run)
        db.delete(run)
    db.commit()
    return {"deleted": True, "runsDeleted": count}


def latest_recommendations(db: Session, farm: FarmProfile) -> dict | None:
    run = db.scalar(
        select(RecommendationRun)
        .where(RecommendationRun.farm_profile_id == farm.id)
        .order_by(desc(RecommendationRun.created_at))
        .limit(1)
    )
    if not run:
        return None
    return _plan_payload_from_run(run)


def get_market_payload(db: Session, crop_name: str, *, demo_data_mode: bool = False) -> dict:
    from app.ml.pipeline_layers import build_weekly_price_payload_from_series, forecast_price_outlook
    from app.services.market_data_service import build_crop_market_payload

    try:
        return build_crop_market_payload(db, crop_name, demo_data_mode=demo_data_mode)
    except Exception:
        # Fallback: general ag index from price_weekly.csv
        try:
            outlook = forecast_price_outlook()
            weekly = build_weekly_price_payload_from_series()
            current = outlook["latest_index"]
            trend = outlook["change_pct"]
        except Exception:
            crop = db.scalar(
                select(CropReference).where(CropReference.display_name.ilike(crop_name)).limit(1)
            )
            base = 40.0 if not crop else 30 + (crop.id % 7) * 5
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
            current = base + 8
            trend = 2.0

        verdict = "good" if trend > 1 else "wait" if trend > -3 else "avoid"
        message = (
            f"Price index outlook {trend:+.1f}% over the next few weeks — favourable to sell."
            if verdict == "good"
            else "Price outlook is soft — monitor before selling."
            if verdict == "wait"
            else "Price outlook is falling — avoid selling if you can wait."
        )
        return {
            "currentPrice": round(float(current), 1),
            "priceUnit": "index",
            "trend": round(float(trend), 1),
            "sellVerdict": verdict,
            "sellMessage": message,
            "demand": {
                "googleTrends": "Rising" if trend > 0 else "Stable",
                "googleTrendsLabel": "Index momentum",
                "googleTrendsDetail": "General ag index (crop-specific GOV.UK series unavailable).",
                "reddit": "From price series",
                "redditLabel": "Farmer planting",
                "redditDetail": "Community planting share unavailable.",
            },
            "weeklyPrices": weekly,
            "source": "price_weekly.csv",
            "category": "crop_products",
            "proxyNote": None,
            "asOf": None,
        }


def list_active_crops(db: Session) -> list[str]:
    rows = db.scalars(select(CropReference.display_name).where(CropReference.is_active.is_(True))).all()
    return list(rows) or ["Tomato", "Maize", "Rice", "Potato", "Cabbage"]


def community_payload(db: Session, farm: FarmProfile, *, demo_data_mode: bool = False) -> dict:
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
        if demo_data_mode:
            return _demo_community_payload(farm.district_name, week)
        return {
            "district": farm.district_name,
            "week": f"Week {week}",
            "cropPopularity": [],
            "oversupplyRisk": [],
            "empty": True,
            "demo": False,
            "message": "No finalized plans in this district this week yet. Counts appear after farmers finalize crop plans.",
        }

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
        "empty": False,
        "demo": False,
    }


def _demo_community_payload(district_name: str, week: int) -> dict:
    """Sample district view — only used when Demo data mode is on and real counts are missing."""
    return {
        "district": district_name,
        "week": f"Week {week}",
        "cropPopularity": [
            {"crop": "Tomato", "percentage": 34, "farmers": 12},
            {"crop": "Potato", "percentage": 28, "farmers": 10},
            {"crop": "Cabbage", "percentage": 22, "farmers": 8},
            {"crop": "Onion", "percentage": 16, "farmers": 6},
        ],
        "oversupplyRisk": [
            {"crop": "Tomato", "risk": 0.55, "level": "medium"},
            {"crop": "Potato", "risk": 0.35, "level": "medium"},
            {"crop": "Cabbage", "risk": 0.2, "level": "low"},
            {"crop": "Onion", "risk": 0.15, "level": "low"},
        ],
        "empty": False,
        "demo": True,
        "message": "Sample data for demos — turn off Demo data mode in Settings to see live district counts only.",
    }


def dashboard_payload(db: Session, user, farm: FarmProfile, recs: dict | None, reading) -> dict:
    overview = plans_overview(db, farm)
    top = recs.get("topRecommendation") if recs else None
    # Prefer first finalized crop across plans for overall headline when available
    overall_crops = overview.get("allSelectedCrops") or []
    if overall_crops and not top:
        top = {"crop": overall_crops[0]["crop"], "confidence": overall_crops[0].get("confidence") or 0}

    stats = {
        "topCropScore": top["confidence"] if top else 0,
        "priceTrend": top.get("priceTrend", 0) if top else 0,
        "demandSignal": "Rising",
        "sellWindow": {"start": 8, "end": 10},
        "oversupplyWarning": None,
        "recentActivity": [],
        "draftCount": overview.get("draftCount", 0),
        "finalizedCount": overview.get("finalizedCount", 0),
        "totalPlans": overview.get("totalPlans", 0),
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
    for act in overview.get("latestActivity") or []:
        stats["recentActivity"].append(
            {
                "type": "plan",
                "message": f"{act.get('title') or 'Plan'} ({act.get('status')})",
                "date": act.get("date"),
                "planId": act.get("planId"),
            }
        )

    from app.services.auth_service import user_to_json
    from app.services.soil_service import soil_reading_to_json

    return {
        "stats": stats,
        "topRecommendation": top,
        "recommendations": recs.get("recommendations", []) if recs else [],
        "soilReadings": soil_reading_to_json(reading, farm.region_label) if reading else {},
        "currentFarmer": user_to_json(user, farm),
        "hasSoilData": reading is not None or overview.get("totalPlans", 0) > 0,
        "planStatus": recs.get("planStatus") if recs else None,
        "finalized": bool(recs.get("finalized")) if recs else False,
        "selectedCrops": recs.get("selectedCrops") or [] if recs else [],
        "finalizedAt": recs.get("finalizedAt") if recs else None,
        "plansOverview": overview,
        "allSelectedCrops": overall_crops,
        "latestPlanId": overview.get("latestPlanId"),
    }
