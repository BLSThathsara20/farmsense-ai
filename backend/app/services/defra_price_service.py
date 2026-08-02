"""DEFRA AMMG farm-gate / wholesale guide prices in £ — farmer-readable units.

GOV.UK agricultural price indices are dimensionless (2020=100). Farmers need £/kg
or £/100g. This module loads Defra Agricultural Market Monitoring Group prices and
applies the index outlook % to estimate near-term £ values.
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

import pandas as pd

from app.core.config import get_settings

# FarmSense crop → DEFRA AMMG item (prefer hort £/kg where available)
CROP_DEFRA_ITEM = {
    "Tomato": "tomato",
    "Onion": "onion",
    "Carrot": "carrot",
    "Cabbage": "cabbage_white",
    "Potato": "ni_potato_washing",  # £/t washing potatoes
    "Wheat": "feed_wheat",  # £/t
    "Maize": "feed_wheat",  # closest cereal guide (£/t) — maize not published separately
    "Rice": "feed_wheat",  # proxy cereal
    "Beans": None,
    "Chili": None,
}

PROXY_GBP_NOTE = {
    "Maize": "No separate DEFRA maize £ series — using UK feed wheat (£/t) as a cereal guide.",
    "Rice": "No separate DEFRA rice £ series — using UK feed wheat (£/t) as a cereal guide.",
    "Potato": "Using NI washing potato farm-gate (£/t).",
}


def _candidate_paths() -> list[Path]:
    art = get_settings().resolved_ml_artifacts_dir
    root = Path(__file__).resolve().parents[3]
    return [
        art / "defra_ammg_combined.csv",
        root / "ml-models" / "data" / "prices" / "defra_ammg_combined.csv",
        root / "ml-models" / "artifacts" / "defra_ammg_combined.csv",
        Path("/app/ml-models/data/prices/defra_ammg_combined.csv"),
        Path("/app/ml-models/artifacts/defra_ammg_combined.csv"),
    ]


def _parse_defra_date(raw: str) -> pd.Timestamp | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw).strip()
    if not s:
        return None
    # ISO / slash dates
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y"):
        try:
            return pd.Timestamp(pd.to_datetime(s, format=fmt))
        except Exception:
            pass
    # "Apr-26", "May-26", "Dec-25"
    m = re.match(r"^([A-Za-z]{3})-(\d{2})$", s)
    if m:
        try:
            return pd.Timestamp(pd.to_datetime(f"01-{m.group(1)}-20{m.group(2)}", format="%d-%b-%Y"))
        except Exception:
            pass
    # "April 2026", "December 2025", "March 2026"
    try:
        return pd.Timestamp(pd.to_datetime(s))
    except Exception:
        return None


@lru_cache(maxsize=1)
def _load_defra_frame() -> pd.DataFrame:
    path = next((p for p in _candidate_paths() if p.exists()), None)
    if path is None:
        return pd.DataFrame()
    df = pd.read_csv(path)
    df["parsed_date"] = df["data_date"].map(_parse_defra_date)
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["value", "item"])
    return df


def _to_gbp_per_kg(value: float, units: str) -> tuple[float, str]:
    """Normalise to £/kg for farmer display. Returns (gbp_per_kg, display_unit_label)."""
    u = (units or "").strip().lower()
    if u in ("£/kg", "gbp/kg"):
        return float(value), "£/kg"
    if u in ("p/kg",):
        return float(value) / 100.0, "£/kg"
    if u in ("£/t", "gbp/t", "£/tonne"):
        return float(value) / 1000.0, "£/kg"
    if u in ("€/100kg",):
        # Rough convert — rare for our crops; treat as ~£/100kg then /100
        return float(value) * 0.85 / 100.0, "£/kg"
    return float(value), units or "£"


def resolve_defra_item(crop_name: str) -> tuple[str | None, str | None]:
    key = next((k for k in CROP_DEFRA_ITEM if k.lower() == (crop_name or "").strip().lower()), None)
    if not key:
        return None, f"No DEFRA £ series mapped for {crop_name}."
    item = CROP_DEFRA_ITEM[key]
    if not item:
        return None, f"No farm-gate £ series published for {key} in DEFRA AMMG."
    return item, PROXY_GBP_NOTE.get(key)


def latest_gbp_for_crop(crop_name: str) -> dict | None:
    """Latest DEFRA guide price for a crop, normalised to £/kg (+ handy £/100g)."""
    item, proxy_note = resolve_defra_item(crop_name)
    if not item:
        return None

    df = _load_defra_frame()
    if df.empty:
        return None

    sub = df[df["item"].str.lower() == item.lower()].copy()
    if sub.empty:
        return None

    sub = sub.dropna(subset=["parsed_date"]).sort_values("parsed_date")
    if sub.empty:
        # fall back to last row without date
        row = df[df["item"].str.lower() == item.lower()].iloc[-1]
        as_of = None
    else:
        row = sub.iloc[-1]
        as_of = row["parsed_date"].strftime("%Y-%m-%d")

    gbp_kg, _ = _to_gbp_per_kg(float(row["value"]), str(row.get("units") or ""))
    return {
        "item": item,
        "rawValue": float(row["value"]),
        "rawUnits": str(row.get("units") or ""),
        "gbpPerKg": round(gbp_kg, 3),
        "gbpPer100g": round(gbp_kg / 10.0, 3),
        "pencePerKg": round(gbp_kg * 100.0, 1),
        "asOf": as_of,
        "proxyNote": proxy_note,
        "source": "DEFRA AMMG (farm-gate / wholesale guide)",
    }


def apply_outlook_to_gbp(latest: dict, change_pct: float) -> dict:
    """Scale current £ by GOV.UK index outlook % for a farmer-facing forecast."""
    base = float(latest["gbpPerKg"])
    factor = 1.0 + (float(change_pct) / 100.0)
    forecast_kg = max(0.0, base * factor)
    return {
        **latest,
        "outlookPct": round(float(change_pct), 1),
        "forecastGbpPerKg": round(forecast_kg, 3),
        "forecastGbpPer100g": round(forecast_kg / 10.0, 3),
        "forecastPencePerKg": round(forecast_kg * 100.0, 1),
        "deltaGbpPerKg": round(forecast_kg - base, 3),
    }


def build_farmer_price_guide(crop_name: str, change_pct: float) -> dict | None:
    latest = latest_gbp_for_crop(crop_name)
    if not latest:
        item, note = resolve_defra_item(crop_name)
        return {
            "available": False,
            "reason": note or "No DEFRA £ price available for this crop.",
        }
    guide = apply_outlook_to_gbp(latest, change_pct)
    guide["available"] = True
    # Prefer £/kg for cereals (small numbers) still fine; highlight 100g for expensive veg
    guide["primaryUnit"] = "£/kg"
    guide["secondaryUnit"] = "£/100g" if guide["gbpPerKg"] >= 0.8 else "p/kg"
    return guide
