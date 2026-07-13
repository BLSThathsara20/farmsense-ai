from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.ml_service import ModelNotFoundError, district_oversupply_warning, predict_suitability, rank_by_profit

VALID_SOIL = {
    "N": 90.0,
    "P": 42.0,
    "K": 43.0,
    "temperature": 20.8,
    "humidity": 82.0,
    "ph": 6.5,
    "rainfall": 202.9,
}


def test_tc01_rf_predict_valid_soil_vector():
    result = predict_suitability(VALID_SOIL)
    assert "label" in result
    assert isinstance(result["label"], str)
    assert result["probabilities"]
    assert abs(sum(result["probabilities"].values()) - 1.0) < 1e-6


def test_tc02_api_health_endpoint(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_tc03_ranking_orders_by_profit():
    crops = [
        {"crop": "wheat", "profitEstimate": 1200},
        {"crop": "maize", "profitEstimate": 2400},
        {"crop": "rice", "profitEstimate": 800},
    ]
    ranked = rank_by_profit(crops)
    profits = [item["profitEstimate"] for item in ranked]
    assert profits == sorted(profits, reverse=True)


def test_tc04_invalid_soil_vector_rejected(client: TestClient):
    invalid = {**VALID_SOIL, "ph": -1.0}
    response = client.post("/predict/suitability", json=invalid)
    assert response.status_code == 422


def test_tc05_missing_model_arteffact_graceful_error(tmp_path: Path):
    missing = tmp_path / "missing.pkl"
    with pytest.raises(ModelNotFoundError):
        predict_suitability(VALID_SOIL, model_path=missing)


def test_tc05_missing_model_artefact_api_message(client: TestClient, monkeypatch):
    from app import ml_service

    monkeypatch.setattr(ml_service, "DEFAULT_MODEL_PATH", Path("/nonexistent/rf_suitability.pkl"))
    response = client.post("/predict/suitability", json=VALID_SOIL)
    assert response.status_code == 503
    body = response.json()
    message = body.get("detail") or body.get("error", {}).get("message", "")
    assert "not found" in message.lower()


def test_tc06_oversupply_threshold_boundary():
    assert district_oversupply_warning(10, 10) is True
    assert district_oversupply_warning(9, 10) is False
