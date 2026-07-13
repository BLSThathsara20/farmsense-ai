from pathlib import Path

from app.core.config import get_settings
from app.ml.loader import (  # noqa: F401
    FEATURES,
    ModelNotFoundError,
    district_oversupply_warning,
    get_model,
    load_model,
    rank_by_profit,
)

DEFAULT_MODEL_PATH = get_settings().ml_model_path


def predict_suitability(soil: dict, model_path: Path | None = None) -> dict:
    from app.ml.loader import predict_suitability as _predict

    path = model_path or DEFAULT_MODEL_PATH
    if not path.exists():
        raise ModelNotFoundError(f"Model artefact not found: {path}")
    return _predict(soil, model_path=path)
