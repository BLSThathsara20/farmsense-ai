"""Multi-layer forecast helpers for recommendation explainability.

Heavy mode (default when TensorFlow + LSTM artefacts are present):
  L2 weather → lstm_weather.h5 blended with live Open-Meteo agri data
  L3 price   → lstm_price.h5 (and GOV.UK crop indices when ranking)

Light / enrichment (free public APIs, no keys):
  Open-Meteo agricultural forecast — ET₀, soil moisture, rain, soil temp
"""

from __future__ import annotations

import logging
import threading
from functools import lru_cache
from pathlib import Path

import httpx
import numpy as np
import pandas as pd
from cachetools import TTLCache

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_COUNTRY_COORDS = {
    "GB": (52.5, -1.5),
    "LK": (7.9, 80.8),
    "KE": (-1.3, 36.8),
    "IN": (30.9, 75.8),
    "NG": (6.5, 3.4),
    "PH": (8.0, 125.0),
    "VN": (10.0, 106.0),
}

# Quick GB district → coords (avoids Nominatim on every recommend)
_GB_DISTRICT_COORDS = {
    "northumberland": (55.21, -2.08),
    "newcastle": (54.98, -1.61),
    "newcastle upon tyne": (54.98, -1.61),
    "tyne and wear": (54.97, -1.60),
    "durham": (54.78, -1.57),
    "cumbria": (54.58, -2.91),
    "greater london": (51.51, -0.13),
    "london": (51.51, -0.13),
    "manchester": (53.48, -2.24),
    "greater manchester": (53.48, -2.24),
    "birmingham": (52.48, -1.90),
    "west midlands": (52.48, -1.90),
    "leeds": (53.80, -1.55),
    "yorkshire": (53.96, -1.08),
    "cornwall": (50.27, -5.05),
    "devon": (50.72, -3.53),
    "kent": (51.28, 0.52),
    "essex": (51.73, 0.47),
    "norfolk": (52.63, 1.30),
    "suffolk": (52.19, 1.00),
    "scotland": (56.49, -4.20),
    "glasgow": (55.86, -4.25),
    "edinburgh": (55.95, -3.19),
    "wales": (52.13, -3.78),
    "cardiff": (51.48, -3.18),
}

_CROP_CLIMATE = {
    "maize": {"t_min": 16, "t_max": 32, "rain_min": 20, "rain_max": 80, "sm_min": 0.15, "sm_max": 0.40},
    "corn": {"t_min": 16, "t_max": 32, "rain_min": 20, "rain_max": 80, "sm_min": 0.15, "sm_max": 0.40},
    "rice": {"t_min": 20, "t_max": 35, "rain_min": 40, "rain_max": 150, "sm_min": 0.30, "sm_max": 0.55},
    "wheat": {"t_min": 10, "t_max": 24, "rain_min": 10, "rain_max": 50, "sm_min": 0.12, "sm_max": 0.35},
    "potato": {"t_min": 10, "t_max": 24, "rain_min": 15, "rain_max": 60, "sm_min": 0.18, "sm_max": 0.40},
    "tomato": {"t_min": 18, "t_max": 30, "rain_min": 15, "rain_max": 55, "sm_min": 0.18, "sm_max": 0.38},
    "cabbage": {"t_min": 10, "t_max": 22, "rain_min": 15, "rain_max": 55, "sm_min": 0.18, "sm_max": 0.40},
    "onion": {"t_min": 12, "t_max": 28, "rain_min": 10, "rain_max": 45, "sm_min": 0.12, "sm_max": 0.32},
    "carrot": {"t_min": 10, "t_max": 24, "rain_min": 15, "rain_max": 50, "sm_min": 0.15, "sm_max": 0.36},
    "chili": {"t_min": 18, "t_max": 32, "rain_min": 15, "rain_max": 55, "sm_min": 0.15, "sm_max": 0.35},
    "beans": {"t_min": 15, "t_max": 28, "rain_min": 15, "rain_max": 55, "sm_min": 0.16, "sm_max": 0.38},
    "default": {"t_min": 14, "t_max": 30, "rain_min": 15, "rain_max": 70, "sm_min": 0.15, "sm_max": 0.40},
}

_meteo_cache: TTLCache = TTLCache(maxsize=64, ttl=3600)
_meteo_lock = threading.Lock()


def _artifacts_dir() -> Path:
    return get_settings().resolved_ml_artifacts_dir


def heavy_mode_enabled() -> bool:
    """Heavy = LSTM path. Controlled by ML_HEAVY env (default true)."""
    return bool(get_settings().ml_heavy)


def resolve_coords(
    *,
    country_code: str = "GB",
    district: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
) -> tuple[float, float]:
    if lat is not None and lon is not None:
        return float(lat), float(lon)
    if district:
        key = district.strip().lower()
        if key in _GB_DISTRICT_COORDS:
            return _GB_DISTRICT_COORDS[key]
        for name, coords in _GB_DISTRICT_COORDS.items():
            if name in key or key in name:
                return coords
    code = (country_code or "GB").upper()
    return _COUNTRY_COORDS.get(code, _COUNTRY_COORDS["GB"])


@lru_cache(maxsize=1)
def _load_price_weekly() -> pd.Series:
    path = _artifacts_dir() / "price_weekly.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing price artefact: {path}")
    df = pd.read_csv(path, index_col=0, parse_dates=True)
    series = df.iloc[:, 0].astype(float).dropna().sort_index()
    if series.empty:
        raise ValueError("price_weekly.csv is empty")
    return series


def _band_score(value: float, lo: float, hi: float) -> float:
    mid = (lo + hi) / 2
    half = (hi - lo) / 2 or 1
    return max(0.0, 1.0 - abs(value - mid) / (half * 1.6))


def _score_from_price_change(change_pct: float, mom_pct: float = 0.0) -> int:
    return int(min(96, max(40, round(58 + change_pct * 4 + mom_pct * 1.5))))


def _price_outlook_light(horizon_weeks: int = 4) -> dict:
    series = _load_price_weekly()
    y = series.to_numpy(dtype=float)
    n = len(y)
    x = np.arange(n, dtype=float)
    window = min(16, n)
    slope, intercept = np.polyfit(x[-window:], y[-window:], 1)
    forecast = slope * np.arange(n, n + horizon_weeks) + intercept
    latest = float(y[-1])
    future_mean = float(np.mean(forecast))
    change_pct = ((future_mean - latest) / latest) * 100 if latest else 0.0
    mom_pct = 0.0
    if n >= 8:
        prev = float(np.mean(y[-8:-4]))
        recent = float(np.mean(y[-4:]))
        mom_pct = ((recent - prev) / prev) * 100 if prev else 0.0
    score = _score_from_price_change(change_pct, mom_pct)
    direction = "rising" if change_pct >= 1 else "softening" if change_pct <= -1 else "steady"
    return {
        "score": score,
        "latest_index": round(latest, 2),
        "forecast_mean": round(future_mean, 2),
        "change_pct": round(change_pct, 2),
        "momentum_pct": round(mom_pct, 2),
        "horizon_weeks": horizon_weeks,
        "predictions": [round(float(v), 2) for v in forecast],
        "detail": (
            f"Price index {latest:.1f} → ~{future_mean:.1f} in {horizon_weeks} weeks "
            f"({change_pct:+.1f}%, {direction}). Light trend fallback."
        ),
        "source": "price_weekly.csv · trend forecast",
        "method": "l3_price_trend_fallback",
    }


def _price_outlook_lstm(horizon_weeks: int = 4) -> dict:
    from app.ml.lstm_inference import lstm_price_forecast

    raw = lstm_price_forecast(horizon_weeks=horizon_weeks)
    change_pct = raw["change_pct"]
    score = _score_from_price_change(change_pct)
    direction = "rising" if change_pct >= 1 else "softening" if change_pct <= -1 else "steady"
    return {
        "score": score,
        "latest_index": raw["latest"],
        "forecast_mean": raw["forecast_mean"],
        "change_pct": change_pct,
        "momentum_pct": change_pct,
        "horizon_weeks": horizon_weeks,
        "predictions": raw["predictions"],
        "detail": (
            f"LSTM price forecast: index {raw['latest']:.1f} → ~{raw['forecast_mean']:.1f} "
            f"in {horizon_weeks} weeks ({change_pct:+.1f}%, {direction})."
        ),
        "source": raw["source"],
        "method": raw["method"],
    }


def forecast_price_outlook(horizon_weeks: int = 4) -> dict:
    """L3 price outlook — heavy LSTM when available."""
    if heavy_mode_enabled():
        try:
            from app.ml.lstm_inference import tensorflow_available

            if tensorflow_available():
                return _price_outlook_lstm(horizon_weeks=horizon_weeks)
        except Exception:
            pass
    return _price_outlook_light(horizon_weeks=horizon_weeks)


def forecast_crop_price_outlook(crop: str, horizon_weeks: int = 4) -> dict:
    """Prefer GOV.UK crop-specific index; fall back to generic LSTM series."""
    try:
        from app.services.market_data_service import _forecast_tail, load_crop_index_series

        series, category, note = load_crop_index_series(crop)
        outlook = _forecast_tail(series, horizon=horizon_weeks)
        change_pct = float(outlook["change_pct"])
        score = _score_from_price_change(change_pct)
        direction = "rising" if change_pct >= 1 else "softening" if change_pct <= -1 else "steady"
        spike_note = ""
        if outlook.get("spike_damped"):
            spike_note = (
                f" Latest print {outlook['latest_index']:.1f} looked spiky vs recent median "
                f"{outlook.get('anchor_index', outlook['latest_index']):.1f}; outlook is dampened."
            )
        return {
            "score": score,
            "latest_index": outlook["latest_index"],
            "forecast_mean": outlook["forecast_mean"],
            "change_pct": change_pct,
            "momentum_pct": change_pct,
            "horizon_weeks": horizon_weeks,
            "predictions": outlook["predictions"],
            "category": category,
            "proxyNote": note,
            "spikeDamped": bool(outlook.get("spike_damped")),
            "detail": (
                f"GOV.UK {category.replace('_', ' ')} index "
                f"{outlook['latest_index']:.1f} → ~{outlook['forecast_mean']:.1f} "
                f"({change_pct:+.1f}%, {direction}).{spike_note}"
            ),
            "source": f"GOV.UK agricultural price indices · {category}",
            "method": outlook.get("method") or "l3_govuk_crop_index",
        }
    except Exception as exc:  # noqa: BLE001
        logger.info("Crop price fallback for %s: %s", crop, exc)
        base = forecast_price_outlook(horizon_weeks=horizon_weeks)
        base["detail"] = f"{base.get('detail', '')} (generic series — no GOV.UK crop match)."
        return base


def _open_meteo_agri_forecast(lat: float, lon: float) -> dict | None:
    """Free Open-Meteo agri signals (no API key): temp, rain, ET₀, soil moisture."""
    cache_key = f"{round(lat, 2)}:{round(lon, 2)}"
    with _meteo_lock:
        hit = _meteo_cache.get(cache_key)
        if hit is not None:
            return hit

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration",
        "hourly": "soil_moisture_0_to_7cm,soil_temperature_0_to_7cm",
        "forecast_days": 14,
        "timezone": "auto",
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        daily = data.get("daily") or {}
        hourly = data.get("hourly") or {}
        temps = [float(x) for x in (daily.get("temperature_2m_mean") or []) if x is not None]
        rains = [float(x) for x in (daily.get("precipitation_sum") or []) if x is not None]
        et0 = [float(x) for x in (daily.get("et0_fao_evapotranspiration") or []) if x is not None]
        moisture = [float(x) for x in (hourly.get("soil_moisture_0_to_7cm") or []) if x is not None]
        soil_t = [float(x) for x in (hourly.get("soil_temperature_0_to_7cm") or []) if x is not None]
        if not temps:
            return None
        days = len(temps)
        rain_total = float(np.sum(rains)) if rains else 0.0
        rain_week = rain_total * (7 / max(days, 1))
        et0_day = float(np.mean(et0)) if et0 else None
        water_balance = None
        if et0 and rains:
            water_balance = float(np.sum(rains) - np.sum(et0))
        result = {
            "avg_temp_c": float(np.mean(temps)),
            "total_rain_mm": rain_total,
            "rain_mm_week": rain_week,
            "et0_mm_day": round(et0_day, 2) if et0_day is not None else None,
            "water_balance_mm": round(water_balance, 1) if water_balance is not None else None,
            "soil_moisture": round(float(np.mean(moisture)), 3) if moisture else None,
            "soil_temp_c": round(float(np.mean(soil_t)), 1) if soil_t else None,
            "days": days,
            "source": "Open-Meteo agri forecast (ET₀ + soil moisture)",
        }
        with _meteo_lock:
            _meteo_cache[cache_key] = result
        return result
    except Exception as exc:  # noqa: BLE001
        logger.warning("Open-Meteo agri failed: %s", exc)
        return None


def _open_meteo_forecast(lat: float, lon: float) -> dict | None:
    return _open_meteo_agri_forecast(lat, lon)


def _score_crop_climate(
    *,
    crop: str,
    avg_temp: float,
    rain_week: float,
    soil_moisture: float | None = None,
    water_balance: float | None = None,
) -> tuple[int, dict]:
    key = crop.lower().replace(" ", "_")
    pref = _CROP_CLIMATE.get(key, _CROP_CLIMATE["default"])
    t_fit = _band_score(avg_temp, pref["t_min"], pref["t_max"])
    r_fit = _band_score(rain_week, pref["rain_min"], pref["rain_max"])
    weights = [0.45, 0.30]
    fits = [t_fit, r_fit]
    if soil_moisture is not None:
        fits.append(_band_score(soil_moisture, pref["sm_min"], pref["sm_max"]))
        weights.append(0.15)
    if water_balance is not None:
        fits.append(_band_score(water_balance, -10, 40))
        weights.append(0.10)
    wsum = sum(weights)
    fit = sum(f * w for f, w in zip(fits, weights)) / wsum
    score = int(min(96, max(42, round(fit * 100))))
    return score, pref


def _weather_from_lstm(*, crop: str, agri: dict | None = None) -> dict:
    from app.ml.lstm_inference import lstm_weather_forecast

    raw = lstm_weather_forecast(horizon_weeks=4)
    avg_temp = raw["forecast_mean_c"]
    if agri:
        rain_week = agri.get("rain_mm_week", raw["rain_mm_week"])
        soil_m = agri.get("soil_moisture")
        water_bal = agri.get("water_balance_mm")
        avg_temp = 0.35 * avg_temp + 0.65 * float(agri["avg_temp_c"])
        method = "l2_lstm_weather+open_meteo_agri"
        source = f"{raw['source']} · {agri['source']}"
    else:
        rain_week = raw["rain_mm_week"]
        soil_m = None
        water_bal = None
        method = raw["method"]
        source = raw["source"]

    score, _ = _score_crop_climate(
        crop=crop,
        avg_temp=avg_temp,
        rain_week=rain_week,
        soil_moisture=soil_m,
        water_balance=water_bal,
    )
    bits = [f"~{avg_temp:.0f}°C", f"~{rain_week:.0f}mm rain/week"]
    if soil_m is not None:
        bits.append(f"soil moisture {soil_m:.2f}")
    if agri and agri.get("et0_mm_day") is not None:
        bits.append(f"ET₀ {agri['et0_mm_day']:.1f}mm/day")
    return {
        "score": score,
        "avg_temp_c": round(avg_temp, 1),
        "rain_mm_week": round(rain_week, 1),
        "soil_moisture": soil_m,
        "et0_mm_day": agri.get("et0_mm_day") if agri else None,
        "water_balance_mm": agri.get("water_balance_mm") if agri else None,
        "predictions_c": raw["predictions_c"],
        "detail": f"Hybrid weather for {crop.title()}: {', '.join(bits)}.",
        "source": source,
        "method": method,
    }


def forecast_weather_outlook(
    *,
    ml_input: dict,
    country_code: str = "GB",
    crop: str = "default",
    district: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
) -> dict:
    """L2 weather — LSTM + free Open-Meteo agri (ET₀, soil moisture) for better fit."""
    lat_f, lon_f = resolve_coords(country_code=country_code, district=district, lat=lat, lon=lon)
    agri = _open_meteo_agri_forecast(lat_f, lon_f)

    if heavy_mode_enabled():
        try:
            from app.ml.lstm_inference import tensorflow_available

            if tensorflow_available():
                return _weather_from_lstm(crop=crop, agri=agri)
        except Exception:
            pass

    if agri:
        avg_temp = agri["avg_temp_c"]
        rain_week = agri["rain_mm_week"]
        soil_m = agri.get("soil_moisture")
        water_bal = agri.get("water_balance_mm")
        source = agri["source"]
        method = "open_meteo_agri"
    else:
        avg_temp = float(ml_input.get("temperature", 20.0))
        rain_week = float(ml_input.get("rainfall", 100.0)) / 4.0
        soil_m = None
        water_bal = None
        source = "soil climate inputs (live weather unavailable)"
        method = "climate_fallback"

    score, _ = _score_crop_climate(
        crop=crop,
        avg_temp=avg_temp,
        rain_week=rain_week,
        soil_moisture=soil_m,
        water_balance=water_bal,
    )
    bits = [f"~{avg_temp:.0f}°C avg", f"~{rain_week:.0f}mm rain/week"]
    if soil_m is not None:
        bits.append(f"soil moisture {soil_m:.2f}")
    if agri and agri.get("et0_mm_day") is not None:
        bits.append(f"ET₀ {agri['et0_mm_day']:.1f}mm/day")
    return {
        "score": score,
        "avg_temp_c": round(avg_temp, 1),
        "rain_mm_week": round(rain_week, 1),
        "soil_moisture": soil_m,
        "et0_mm_day": agri.get("et0_mm_day") if agri else None,
        "water_balance_mm": agri.get("water_balance_mm") if agri else None,
        "detail": f"Next ~2 weeks for {crop.title()}: {', '.join(bits)}. {source}.",
        "source": source,
        "method": method,
    }


def score_demand_outlook(
    *,
    oversupply_risk: float,
    district_plan_share: float | None = None,
    search_change_pct: float | None = None,
) -> dict:
    risk = float(oversupply_risk)
    score = int(min(96, max(40, round(88 - risk * 55))))
    sources = ["district planting pressure"]
    if district_plan_share is not None:
        score = int(min(96, max(40, round(90 - district_plan_share * 0.7))))
        detail = (
            f"About {district_plan_share:.0f}% of local plans may target similar crops — "
            f"oversupply risk {risk:.0%}."
        )
    else:
        detail = f"District planting pressure implies oversupply risk ~{risk:.0%}."

    if search_change_pct is not None:
        boost = int(max(-8, min(8, round(search_change_pct / 3))))
        score = int(min(96, max(40, score + boost)))
        sources.append("UK search interest (Google Trends / Wikipedia)")
        detail = f"{detail} Public search interest {search_change_pct:+.0f}%."

    return {
        "score": score,
        "detail": detail,
        "source": " · ".join(sources),
        "method": "l4_demand+public_signals" if search_change_pct is not None else "l4_demand",
        "searchChangePct": search_change_pct,
    }


def build_weekly_price_payload_from_series() -> list[dict]:
    """Market page: recent history + heavy LSTM (or light) forecast weeks."""
    series = _load_price_weekly()
    tail = series.iloc[-8:]
    outlook = forecast_price_outlook(horizon_weeks=4)
    preds = outlook.get("predictions") or []
    rows: list[dict] = []
    for i, (ts, price) in enumerate(tail.items()):
        rows.append(
            {
                "week": ts.strftime("%b %Y") if hasattr(ts, "strftime") else f"W{i}",
                "weekNum": i - len(tail),
                "price": round(float(price), 1),
                "forecast": None,
                "lower": None,
                "upper": None,
                "isForecast": False,
            }
        )
    if preds:
        for i, pred in enumerate(preds, start=1):
            rows.append(
                {
                    "week": f"F{i}",
                    "weekNum": i,
                    "price": round(float(pred), 1),
                    "forecast": round(float(pred), 1),
                    "lower": round(float(pred) * 0.97, 1),
                    "upper": round(float(pred) * 1.03, 1),
                    "isForecast": True,
                }
            )
    else:
        last = float(tail.iloc[-1])
        step = (outlook["forecast_mean"] - last) / 4
        for i in range(1, 5):
            pred = last + step * i
            rows.append(
                {
                    "week": f"F{i}",
                    "weekNum": i,
                    "price": round(pred, 1),
                    "forecast": round(pred, 1),
                    "lower": round(pred * 0.97, 1),
                    "upper": round(pred * 1.03, 1),
                    "isForecast": True,
                }
            )
    return rows
