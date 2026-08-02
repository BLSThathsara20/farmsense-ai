from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import CropReference


def seed_reference_data(db: Session) -> None:
    """Seed crop reference rows only — no fake district planting counts."""
    crops = [
        ("tomato", "Tomato", "tomato"),
        ("maize", "Maize", "maize"),
        ("rice", "Rice", "rice"),
        ("potato", "Potato", "potato"),
        ("cabbage", "Cabbage", "cabbage"),
        ("onion", "Onion", "onion"),
        ("carrot", "Carrot", "carrot"),
        ("chili", "Chili", "chili"),
        ("beans", "Beans", "kidneybeans"),
    ]
    for slug, display, l1 in crops:
        if db.scalar(select(CropReference).where(CropReference.slug == slug)):
            continue
        db.add(CropReference(slug=slug, display_name=display, l1_label=l1))
    db.commit()
