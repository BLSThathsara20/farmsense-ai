"""Crop lifecycle → planting windows and reminders.

Timelines come from `crop_reference` so a future developer can add a plant once
(with days or a category) and recommendations / schedules pick it up automatically.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models import CropReference

# Used when a new crop has category but no explicit day columns yet.
CATEGORY_DEFAULTS: dict[str, tuple[int, int, int, int]] = {
    "fruiting": (70, 90, 75, 100),
    "root": (70, 110, 75, 120),
    "leafy": (50, 90, 55, 95),
    "grain": (100, 150, 110, 160),
    "legume": (55, 80, 60, 90),
    "default": (70, 100, 75, 110),
}

# Seed + runtime fallback keyed by slug (and common aliases).
CROP_LIFECYCLE_DEFAULTS: dict[str, dict[str, Any]] = {
    "tomato": {
        "category": "fruiting",
        "days_to_harvest_min": 70,
        "days_to_harvest_max": 90,
        "days_to_sell_min": 75,
        "days_to_sell_max": 100,
        "lifecycle_note": "Outdoor tomato guide maturity",
    },
    "maize": {
        "category": "grain",
        "days_to_harvest_min": 90,
        "days_to_harvest_max": 120,
        "days_to_sell_min": 95,
        "days_to_sell_max": 130,
        "lifecycle_note": "Sweetcorn / maize maturity",
    },
    "corn": {
        "category": "grain",
        "days_to_harvest_min": 90,
        "days_to_harvest_max": 120,
        "days_to_sell_min": 95,
        "days_to_sell_max": 130,
        "lifecycle_note": "Sweetcorn / maize maturity",
    },
    "rice": {
        "category": "grain",
        "days_to_harvest_min": 100,
        "days_to_harvest_max": 140,
        "days_to_sell_min": 105,
        "days_to_sell_max": 150,
        "lifecycle_note": "Rice maturity (limited UK outdoor fit)",
    },
    "wheat": {
        "category": "grain",
        "days_to_harvest_min": 120,
        "days_to_harvest_max": 180,
        "days_to_sell_min": 125,
        "days_to_sell_max": 190,
        "lifecycle_note": "Winter / spring wheat style window",
    },
    "potato": {
        "category": "root",
        "days_to_harvest_min": 80,
        "days_to_harvest_max": 110,
        "days_to_sell_min": 85,
        "days_to_sell_max": 120,
        "lifecycle_note": "Maincrop potato guide",
    },
    "cabbage": {
        "category": "leafy",
        "days_to_harvest_min": 70,
        "days_to_harvest_max": 100,
        "days_to_sell_min": 75,
        "days_to_sell_max": 110,
        "lifecycle_note": "Cabbage heading maturity",
    },
    "onion": {
        "category": "root",
        "days_to_harvest_min": 90,
        "days_to_harvest_max": 120,
        "days_to_sell_min": 95,
        "days_to_sell_max": 130,
        "lifecycle_note": "Bulb onion maturity",
    },
    "carrot": {
        "category": "root",
        "days_to_harvest_min": 70,
        "days_to_harvest_max": 100,
        "days_to_sell_min": 75,
        "days_to_sell_max": 110,
        "lifecycle_note": "Carrot maturity",
    },
    "chili": {
        "category": "fruiting",
        "days_to_harvest_min": 80,
        "days_to_harvest_max": 100,
        "days_to_sell_min": 85,
        "days_to_sell_max": 110,
        "lifecycle_note": "Chili / pepper maturity",
    },
    "chilli": {
        "category": "fruiting",
        "days_to_harvest_min": 80,
        "days_to_harvest_max": 100,
        "days_to_sell_min": 85,
        "days_to_sell_max": 110,
        "lifecycle_note": "Chili / pepper maturity",
    },
    "beans": {
        "category": "legume",
        "days_to_harvest_min": 55,
        "days_to_harvest_max": 75,
        "days_to_sell_min": 60,
        "days_to_sell_max": 85,
        "lifecycle_note": "French / runner bean style",
    },
    "kidneybeans": {
        "category": "legume",
        "days_to_harvest_min": 55,
        "days_to_harvest_max": 75,
        "days_to_sell_min": 60,
        "days_to_sell_max": 85,
        "lifecycle_note": "Bean style maturity",
    },
}


def _normalize_key(name: str) -> str:
    return name.replace(" ", "_").replace("-", "_").lower().strip()


def _parse_date(value: str | date | None) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    text = str(value).strip()[:10]
    try:
        return date.fromisoformat(text)
    except ValueError as exc:
        raise ValueError("Planted date must be YYYY-MM-DD.") from exc


def _fmt_day(d: date) -> str:
    return f"{d.day} {d.strftime('%b %Y')}"


def _fmt_range(start: date, end: date) -> str:
    if start == end:
        return _fmt_day(start)
    if start.year == end.year and start.month == end.month:
        return f"{start.day}–{end.day} {start.strftime('%b %Y')}"
    if start.year == end.year:
        return f"{start.day} {start.strftime('%b')} – {_fmt_day(end)}"
    return f"{_fmt_day(start)} – {_fmt_day(end)}"

def _days_to_weeks_label(lo: int, hi: int) -> str:
    w_lo = max(1, lo // 7)
    w_hi = max(w_lo, (hi + 6) // 7)
    if w_lo == w_hi:
        return f"Week {w_lo} after sow"
    return f"Week {w_lo}–{w_hi} after sow"


def resolve_lifecycle_days(
    *,
    slug: str | None = None,
    category: str | None = None,
    days_to_harvest_min: int | None = None,
    days_to_harvest_max: int | None = None,
    days_to_sell_min: int | None = None,
    days_to_sell_max: int | None = None,
    lifecycle_note: str | None = None,
) -> dict[str, Any]:
    """Resolve harvest/sell day windows with crop → category → default fallback."""
    key = _normalize_key(slug or "")
    preset = CROP_LIFECYCLE_DEFAULTS.get(key) or CROP_LIFECYCLE_DEFAULTS.get(key.rstrip("s"))
    cat = (category or (preset or {}).get("category") or "default").lower()
    cat_defaults = CATEGORY_DEFAULTS.get(cat) or CATEGORY_DEFAULTS["default"]

    h_min = days_to_harvest_min or (preset or {}).get("days_to_harvest_min") or cat_defaults[0]
    h_max = days_to_harvest_max or (preset or {}).get("days_to_harvest_max") or cat_defaults[1]
    s_min = days_to_sell_min or (preset or {}).get("days_to_sell_min") or cat_defaults[2]
    s_max = days_to_sell_max or (preset or {}).get("days_to_sell_max") or cat_defaults[3]

    if h_max < h_min:
        h_min, h_max = h_max, h_min
    if s_max < s_min:
        s_min, s_max = s_max, s_min

    return {
        "slug": key or None,
        "category": cat,
        "daysToHarvestMin": int(h_min),
        "daysToHarvestMax": int(h_max),
        "daysToSellMin": int(s_min),
        "daysToSellMax": int(s_max),
        "note": lifecycle_note or (preset or {}).get("lifecycle_note"),
        "source": "crop_reference" if days_to_harvest_min else ("preset" if preset else "category_default"),
    }


def lookup_crop_reference(db: Session | None, crop_name: str) -> CropReference | None:
    if not db or not crop_name:
        return None
    key = _normalize_key(crop_name)
    display = crop_name.replace("_", " ").title()
    return db.scalar(
        select(CropReference).where(
            or_(
                CropReference.slug == key,
                CropReference.l1_label == key,
                CropReference.display_name.ilike(display),
                CropReference.slug == key.rstrip("s"),
            )
        )
    )


def get_lifecycle_for_crop(db: Session | None, crop_name: str) -> dict[str, Any]:
    row = lookup_crop_reference(db, crop_name)
    if row:
        return resolve_lifecycle_days(
            slug=row.slug,
            category=getattr(row, "category", None),
            days_to_harvest_min=getattr(row, "days_to_harvest_min", None),
            days_to_harvest_max=getattr(row, "days_to_harvest_max", None),
            days_to_sell_min=getattr(row, "days_to_sell_min", None),
            days_to_sell_max=getattr(row, "days_to_sell_max", None),
            lifecycle_note=getattr(row, "lifecycle_note", None),
        )
    return resolve_lifecycle_days(slug=_normalize_key(crop_name))


def build_planting_window(
    lifecycle: dict[str, Any],
    planted_date: str | date | None = None,
    crop_name: str | None = None,
) -> dict[str, Any]:
    """Build sow/harvest/sell labels, ISO ranges, and reminder dates."""
    planted = _parse_date(planted_date)
    h_min = int(lifecycle["daysToHarvestMin"])
    h_max = int(lifecycle["daysToHarvestMax"])
    s_min = int(lifecycle["daysToSellMin"])
    s_max = int(lifecycle["daysToSellMax"])
    crop = crop_name or "Crop"

    if planted is None:
        window = {
            "sow": "When you plant",
            "harvest": f"{h_min}–{h_max} days after sow",
            "sell": f"{s_min}–{s_max} days after sow",
            "harvestWeeks": _days_to_weeks_label(h_min, h_max),
            "sellWeeks": _days_to_weeks_label(s_min, s_max),
            "mode": "relative",
            "plantedDate": None,
            "ranges": None,
        }
        reminders: list[dict[str, Any]] = []
    else:
        harvest_start = planted + timedelta(days=h_min)
        harvest_end = planted + timedelta(days=h_max)
        sell_start = planted + timedelta(days=s_min)
        sell_end = planted + timedelta(days=s_max)
        window = {
            "sow": _fmt_day(planted),
            "harvest": _fmt_range(harvest_start, harvest_end),
            "sell": _fmt_range(sell_start, sell_end),
            "harvestWeeks": _days_to_weeks_label(h_min, h_max),
            "sellWeeks": _days_to_weeks_label(s_min, s_max),
            "mode": "calendar",
            "plantedDate": planted.isoformat(),
            "ranges": {
                "sow": planted.isoformat(),
                "harvestStart": harvest_start.isoformat(),
                "harvestEnd": harvest_end.isoformat(),
                "sellStart": sell_start.isoformat(),
                "sellEnd": sell_end.isoformat(),
            },
        }
        reminders = [
            {
                "type": "harvest",
                "crop": crop,
                "date": harvest_start.isoformat(),
                "label": f"Harvest window opens for {crop}",
            },
            {
                "type": "sell",
                "crop": crop,
                "date": sell_start.isoformat(),
                "label": f"Sell window opens for {crop}",
            },
        ]

    return {
        **window,
        "lifecycle": {
            "daysToHarvestMin": h_min,
            "daysToHarvestMax": h_max,
            "daysToSellMin": s_min,
            "daysToSellMax": s_max,
            "category": lifecycle.get("category"),
            "note": lifecycle.get("note"),
            "source": lifecycle.get("source"),
        },
        "reminders": reminders,
    }


def _iso_day(value: str | date | datetime | None) -> str | None:
    """Extract YYYY-MM-DD from an ISO timestamp, date, or date string."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
        try:
            return date.fromisoformat(text[:10]).isoformat()
        except ValueError:
            return None
    return None


def attach_crop_schedule(
    crop_payload: dict[str, Any],
    db: Session | None,
    planted_date: str | date | None = None,
) -> dict[str, Any]:
    """Mutate a recommendation / selected-crop dict with lifecycle window + reminders.

    Only the explicit planted_date argument drives calendar mode (plan planted date
    or generated plan date fallback). Nested plantingWindow.plantedDate is ignored.
    """
    name = crop_payload.get("crop") or "Crop"
    lifecycle = get_lifecycle_for_crop(db, name)
    window = build_planting_window(lifecycle, planted_date, crop_name=name)
    crop_payload["plantingWindow"] = {
        "sow": window["sow"],
        "harvest": window["harvest"],
        "sell": window["sell"],
        "harvestWeeks": window.get("harvestWeeks"),
        "sellWeeks": window.get("sellWeeks"),
        "mode": window["mode"],
        "plantedDate": window.get("plantedDate"),
        "ranges": window.get("ranges"),
        "lifecycle": window.get("lifecycle"),
    }
    crop_payload["reminders"] = window.get("reminders") or []
    crop_payload["lifecycle"] = window.get("lifecycle")
    if planted_date:
        crop_payload["plantedDate"] = window.get("plantedDate")
    else:
        crop_payload.pop("plantedDate", None)
    return crop_payload


def enrich_plan_schedules(db: Session | None, payload: dict[str, Any]) -> dict[str, Any]:
    """Refresh crop windows from crop_reference.

    Planted date priority:
    1. Farmer-set plantedDate
    2. Plan generated / created date (runDate / createdAt)
    """
    stored = payload.get("plantedDate") or None
    if stored == "":
        stored = None
        payload["plantedDate"] = None
    stored = _iso_day(stored)
    generated = _iso_day(payload.get("runDate")) or _iso_day(payload.get("createdAt"))
    effective = stored or generated
    source = "user" if stored else ("generated" if generated else None)

    schedules: dict[str, Any] = {}
    all_reminders: list[dict[str, Any]] = []

    for key in ("recommendations", "selectedCrops"):
        items = payload.get(key) or []
        refreshed = []
        for item in items:
            clean = dict(item)
            # Drop stale nested dates; only effective plan date applies
            clean.pop("plantedDate", None)
            pw = dict(clean.get("plantingWindow") or {})
            pw.pop("plantedDate", None)
            pw.pop("ranges", None)
            clean["plantingWindow"] = pw
            updated = attach_crop_schedule(clean, db, planted_date=effective)
            refreshed.append(updated)
            crop = updated.get("crop")
            if crop:
                schedules[crop] = {
                    "plantedDate": (updated.get("plantingWindow") or {}).get("plantedDate"),
                    "plantingWindow": updated.get("plantingWindow"),
                    "reminders": updated.get("reminders") or [],
                }
            all_reminders.extend(updated.get("reminders") or [])
        payload[key] = refreshed

    top = payload.get("topRecommendation")
    if top and isinstance(top, dict):
        top_name = top.get("crop")
        match = next(
            (c for c in (payload.get("selectedCrops") or []) if c.get("crop") == top_name),
            None,
        ) or next(
            (c for c in (payload.get("recommendations") or []) if c.get("crop") == top_name),
            None,
        )
        if match:
            payload["topRecommendation"] = match
        else:
            clean_top = dict(top)
            clean_top.pop("plantedDate", None)
            pw = dict(clean_top.get("plantingWindow") or {})
            pw.pop("plantedDate", None)
            pw.pop("ranges", None)
            clean_top["plantingWindow"] = pw
            payload["topRecommendation"] = attach_crop_schedule(
                clean_top, db, planted_date=effective
            )

    seen: set[tuple] = set()
    unique: list[dict[str, Any]] = []
    for rem in sorted(all_reminders, key=lambda r: (r.get("date") or "", r.get("type") or "")):
        sig = (rem.get("type"), rem.get("crop"), rem.get("date"))
        if sig in seen:
            continue
        seen.add(sig)
        unique.append(rem)

    payload["plantedDate"] = stored
    payload["generatedPlantedDate"] = generated
    payload["effectivePlantedDate"] = effective
    payload["plantedDateSource"] = source
    payload["cropSchedules"] = schedules
    payload["reminders"] = unique
    return payload
