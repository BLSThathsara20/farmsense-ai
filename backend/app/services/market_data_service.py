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


def build_market_chart(series: pd.Series, outlook: dict, history: int = 8) -> list[dict]:
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
            }
        )
    preds = outlook.get("predictions") or []
    last_ts = tail.index[-1] if len(tail) else None
    for i, pred in enumerate(preds, start=1):
        if last_ts is not None and hasattr(last_ts, "to_period"):
            fut = (last_ts.to_period("M") + i).to_timestamp()
            label = fut.strftime("%b %Y")
        else:
            label = f"F{i}"
        rows.append(
            {
                "week": label,
                "weekNum": i,
                "price": round(float(pred), 1),
                "forecast": round(float(pred), 1),
                "lower": round(float(pred) * 0.97, 1),
                "upper": round(float(pred) * 1.03, 1),
                "isForecast": True,
            }
        )
    return rows


def planting_interest(db: Session, crop_name: str) -> dict:
    """Share of recent community plans targeting this crop (real DB aggregates)."""
    crop = db.scalar(
        select(CropReference).where(CropReference.display_name.ilike(crop_name.strip())).limit(1)
    )
    if not crop:
        return {"label": "No local data", "detail": "Crop not in reference list yet.", "sharePct": None}

    latest = db.scalar(
        select(DistrictCropAggregate)
        .order_by(desc(DistrictCropAggregate.season_year), desc(DistrictCropAggregate.week_number))
        .limit(1)
    )
    if not latest:
        return {
            "label": "No plans yet",
            "detail": "Community planting totals appear after farms finalize plans.",
            "sharePct": None,
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
        return {
            "label": "No plans yet",
            "detail": f"Week {week}/{year} has no finalized community plans.",
            "sharePct": 0.0,
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
    }


def momentum_label(change_pct: float) -> str:
    if change_pct >= 2:
        return "Rising"
    if change_pct <= -2:
        return "Falling"
    return "Stable"


def build_crop_market_payload(db: Session, crop_name: str) -> dict:
    series, category, proxy_note = load_crop_index_series(crop_name)
    outlook = _forecast_tail(series, horizon=4)
    weekly = build_market_chart(series, outlook)
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

    planting = planting_interest(db, crop_name)
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
        "reddit": planting["label"],
        "redditLabel": "Farmer planting",
        "redditDetail": planting["detail"],
    }
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

    return {
        "currentPrice": round(current, 1),
        "priceUnit": "index",
        "trend": round(trend, 1),
        "sellVerdict": verdict,
        "sellMessage": message,
        "demand": demand,
        "weeklyPrices": weekly,
        "source": " · ".join(sources),
        "category": category,
        "proxyNote": proxy_note,
        "asOf": series.index[-1].strftime("%Y-%m-%d") if len(series) else None,
    }
