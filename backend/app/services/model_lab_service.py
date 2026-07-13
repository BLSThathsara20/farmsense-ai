"""Admin model lab — run each pipeline layer with custom JSON input."""

from __future__ import annotations

import time
import traceback
from typing import Any

from app.core.config import get_settings
from app.ml.loader import FEATURES, ModelNotFoundError, get_model, predict_suitability
from app.ml.pipeline_layers import (
    forecast_crop_price_outlook,
    forecast_price_outlook,
    forecast_weather_outlook,
    heavy_mode_enabled,
    score_demand_outlook,
)
from app.services.recommendation_service import build_recommendations_from_rf

# Crops accepted by the admin model lab (must match Plan / GOV.UK mappings)
KNOWN_LAB_CROPS = [
    "Tomato",
    "Potato",
    "Onion",
    "Cabbage",
    "Carrot",
    "Beans",
    "Chili",
    "Maize",
    "Rice",
    "Wheat",
]


def _normalize_lab_crop(name: str) -> str:
    return " ".join(str(name).strip().lower().replace("_", " ").split())


def _resolve_known_crop(crop: str | None) -> str | None:
    """Return canonical crop display name, or None if blank."""
    if crop is None:
        return None
    raw = str(crop).strip()
    if not raw:
        return None
    key = _normalize_lab_crop(raw)
    aliases = {
        "chilli": "Chili",
        "chilli pepper": "Chili",
        "green beans": "Beans",
        "bean": "Beans",
        "corn": "Maize",
    }
    if key in aliases:
        return aliases[key]
    for known in KNOWN_LAB_CROPS:
        if _normalize_lab_crop(known) == key:
            return known
    raise ValueError(
        f"Unknown crop '{raw}'. Use one of: {', '.join(KNOWN_LAB_CROPS)}"
    )


def _require_known_crop(payload: dict, *, required: bool = False) -> str | None:
    crop = payload.get("crop")
    if crop is None or str(crop).strip() == "":
        if required:
            raise ValueError(f"crop is required. Use one of: {', '.join(KNOWN_LAB_CROPS)}")
        return None
    return _resolve_known_crop(str(crop))


def _latency_ms(started: float) -> int:
    return int(round((time.perf_counter() - started) * 1000))


def _artefact_info(name: str) -> dict[str, Any]:
    path = get_settings().resolved_ml_artifacts_dir / name
    return {
        "file": name,
        "exists": path.exists(),
        "bytes": path.stat().st_size if path.exists() else 0,
    }


def _highlights(*pairs: tuple[str, Any]) -> list[dict[str, str]]:
    out = []
    for label, value in pairs:
        if value is None or value == "":
            continue
        out.append({"label": label, "value": str(value)})
    return out


def model_lab_status() -> dict[str, Any]:
    settings = get_settings()
    artifacts = settings.resolved_ml_artifacts_dir
    l1_ok = False
    l1_error = None
    try:
        get_model()
        l1_ok = True
    except Exception as exc:  # noqa: BLE001
        l1_error = str(exc)

    tf_ok = False
    l2_ok = False
    l3_ok = False
    if settings.ml_heavy:
        try:
            from app.ml.lstm_inference import tensorflow_available, warm_lstm_models

            tf_ok = tensorflow_available()
            if tf_ok:
                warm = warm_lstm_models()
                l2_ok = bool(warm.get("weather"))
                l3_ok = bool(warm.get("price"))
        except Exception:
            pass

    return {
        "heavy": heavy_mode_enabled(),
        "artifactsDir": str(artifacts),
        "features": FEATURES,
        "knownCrops": KNOWN_LAB_CROPS,
        "enrichment": [
            "Open-Meteo agri (ET₀, soil moisture) — free",
            "GOV.UK crop price indices — free",
            "Google Trends UK + Wikipedia — free",
        ],
        "layers": {
            "soil": {
                "id": "soil",
                "name": "L1 Soil suitability",
                "model": "rf_suitability.pkl",
                "ready": l1_ok,
                "error": l1_error,
                "artefact": _artefact_info("rf_suitability.pkl"),
            },
            "weather": {
                "id": "weather",
                "name": "L2 Hybrid weather",
                "model": "LSTM + Open-Meteo agri",
                "ready": l2_ok or not settings.ml_heavy,
                "tensorflow": tf_ok,
                "artefact": _artefact_info("lstm_weather.h5"),
                "scaler": _artefact_info("scaler_weather.pkl"),
                "history": _artefact_info("weather_weekly.csv"),
            },
            "price": {
                "id": "price",
                "name": "L3 Crop price",
                "model": "GOV.UK index + LSTM",
                "ready": l3_ok or not settings.ml_heavy,
                "tensorflow": tf_ok,
                "artefact": _artefact_info("lstm_price.h5"),
                "scaler": _artefact_info("scaler_price.pkl"),
                "history": _artefact_info("govuk_price_indices.csv"),
            },
            "demand": {
                "id": "demand",
                "name": "L4 Demand + search",
                "model": "planting + Trends/Wiki",
                "ready": True,
            },
            "trends": {
                "id": "trends",
                "name": "Public demand signals",
                "model": "Google Trends UK + Wikipedia",
                "ready": True,
            },
            "recommendation": {
                "id": "recommendation",
                "name": "Full recommendation stack",
                "model": "L1 + hybrid L2 + GOV.UK L3 + L4",
                "ready": l1_ok,
            },
        },
    }


def _run_soil(payload: dict) -> dict[str, Any]:
    started = time.perf_counter()
    soil = {k: float(payload[k]) for k in FEATURES}
    result = predict_suitability(soil)
    probs = result.get("probabilities") or {}
    top = sorted(probs.items(), key=lambda x: x[1], reverse=True)[:5]
    top_crops = [{"crop": c, "probability": round(float(p), 4)} for c, p in top]
    return {
        "ok": True,
        "layer": "soil",
        "model": "rf_suitability.pkl",
        "latencyMs": _latency_ms(started),
        "summary": (
            f"Top prediction: {result.get('label')}"
            + (f" ({top_crops[0]['probability']:.0%})" if top_crops else "")
        ),
        "highlights": _highlights(
            ("Predicted crop", result.get("label")),
            ("Top match", f"{top_crops[0]['crop']} · {top_crops[0]['probability']:.0%}" if top_crops else None),
            ("#2", f"{top_crops[1]['crop']} · {top_crops[1]['probability']:.0%}" if len(top_crops) > 1 else None),
            ("Features", ", ".join(FEATURES)),
        ),
        "input": soil,
        "label": result.get("label"),
        "topCrops": top_crops,
        "probabilities": {k: round(float(v), 4) for k, v in probs.items()},
    }


def _run_weather(payload: dict) -> dict[str, Any]:
    started = time.perf_counter()
    crop = _require_known_crop(payload, required=True) or "Tomato"
    country = str(payload.get("countryCode") or "GB")
    district = payload.get("district")
    ml_input = payload.get("mlInput") or {
        "temperature": float(payload.get("temperature", 20)),
        "rainfall": float(payload.get("rainfall", 100)),
        "humidity": float(payload.get("humidity", 70)),
    }
    result = forecast_weather_outlook(
        ml_input=ml_input,
        country_code=country,
        crop=crop,
        district=str(district) if district else None,
        lat=payload.get("lat"),
        lon=payload.get("lon"),
    )
    return {
        "ok": True,
        "layer": "weather",
        "model": result.get("method") or "lstm_weather.h5",
        "latencyMs": _latency_ms(started),
        "summary": result.get("detail"),
        "highlights": _highlights(
            ("Fit score", result.get("score")),
            ("Method", result.get("method")),
            ("Avg temp", f"{result.get('avg_temp_c')} °C" if result.get("avg_temp_c") is not None else None),
            ("Rain / week", f"{result.get('rain_mm_week')} mm" if result.get("rain_mm_week") is not None else None),
            ("Soil moisture", result.get("soil_moisture")),
            ("ET₀ / day", f"{result.get('et0_mm_day')} mm" if result.get("et0_mm_day") is not None else None),
            ("Water balance", f"{result.get('water_balance_mm')} mm" if result.get("water_balance_mm") is not None else None),
            ("Source", result.get("source")),
        ),
        "input": {
            "crop": crop,
            "countryCode": country,
            "district": district,
            "mlInput": ml_input,
        },
        "result": result,
    }


def _run_price(payload: dict) -> dict[str, Any]:
    started = time.perf_counter()
    horizon = int(payload.get("horizonWeeks") or 4)
    horizon = max(1, min(12, horizon))
    crop = _require_known_crop(payload, required=False)
    if crop:
        result = forecast_crop_price_outlook(crop, horizon_weeks=horizon)
    else:
        result = forecast_price_outlook(horizon_weeks=horizon)
    return {
        "ok": True,
        "layer": "price",
        "model": result.get("method") or "lstm_price.h5",
        "latencyMs": _latency_ms(started),
        "summary": result.get("detail"),
        "highlights": _highlights(
            ("Score", result.get("score")),
            ("Method", result.get("method")),
            ("Latest index", result.get("latest_index")),
            ("Forecast mean", result.get("forecast_mean")),
            ("Change", f"{result.get('change_pct')}%" if result.get("change_pct") is not None else None),
            ("Category", result.get("category")),
            ("Source", result.get("source")),
        ),
        "input": {"horizonWeeks": horizon, "crop": crop},
        "result": result,
    }


def _run_demand(payload: dict) -> dict[str, Any]:
    started = time.perf_counter()
    risk = float(payload.get("oversupplyRisk", 0.3))
    if not 0 <= risk <= 1:
        raise ValueError("oversupplyRisk must be between 0 and 1 (e.g. 0.35 for 35%).")
    share = payload.get("districtPlanShare")
    share_f = float(share) if share is not None else None
    if share_f is not None and not 0 <= share_f <= 100:
        raise ValueError("districtPlanShare must be between 0 and 100.")
    search = payload.get("searchChangePct")
    search_f = float(search) if search is not None else None
    # Crop is required when you want Trends; fake names are rejected
    crop = _require_known_crop(payload, required=True)
    if search_f is None and crop:
        try:
            from app.services.demand_signals_service import get_public_demand

            public = get_public_demand(crop)
            search_f = public.get("googleTrendsChangePct")
        except Exception:
            search_f = None
    result = score_demand_outlook(
        oversupply_risk=risk,
        district_plan_share=share_f,
        search_change_pct=search_f,
    )
    return {
        "ok": True,
        "layer": "demand",
        "model": result.get("method") or "l4_demand",
        "latencyMs": _latency_ms(started),
        "summary": result.get("detail"),
        "highlights": _highlights(
            ("Demand score", result.get("score")),
            ("Method", result.get("method")),
            ("Crop", crop),
            ("Oversupply risk", f"{risk:.0%}"),
            ("District plan share", f"{share_f}%" if share_f is not None else None),
            ("Search change", f"{search_f:+.1f}%" if search_f is not None else None),
            ("Source", result.get("source")),
        ),
        "input": {
            "oversupplyRisk": risk,
            "districtPlanShare": share_f,
            "searchChangePct": search_f,
            "crop": crop,
        },
        "result": result,
        "validCrops": KNOWN_LAB_CROPS,
    }


def _run_trends(payload: dict) -> dict[str, Any]:
    started = time.perf_counter()
    from app.services.demand_signals_service import get_public_demand

    crop = _require_known_crop(payload, required=True) or "Tomato"
    result = get_public_demand(crop)
    trends = result.get("trends") or {}
    wiki = result.get("wikipedia") or {}
    return {
        "ok": True,
        "layer": "trends",
        "model": "Google Trends UK + Wikipedia",
        "latencyMs": _latency_ms(started),
        "summary": result.get("googleTrendsDetail"),
        "highlights": _highlights(
            ("Crop", crop),
            ("Interest", result.get("googleTrends")),
            ("Card", result.get("googleTrendsLabel")),
            ("Change", f"{result.get('googleTrendsChangePct')}%" if result.get("googleTrendsChangePct") is not None else None),
            ("Trends source", trends.get("source")),
            ("Wiki views/day", wiki.get("avgDailyViews")),
            ("Wiki change", f"{wiki.get('changePct')}%" if wiki.get("changePct") is not None else None),
        ),
        "input": {"crop": crop},
        "result": {
            "label": result.get("googleTrends"),
            "cardLabel": result.get("googleTrendsLabel"),
            "detail": result.get("googleTrendsDetail"),
            "changePct": result.get("googleTrendsChangePct"),
            "trends": result.get("trends"),
            "wikipedia": result.get("wikipedia"),
        },
        "validCrops": KNOWN_LAB_CROPS,
    }


def _run_recommendation(payload: dict) -> dict[str, Any]:
    started = time.perf_counter()
    soil_raw = payload.get("soil") or payload
    soil = {k: float(soil_raw[k]) for k in FEATURES if k in soil_raw}
    for k in FEATURES:
        if k not in soil:
            raise ValueError(f"Missing soil feature: {k}")
    prefs = payload.get("preferences") or []
    if isinstance(prefs, str):
        prefs = [p.strip() for p in prefs.split(",") if p.strip()]
    district = payload.get("district")
    country = str(payload.get("countryCode") or "GB")
    rf = predict_suitability(soil)
    ranked = build_recommendations_from_rf(
        rf["probabilities"],
        preferences=list(prefs),
        ml_input=soil,
        country_code=country,
        district=str(district) if district else None,
    )
    top = ranked[0] if ranked else None
    highlights = _highlights(
        ("RF label", rf.get("label")),
        ("Top crop", top.get("crop") if top else None),
        ("Confidence", f"{top.get('confidence')}%" if top else None),
        ("Weather fit", top.get("weatherFit") if top else None),
        ("Price score", top.get("priceTrend") if top else None),
        ("Demand score", top.get("demandSignal") if top else None),
        ("Weather method", next((f.get("method") for f in (top or {}).get("factors", []) if f.get("key") == "weather"), None)),
        ("Price method", next((f.get("method") for f in (top or {}).get("factors", []) if f.get("key") == "price"), None)),
        ("Demand method", next((f.get("method") for f in (top or {}).get("factors", []) if f.get("key") == "demand"), None)),
    )
    return {
        "ok": True,
        "layer": "recommendation",
        "model": "L1 + hybrid L2 + GOV.UK L3 + L4",
        "latencyMs": _latency_ms(started),
        "summary": (
            f"Top pick {top['crop']} at {top['confidence']}% "
            f"(weather {top.get('weatherFit')}, price {top.get('priceTrend')}, demand {top.get('demandSignal')})."
            if top
            else "No recommendations produced."
        ),
        "highlights": highlights,
        "input": {"soil": soil, "preferences": prefs, "district": district, "countryCode": country},
        "rfLabel": rf.get("label"),
        "topRecommendation": top,
        "recommendations": ranked[:8],
        "count": len(ranked),
    }


_RUNNERS = {
    "soil": _run_soil,
    "weather": _run_weather,
    "price": _run_price,
    "demand": _run_demand,
    "trends": _run_trends,
    "recommendation": _run_recommendation,
}


def run_model_lab(layer: str, payload: dict | None = None) -> dict[str, Any]:
    """Execute one model layer. Returns ok/error payload with latency."""
    key = (layer or "").strip().lower()
    runner = _RUNNERS.get(key)
    if not runner:
        return {
            "ok": False,
            "layer": layer,
            "error": f"Unknown layer '{layer}'. Choose: {', '.join(_RUNNERS)}",
        }
    body = payload if isinstance(payload, dict) else {}
    try:
        return runner(body)
    except ModelNotFoundError as exc:
        return {"ok": False, "layer": key, "error": str(exc), "modelMissing": True}
    except Exception as exc:  # noqa: BLE001 — lab must surface failures
        return {
            "ok": False,
            "layer": key,
            "error": str(exc),
            "traceback": traceback.format_exc(limit=8),
        }


DEFAULT_PAYLOADS: dict[str, dict] = {
    "soil": {
        "N": 90,
        "P": 42,
        "K": 43,
        "temperature": 20.8,
        "humidity": 82,
        "ph": 6.5,
        "rainfall": 202.9,
    },
    "weather": {
        "crop": "Tomato",
        "countryCode": "GB",
        "district": "Northumberland",
        "temperature": 18,
        "rainfall": 40,
        "humidity": 75,
    },
    "price": {"crop": "Tomato", "horizonWeeks": 4},
    "demand": {"crop": "Tomato", "oversupplyRisk": 0.35, "districtPlanShare": 22},
    "trends": {"crop": "Tomato"},
    "recommendation": {
        "N": 90,
        "P": 42,
        "K": 43,
        "temperature": 20.8,
        "humidity": 82,
        "ph": 6.5,
        "rainfall": 202.9,
        "preferences": ["Tomato", "Potato"],
        "countryCode": "GB",
        "district": "Northumberland",
    },
}
