"""Live UK market series from GOV.UK agricultural price indices (offline artefact).

No third-party API key required. Categories map to FarmSense crops where possible;
others use a documented proxy category (e.g. Chili → fresh_vegetables).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import CropReference, DistrictCropAggregate

# FarmSense crop → GOV.UK API category slug
CROP_CATEGORY = {
    "Tomato": "tomatoes",
    "Potato": "potatoes",
    "Onion": "onions",
    "Cabbage": "cabbages",
    "Carrot": "carrots",
    "Beans": "beans_green",
    "Chili": "fresh_vegetables",  # closest published vegetable basket
    "Maize": "cereals",
    "Rice": "cereals",
}

PROXY_NOTE = {
    "Chili": "Using UK fresh vegetables index (no separate chilli series published).",
    "Maize": "Using UK cereals index (no separate maize series published).",
    "Rice": "Using UK cereals index (no separate rice series published).",
}


def _artifacts_dir() -> Path:
    return get_settings().resolved_ml_artifacts_dir


@lru_cache(maxsize=1)
def _load_govuk_frame() -> pd.DataFrame:
    path = _artifacts_dir() / "govuk_price_indices.csv"
    if not path.exists():
        # Local fallback when running outside Docker volume layout
        alt = Path(__file__).resolve().parents[3] / "ml-models" / "data" / "prices" / "govuk_price_indices_API.csv"
        path = alt if alt.exists() else path
    if not path.exists():
        raise FileNotFoundError("govuk_price_indices.csv not found in artefacts")
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["index"] = pd.to_numeric(df["index"], errors="coerce")
    df = df.dropna(subset=["date", "index", "category"])
    return df.sort_values("date")


def resolve_category(crop_name: str) -> tuple[str, str | None]:
    name = (crop_name or "").strip()
    key = next((k for k in CROP_CATEGORY if k.lower() == name.lower()), None)
    if key:
        return CROP_CATEGORY[key], PROXY_NOTE.get(key)
    # Unknown crop → vegetables basket
    return "fresh_vegetables", f"No dedicated series for {name or 'crop'}; using UK fresh vegetables index."


def load_crop_index_series(crop_name: str) -> tuple[pd.Series, str, str | None]:
    category, note = resolve_category(crop_name)
    df = _load_govuk_frame()
    sub = df[df["category"] == category].copy()
    if sub.empty:
        raise ValueError(f"No GOV.UK rows for category={category}")
    series = sub.set_index("date")["index"].astype(float).sort_index()
    # Deduplicate dates (keep last)
    series = series[~series.index.duplicated(keep="last")]
    return series, category, note


def _forecast_tail(series: pd.Series, horizon: int = 4) -> dict:
    """Spike-aware GOV.UK index outlook.

    Plain linear fits after one extreme month (e.g. tomatoes 68 → 238) overstated
    drops (~40%). Damping uses winsorised history, a recent-median anchor, and a
    capped move so advice stays farmer-usable while tracking real direction.
    """
    y = series.dropna().astype(float).values
    if len(y) < 4:
        last = float(y[-1]) if len(y) else 100.0
        preds = [last] * horizon
        return {
            "latest_index": last,
            "change_pct": 0.0,
            "forecast_mean": last,
            "predictions": preds,
            "method": "govuk_damped",
        }

    latest = float(y[-1])
    window = y[-min(16, len(y)) :]
    # Robust centre — less sensitive than last point when last month is an outlier
    anchor = float(np.median(y[-min(6, len(y)) :]))
    lo_p, hi_p = np.percentile(window, [10, 90])
    robust = np.clip(window, lo_p, hi_p)
    x = np.arange(len(robust), dtype=float)
    coef = np.polyfit(x, robust.astype(float), 1)

    # Wider cap if the latest print is far from the recent median (spike)
    spike = abs(latest - anchor) / max(abs(anchor), 1.0) > 0.25
    cap = 0.12 if spike else 0.18
    base = anchor if spike else latest

    preds: list[float] = []
    for i in range(1, horizon + 1):
        raw = float(np.polyval(coef, len(robust) + i))
        # Blend trend toward anchor/base to avoid runaway linear extrapolation
        blended = (0.35 * raw + 0.65 * base) if spike else (0.55 * raw + 0.45 * latest)
        lo_c, hi_c = base * (1 - cap), base * (1 + cap)
        preds.append(float(np.clip(blended, lo_c, hi_c)))

    future_mean = float(np.mean(preds))
    # Report change vs recent median when spiked so UI doesn't claim −40% off a one-month high
    ref = anchor if spike else latest
    change_pct = ((future_mean - ref) / ref) * 100 if ref else 0.0
    return {
        "latest_index": round(latest, 2),
        "change_pct": round(change_pct, 2),
        "forecast_mean": round(future_mean, 2),
        "predictions": [round(p, 2) for p in preds],
        "anchor_index": round(anchor, 2),
        "spike_damped": spike,
        "method": "govuk_damped",
    }


def _month_start(ts) -> pd.Timestamp:
    ts = pd.Timestamp(ts)
    return ts.normalize().replace(day=1)


def months_between(a: pd.Timestamp, b: pd.Timestamp) -> int:
    """Whole calendar months from month-start a to month-start b (b - a)."""
    return (b.year - a.year) * 12 + (b.month - a.month)


def build_market_chart(series: pd.Series, outlook: dict, history: int = 8) -> tuple[list[dict], str | None]:
    """Continuous chart: real history → estimated gap months → future forecast (no holes)."""
    tail = series.iloc[-history:]
    rows: list[dict] = []
    for i, (ts, price) in enumerate(tail.items()):
        label = ts.strftime("%b %Y") if hasattr(ts, "strftime") else f"M{i}"
        rows.append(
            {
                "week": label,
                "weekNum": i - len(tail),
                "price": round(float(price), 1),
                "forecast": None,
                "lower": None,
                "upper": None,
                "isForecast": False,
                "isEstimated": False,
                "indexPrice": round(float(price), 1),
            }
        )

    preds = outlook.get("predictions") or []
    last_ts = tail.index[-1] if len(tail) else None
    data_lag_note: str | None = None

    if last_ts is not None and preds:
        last_month = _month_start(last_ts)
        today_month = _month_start(pd.Timestamp.today())
        # Forecast always begins the month AFTER the latest published index — no gap.
        forecast_start = last_month + pd.DateOffset(months=1)
        # Months already elapsed since last data (published lag) become "estimated" nowcasts.
        gap_months = max(0, months_between(last_month, today_month))

        if gap_months > 0:
            data_lag_note = (
                f"GOV.UK index is published through {last_month.strftime('%b %Y')}. "
                f"{forecast_start.strftime('%b %Y')}–{today_month.strftime('%b %Y')} are model "
                f"estimates until Defra publishes; later months are forecast."
            )

        for i, pred in enumerate(preds, start=1):
            fut = forecast_start + pd.DateOffset(months=i - 1)
            # Months up to and including the current month are "estimated" (data not yet out)
            is_estimated = months_between(forecast_start, fut) < gap_months
            rows.append(
                {
                    "week": fut.strftime("%b %Y"),
                    "weekNum": i,
                    "price": round(float(pred), 1),
                    "forecast": round(float(pred), 1),
                    "lower": round(float(pred) * 0.97, 1),
                    "upper": round(float(pred) * 1.03, 1),
                    "isForecast": True,
                    "isEstimated": is_estimated,
                    "indexPrice": round(float(pred), 1),
                }
            )

    return rows, data_lag_note


def planting_interest(db: Session, crop_name: str, *, demo_data_mode: bool = False) -> dict:
    """District planting share for this crop from finalized community plans."""
    crop = db.scalar(
        select(CropReference).where(CropReference.display_name.ilike(crop_name.strip())).limit(1)
    )
    if not crop:
        if demo_data_mode:
            return {
                "label": "Moderate interest",
                "detail": "Sample district planting share for demos.",
                "sharePct": 18.0,
                "demo": True,
            }
        return {"label": "No local data", "detail": "Crop not in reference list yet.", "sharePct": None, "demo": False}

    latest = db.scalar(
        select(DistrictCropAggregate)
        .order_by(desc(DistrictCropAggregate.season_year), desc(DistrictCropAggregate.week_number))
        .limit(1)
    )
    if not latest:
        if demo_data_mode:
            return {
                "label": "Moderate interest",
                "detail": "Sample: about 18% of recent demo plans chose this crop in the district view.",
                "sharePct": 18.0,
                "demo": True,
            }
        return {
            "label": "No plans yet",
            "detail": "Community planting totals appear after farms finalize plans.",
            "sharePct": None,
            "demo": False,
        }

    year, week = latest.season_year, latest.week_number
    total = (
        db.scalar(
            select(func.coalesce(func.sum(DistrictCropAggregate.plan_count), 0)).where(
                DistrictCropAggregate.season_year == year,
                DistrictCropAggregate.week_number == week,
            )
        )
        or 0
    )
    crop_n = (
        db.scalar(
            select(func.coalesce(func.sum(DistrictCropAggregate.plan_count), 0)).where(
                DistrictCropAggregate.season_year == year,
                DistrictCropAggregate.week_number == week,
                DistrictCropAggregate.crop_id == crop.id,
            )
        )
        or 0
    )
    if total <= 0:
        if demo_data_mode:
            return {
                "label": "Moderate interest",
                "detail": "Sample: about 18% of recent demo plans chose this crop in the district view.",
                "sharePct": 18.0,
                "demo": True,
            }
        return {
            "label": "No plans yet",
            "detail": f"Week {week}/{year} has no finalized community plans.",
            "sharePct": 0.0,
            "demo": False,
        }
    share = round((crop_n / total) * 100, 1)
    if share >= 25:
        label = "High interest"
    elif share >= 10:
        label = "Moderate interest"
    elif share > 0:
        label = "Low interest"
    else:
        label = "Not chosen yet"
    return {
        "label": label,
        "detail": f"{crop_n} of {total} recent community plans chose {crop.display_name} ({share}%).",
        "sharePct": share,
        "demo": False,
    }


def momentum_label(change_pct: float) -> str:
    if change_pct >= 2:
        return "Rising"
    if change_pct <= -2:
        return "Falling"
    return "Stable"


def _chart_rows_as_gbp(weekly: list[dict], farmer_price: dict, latest_index: float) -> list[dict]:
    """Scale index chart into £/kg so the latest real month matches the DEFRA guide."""
    if not farmer_price or not farmer_price.get("available") or not latest_index:
        return weekly
    base = float(farmer_price["gbpPerKg"])
    ref = float(latest_index) or 1.0

    # First pass: relative to latest index
    scaled: list[dict] = []
    last_real_gbp = None
    for row in weekly:
        idx = row.get("price")
        if idx is None:
            scaled.append(row)
            continue
        gbp = base * (float(idx) / ref)
        fc = row.get("forecast")
        fc_gbp = base * (float(fc) / ref) if fc is not None else None
        lo = row.get("lower")
        hi = row.get("upper")
        item = {
            **row,
            "price": gbp,
            "forecast": fc_gbp,
            "lower": base * (float(lo) / ref) if lo is not None else None,
            "upper": base * (float(hi) / ref) if hi is not None else None,
            "indexPrice": round(float(idx), 1),
        }
        if not row.get("isForecast"):
            last_real_gbp = gbp
        scaled.append(item)

    # Renormalise so last published month == DEFRA £/kg (avoids spike crushing the series)
    if last_real_gbp and last_real_gbp > 0:
        factor = base / last_real_gbp
        for item in scaled:
            if item.get("price") is not None:
                item["price"] = round(float(item["price"]) * factor, 3)
            if item.get("forecast") is not None:
                item["forecast"] = round(float(item["forecast"]) * factor, 3)
            if item.get("lower") is not None:
                item["lower"] = round(float(item["lower"]) * factor, 3)
            if item.get("upper") is not None:
                item["upper"] = round(float(item["upper"]) * factor, 3)

    # Align forecast band with the farmer "outlook in pounds" figure
    target_fc = farmer_price.get("forecastGbpPerKg")
    fc_vals = [
        float(item["forecast"])
        for item in scaled
        if item.get("isForecast") and item.get("forecast") is not None
    ]
    if target_fc and fc_vals:
        mean_fc = sum(fc_vals) / len(fc_vals)
        if mean_fc > 0:
            f2 = float(target_fc) / mean_fc
            for item in scaled:
                if not item.get("isForecast"):
                    continue
                if item.get("price") is not None:
                    item["price"] = round(float(item["price"]) * f2, 3)
                if item.get("forecast") is not None:
                    item["forecast"] = round(float(item["forecast"]) * f2, 3)
                if item.get("lower") is not None:
                    item["lower"] = round(float(item["lower"]) * f2, 3)
                if item.get("upper") is not None:
                    item["upper"] = round(float(item["upper"]) * f2, 3)

    return scaled


def build_crop_market_payload(db: Session, crop_name: str, *, demo_data_mode: bool = False) -> dict:
    from app.services.govuk_sync_service import maybe_refresh_govuk_indices

    maybe_refresh_govuk_indices()
    series, category, proxy_note = load_crop_index_series(crop_name)

    # Predict enough months to bridge the publication lag (gap) + 4 forward-looking months,
    # so the chart is continuous from the last real month through the future.
    FORWARD_HORIZON = 4
    if len(series):
        last_month = _month_start(series.index[-1])
        today_month = _month_start(pd.Timestamp.today())
        gap_months = max(0, months_between(last_month, today_month))
    else:
        gap_months = 0
    horizon = min(gap_months + FORWARD_HORIZON, 12)

    outlook = _forecast_tail(series, horizon=horizon)
    weekly, data_lag_note = build_market_chart(series, outlook)
    trend = float(outlook["change_pct"])
    current = float(outlook["latest_index"])

    verdict = "good" if trend > 1 else "wait" if trend > -3 else "avoid"
    if outlook.get("spike_damped"):
        verdict = "wait" if abs(trend) < 8 else verdict
        message = (
            f"UK {category.replace('_', ' ')} latest index {current:.1f} looked spiky versus the "
            f"recent median (~{outlook.get('anchor_index', current):.1f}). "
            f"Dampened outlook {trend:+.1f}% — treat as a cautious signal, not a retail £ forecast."
        )
    elif verdict == "good":
        message = (
            f"UK {category.replace('_', ' ')} price index outlook {trend:+.1f}% over the next months "
            "— favourable window to sell."
        )
    elif verdict == "wait":
        message = (
            f"UK {category.replace('_', ' ')} index outlook is soft ({trend:+.1f}%). "
            "Monitor a little longer before selling."
        )
    else:
        message = (
            f"UK {category.replace('_', ' ')} index outlook is falling ({trend:+.1f}%). "
            "Avoid selling if you can wait."
        )

    planting = planting_interest(db, crop_name, demo_data_mode=demo_data_mode)
    mom = momentum_label(trend)

    # Free public demand: Google Trends (UK) + Wikipedia pageviews fallback
    from app.services.demand_signals_service import get_public_demand

    public = get_public_demand(crop_name)
    search_label = public.get("googleTrends") or mom
    search_detail = public.get("googleTrendsDetail") or (
        f"Based on GOV.UK {category.replace('_', ' ')} outlook ({trend:+.1f}%)."
    )
    search_card_label = public.get("googleTrendsLabel") or "UK search interest"

    # Lightly blend public search momentum into sell message when Trends is live
    trends_change = public.get("googleTrendsChangePct")
    if trends_change is not None and public.get("trends"):
        if trends_change >= 10 and verdict == "wait":
            verdict = "good"
            message = (
                f"{message} UK search interest is also up ({trends_change:+.0f}%), "
                "supporting demand."
            )
        elif trends_change <= -10 and verdict == "good":
            message = (
                f"{message} Note: UK search interest cooled ({trends_change:+.0f}%) — "
                "confirm local buyers before selling."
            )

    demand = {
        "googleTrends": search_label,
        "googleTrendsLabel": search_card_label,
        "googleTrendsDetail": search_detail,
        # Real district planting share (RQ3) — separate from public search signals
        "districtShare": planting["label"],
        "districtShareLabel": "District planting share",
        "districtShareDetail": planting["detail"],
        "plantingDemo": bool(planting.get("demo")),
        # Legacy keys kept so older clients don't break
        "reddit": planting["label"],
        "redditLabel": "Farmer planting",
        "redditDetail": planting["detail"],
    }
    if planting.get("demo"):
        demand["demo"] = True
    if public.get("wikipedia") and public.get("trends"):
        # Extra context when both free sources available
        demand["googleTrendsDetail"] = (
            f"{search_detail} Also: {public['wikipedia']['detail']}"
        )

    sources = ["GOV.UK agricultural price indices"]
    if public.get("trends"):
        sources.append("Google Trends UK (free)")
    elif public.get("wikipedia"):
        sources.append("Wikimedia pageviews (free)")

    # Auto agent: save forecasts → compare when actuals arrive → walk-forward backfill
    from app.services.forecast_validation_service import sync_forecast_ledger
    from app.services.defra_price_service import build_farmer_price_guide

    farmer_price = build_farmer_price_guide(crop_name, trend)
    chart_unit = "gbp"
    chart_rows = weekly
    if farmer_price and farmer_price.get("available"):
        chart_rows = _chart_rows_as_gbp(weekly, farmer_price, current)
    else:
        chart_unit = "index"

    accuracy = sync_forecast_ledger(
        crop=crop_name,
        category=category,
        series=series,
        weekly_rows=weekly,  # keep index ledger for GOV.UK validation
        outlook=outlook,
        forecast_fn=_forecast_tail,
    )

    return {
        "currentPrice": round(current, 1),
        "priceUnit": chart_unit,
        "trend": round(trend, 1),
        "sellVerdict": verdict,
        "sellMessage": message,
        "demand": demand,
        "weeklyPrices": chart_rows,
        "source": " · ".join(sources + (["DEFRA AMMG £ guide"] if chart_unit == "gbp" else [])),
        "category": category,
        "proxyNote": proxy_note,
        "dataLagNote": data_lag_note,
        "asOf": series.index[-1].strftime("%Y-%m-%d") if len(series) else None,
        "forecastAccuracy": accuracy,
        "farmerPrice": farmer_price,
    }
