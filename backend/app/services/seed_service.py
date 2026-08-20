from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import CropReference
from app.services.crop_lifecycle_service import CROP_LIFECYCLE_DEFAULTS


# Display name + L1 label for seed. Lifecycle days come from CROP_LIFECYCLE_DEFAULTS.
_SEED_CROPS = [
    ("tomato", "Tomato", "tomato"),
    ("maize", "Maize", "maize"),
    ("rice", "Rice", "rice"),
    ("wheat", "Wheat", "wheat"),
    ("potato", "Potato", "potato"),
    ("cabbage", "Cabbage", "cabbage"),
    ("onion", "Onion", "onion"),
    ("carrot", "Carrot", "carrot"),
    ("chili", "Chili", "chili"),
    ("beans", "Beans", "kidneybeans"),
]


def _apply_lifecycle(row: CropReference, slug: str) -> None:
    meta = CROP_LIFECYCLE_DEFAULTS.get(slug) or {}
    if not meta:
        row.category = row.category or "default"
        return
    row.category = meta.get("category") or "default"
    row.days_to_harvest_min = meta.get("days_to_harvest_min")
    row.days_to_harvest_max = meta.get("days_to_harvest_max")
    row.days_to_sell_min = meta.get("days_to_sell_min")
    row.days_to_sell_max = meta.get("days_to_sell_max")
    row.lifecycle_note = meta.get("lifecycle_note")


def seed_reference_data(db: Session) -> None:
    """Seed / refresh crop reference rows including lifecycle days for timelines.

    Adding a plant later: insert into crop_reference (slug, display_name, l1_label,
    category, days_to_*). Recommendation windows and reminders pick it up automatically.
    If days are omitted, category defaults apply.
    """
    for slug, display, l1 in _SEED_CROPS:
        row = db.scalar(select(CropReference).where(CropReference.slug == slug))
        if row is None:
            row = CropReference(slug=slug, display_name=display, l1_label=l1)
            db.add(row)
        else:
            row.display_name = display
            row.l1_label = l1
            row.is_active = True
        _apply_lifecycle(row, slug)
    db.commit()
