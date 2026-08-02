"""Automatic forecast ledger: save predictions, compare to GOV.UK actuals, expose accuracy.

Flow (no manual step):
  1. Training / history ends at month T  → model forecasts T+1, T+2, …
  2. Snapshots are written to artifacts/forecast_ledger.json
  3. When Defra publishes a new month → reconcile forecast vs actual → save error
  4. Market payload includes pending + resolved comparisons for the UI
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.core.config import get_settings

logger = logging.getLogger(__name__)

LEDGER_NAME = "forecast_ledger.json"


def _ledger_path() -> Path:
    return get_settings().resolved_ml_artifacts_dir / LEDGER_NAME


def _month_key(ts) -> str:
    return pd.Timestamp(ts).strftime("%Y-%m")


def _load_ledger() -> dict[str, Any]:
    path = _ledger_path()
    if not path.exists():
        return {"forecasts": [], "comparisons": []}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {"forecasts": [], "comparisons": []}


def _save_ledger(data: dict[str, Any]) -> None:
    path = _ledger_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, default=str))


def record_forecasts(
    *,
    crop: str,
    category: str,
    as_of: str,
    predictions: list[dict[str, Any]],
    method: str = "govuk_damped",
) -> int:
    """Persist forecast months that are not already recorded for this as_of + crop."""
    if not predictions:
        return 0
    ledger = _load_ledger()
    existing = {
        (f.get("crop"), f.get("month"), f.get("asOf"))
        for f in ledger.get("forecasts", [])
    }
    now = datetime.now(timezone.utc).isoformat()
    added = 0
    for pred in predictions:
        month = pred.get("month")
        value = pred.get("value")
        if not month or value is None:
            continue
        key = (crop, month, as_of)
        if key in existing:
            continue
        ledger.setdefault("forecasts", []).append(
            {
                "crop": crop,
                "category": category,
                "month": month,
                "predicted": round(float(value), 2),
                "asOf": as_of,
                "method": method,
                "savedAt": now,
                "status": "pending",
            }
        )
        existing.add(key)
        added += 1
    if added:
        _save_ledger(ledger)
    return added


def reconcile_with_actuals(series: pd.Series, *, crop: str, category: str) -> list[dict]:
    """When actual GOV.UK months exist for pending forecasts, compare and save."""
    if series is None or series.empty:
        return []

    actuals = {
        _month_key(ts): float(val)
        for ts, val in series.items()
        if pd.notna(val)
    }
    ledger = _load_ledger()
    newly: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    for row in ledger.get("forecasts", []):
        if row.get("crop") != crop or row.get("status") != "pending":
            continue
        month = row.get("month")
        if month not in actuals:
            continue
        predicted = float(row["predicted"])
        actual = actuals[month]
        err = abs(predicted - actual)
        mape = (err / abs(actual) * 100) if actual else None
        comparison = {
            "crop": crop,
            "category": category,
            "month": month,
            "predicted": round(predicted, 2),
            "actual": round(actual, 2),
            "error": round(err, 2),
            "mapePct": round(mape, 1) if mape is not None else None,
            "asOf": row.get("asOf"),
            "method": row.get("method"),
            "comparedAt": now,
        }
        ledger.setdefault("comparisons", []).append(comparison)
        row["status"] = "resolved"
        row["resolvedAt"] = now
        newly.append(comparison)

    if newly:
        _save_ledger(ledger)
    return newly


def seed_walkforward_comparisons(
    series: pd.Series,
    *,
    crop: str,
    category: str,
    forecast_fn,
    holdout: int = 3,
) -> list[dict]:
    """Backfill accuracy: pretend history stopped earlier, forecast known months, compare.

    Uses the same forecast_fn as production so results match the live model.
    Only runs when we don't already have comparisons for those months.
    """
    if series is None or len(series) < holdout + 6:
        return []

    ledger = _load_ledger()
    have = {
        (c.get("crop"), c.get("month"))
        for c in ledger.get("comparisons", [])
    }
    newly: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()
    sorted_series = series.sort_index()

    for k in range(1, holdout + 1):
        # History ends at index -(holdout-k+1); target is next month after that
        cut = len(sorted_series) - (holdout - k + 1)
        if cut < 6:
            continue
        hist = sorted_series.iloc[:cut]
        target_ts = sorted_series.index[cut]
        month = _month_key(target_ts)
        if (crop, month) in have:
            continue
        actual = float(sorted_series.iloc[cut])
        outlook = forecast_fn(hist, horizon=1)
        preds = outlook.get("predictions") or []
        if not preds:
            continue
        predicted = float(preds[0])
        err = abs(predicted - actual)
        mape = (err / abs(actual) * 100) if actual else None
        as_of = hist.index[-1].strftime("%Y-%m-%d")
        comparison = {
            "crop": crop,
            "category": category,
            "month": month,
            "predicted": round(predicted, 2),
            "actual": round(actual, 2),
            "error": round(err, 2),
            "mapePct": round(mape, 1) if mape is not None else None,
            "asOf": as_of,
            "method": outlook.get("method", "govuk_damped"),
            "comparedAt": now,
            "source": "walkforward_auto",
        }
        ledger.setdefault("comparisons", []).append(comparison)
        newly.append(comparison)
        have.add((crop, month))

    if newly:
        _save_ledger(ledger)
    return newly


def summary_for_crop(crop: str) -> dict[str, Any]:
    """UI-facing accuracy summary for one crop."""
    ledger = _load_ledger()
    pending = [
        f
        for f in ledger.get("forecasts", [])
        if f.get("crop") == crop and f.get("status") == "pending"
    ]
    comparisons = [c for c in ledger.get("comparisons", []) if c.get("crop") == crop]
    comparisons = sorted(comparisons, key=lambda c: c.get("month", ""), reverse=True)

    mapes = [c["mapePct"] for c in comparisons if c.get("mapePct") is not None]
    avg_mape = round(float(np.mean(mapes)), 1) if mapes else None

    return {
        "pending": [
            {
                "month": p["month"],
                "predicted": p["predicted"],
                "asOf": p.get("asOf"),
            }
            for p in sorted(pending, key=lambda x: x.get("month", ""))
        ],
        "recent": comparisons[:6],
        "avgMapePct": avg_mape,
        "comparedCount": len(comparisons),
        "pendingCount": len(pending),
    }


def sync_forecast_ledger(
    *,
    crop: str,
    category: str,
    series: pd.Series,
    weekly_rows: list[dict],
    outlook: dict,
    forecast_fn,
) -> dict[str, Any]:
    """One-shot agent step: save new forecasts, reconcile, backfill walk-forward, return summary."""
    as_of = series.index[-1].strftime("%Y-%m-%d") if len(series) else None
    if not as_of:
        return summary_for_crop(crop)

    # Save continuous forecast/estimate months from the chart
    preds_to_save = []
    for row in weekly_rows:
        if not row.get("isForecast"):
            continue
        # Parse "May 2026" → 2026-05
        try:
            month = pd.Timestamp(row["week"]).strftime("%Y-%m")
        except Exception:
            continue
        preds_to_save.append({"month": month, "value": row.get("forecast") or row.get("price")})

    record_forecasts(
        crop=crop,
        category=category,
        as_of=as_of,
        predictions=preds_to_save,
        method=outlook.get("method", "govuk_damped"),
    )
    reconcile_with_actuals(series, crop=crop, category=category)
    seed_walkforward_comparisons(
        series, crop=crop, category=category, forecast_fn=forecast_fn, holdout=3
    )
    return summary_for_crop(crop)
