"""Heavy L2 / L3 LSTM inference (TensorFlow).

Loads:
  - lstm_price.h5 + scaler_price.pkl + price_weekly.csv
  - lstm_weather.h5 + scaler_weather.pkl + weather_weekly.csv

Notebooks used SEQ_LEN=12 and MinMaxScaler. Scalers were refit on the same
series artefacts so inference matches training preprocessing.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.core.config import get_settings

SEQ_LEN = 12

_tf = None
_price_model = None
_weather_model = None


def _artifacts() -> Path:
    return get_settings().resolved_ml_artifacts_dir


def tensorflow_available() -> bool:
    try:
        import tensorflow as tf  # noqa: F401

        return True
    except Exception:
        return False


def _tf_mod():
    global _tf
    if _tf is None:
        import tensorflow as tf

        # Keep logs quiet in API containers
        tf.get_logger().setLevel("ERROR")
        _tf = tf
    return _tf


@lru_cache(maxsize=1)
def load_price_series() -> pd.Series:
    path = _artifacts() / "price_weekly.csv"
    series = pd.read_csv(path, index_col=0, parse_dates=True).iloc[:, 0].astype(float).dropna()
    return series.sort_index()


@lru_cache(maxsize=1)
def load_weather_weekly() -> pd.DataFrame:
    path = _artifacts() / "weather_weekly.csv"
    df = pd.read_csv(path, index_col=0, parse_dates=True)
    return df.sort_index().dropna()


@lru_cache(maxsize=1)
def load_price_scaler():
    path = _artifacts() / "scaler_price.pkl"
    if path.exists():
        return joblib.load(path)
    from sklearn.preprocessing import MinMaxScaler

    series = load_price_series()
    scaler = MinMaxScaler()
    scaler.fit(series.values.reshape(-1, 1))
    return scaler


@lru_cache(maxsize=1)
def load_weather_scaler():
    path = _artifacts() / "scaler_weather.pkl"
    if path.exists():
        return joblib.load(path)
    from sklearn.preprocessing import MinMaxScaler

    temps = load_weather_weekly()["temp"].values.reshape(-1, 1)
    scaler = MinMaxScaler()
    scaler.fit(temps)
    return scaler


def get_price_lstm():
    global _price_model
    if _price_model is None:
        tf = _tf_mod()
        path = _artifacts() / "lstm_price.h5"
        if not path.exists():
            raise FileNotFoundError(f"Missing {path}")
        _price_model = tf.keras.models.load_model(path, compile=False)
    return _price_model


def get_weather_lstm():
    global _weather_model
    if _weather_model is None:
        tf = _tf_mod()
        path = _artifacts() / "lstm_weather.h5"
        if not path.exists():
            raise FileNotFoundError(f"Missing {path}")
        _weather_model = tf.keras.models.load_model(path, compile=False)
    return _weather_model


def _recursive_forecast(model, scaler, values_1d: np.ndarray, horizon: int) -> np.ndarray:
    """One-step LSTM rolled forward `horizon` times (matches notebook SEQ_LEN)."""
    if len(values_1d) < SEQ_LEN:
        raise ValueError(f"Need at least {SEQ_LEN} history points, got {len(values_1d)}")

    hist = values_1d[-SEQ_LEN:].astype(float).reshape(-1, 1)
    window = scaler.transform(hist).reshape(1, SEQ_LEN, 1)
    preds_scaled: list[float] = []
    for _ in range(horizon):
        nxt = float(model.predict(window, verbose=0)[0, 0])
        preds_scaled.append(nxt)
        # slide window
        window = np.concatenate(
            [window[:, 1:, :], np.array([[[nxt]]], dtype=np.float32)],
            axis=1,
        )
    preds = scaler.inverse_transform(np.array(preds_scaled).reshape(-1, 1)).flatten()
    return preds


def lstm_price_forecast(horizon_weeks: int = 4) -> dict:
    model = get_price_lstm()
    scaler = load_price_scaler()
    series = load_price_series()
    values = series.to_numpy(dtype=float)
    preds = _recursive_forecast(model, scaler, values, horizon_weeks)
    latest = float(values[-1])
    future_mean = float(np.mean(preds))
    change_pct = ((future_mean - latest) / latest) * 100 if latest else 0.0
    return {
        "predictions": [round(float(p), 2) for p in preds],
        "latest": round(latest, 2),
        "forecast_mean": round(future_mean, 2),
        "change_pct": round(change_pct, 2),
        "horizon_weeks": horizon_weeks,
        "method": "l3_lstm_price",
        "source": "lstm_price.h5 · price_weekly.csv",
        "model_file": "lstm_price.h5",
    }


def lstm_weather_forecast(horizon_weeks: int = 4) -> dict:
    model = get_weather_lstm()
    scaler = load_weather_scaler()
    weekly = load_weather_weekly()
    temps = weekly["temp"].to_numpy(dtype=float)
    rains = weekly["rain"].to_numpy(dtype=float) if "rain" in weekly.columns else None
    preds = _recursive_forecast(model, scaler, temps, horizon_weeks)
    latest = float(temps[-1])
    future_mean = float(np.mean(preds))
    rain_week = float(np.mean(rains[-4:])) if rains is not None and len(rains) else 25.0
    return {
        "predictions_c": [round(float(p), 2) for p in preds],
        "latest_c": round(latest, 2),
        "forecast_mean_c": round(future_mean, 2),
        "rain_mm_week": round(rain_week, 1),
        "horizon_weeks": horizon_weeks,
        "method": "l2_lstm_weather",
        "source": "lstm_weather.h5 · weather_weekly.csv",
        "model_file": "lstm_weather.h5",
    }


def warm_lstm_models() -> dict:
    """Eager-load both LSTM models (call on API startup if heavy mode)."""
    status = {"tensorflow": tensorflow_available(), "price": False, "weather": False, "error": None}
    if not status["tensorflow"]:
        status["error"] = "tensorflow not installed"
        return status
    try:
        get_price_lstm()
        status["price"] = True
    except Exception as exc:
        status["error"] = f"price: {exc}"
    try:
        get_weather_lstm()
        status["weather"] = True
    except Exception as exc:
        status["error"] = (status["error"] or "") + f" weather: {exc}"
    return status
