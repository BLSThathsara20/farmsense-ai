from pathlib import Path

import joblib
import pandas as pd

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

_model = None


class ModelNotFoundError(FileNotFoundError):
    pass


def load_model(model_path: Path | None = None):
    global _model
    path = model_path or get_settings().ml_model_path
    if not path.exists():
        raise ModelNotFoundError(f"Model artefact not found: {path}")
    _model = joblib.load(path)
    return _model


def get_model():
    global _model
    if _model is None:
        load_model()
    return _model


def predict_suitability(soil: dict, model_path: Path | None = None) -> dict:
    if model_path is not None:
        model = load_model(model_path)
    else:
        try:
            model = get_model()
        except ModelNotFoundError as exc:
            raise ServiceUnavailableError(str(exc)) from exc

    row = pd.DataFrame([{k: soil[k] for k in FEATURES}])
    label = model.predict(row)[0]
    probabilities = model.predict_proba(row)[0]
    classes = list(model.classes_)
    return {
        "label": str(label),
        "probabilities": {str(c): float(p) for c, p in zip(classes, probabilities)},
    }


def rank_by_profit(crops: list[dict]) -> list[dict]:
    return sorted(crops, key=lambda item: item["profitEstimate"], reverse=True)


def district_oversupply_warning(district_count: int, limit: int) -> bool:
    return district_count >= limit
