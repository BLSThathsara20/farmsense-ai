"""Rebuild Panel B/C PNGs from saved metrics when Colab charts were not downloaded."""
from pathlib import Path
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parent
ART = ROOT / "artifacts"
FIG = ROOT / "figures"


def panel_b_from_metrics():
    m = json.loads((ART / "metrics_b.json").read_text())
    plt.figure(figsize=(8, 5))
    plt.bar(
        ["LSTM", "ARIMA"],
        [m["lstm_mape_pct"], m["arima_mape_pct"]],
        color=["#059669", "#94a3b8"],
    )
    plt.ylabel("MAPE (%)")
    plt.title("L3 Price forecast — LSTM vs ARIMA (from Colab metrics)")
    plt.axhline(15, color="red", linestyle="--", label="NFR4 target 15%")
    plt.legend()
    plt.tight_layout()
    out = FIG / "panel_b_price_mape.png"
    plt.savefig(out, dpi=150)
    plt.close()
    print("Wrote", out)


def panel_c_from_metrics():
    m = json.loads((ART / "metrics_c.json").read_text())
    plt.figure(figsize=(8, 5))
    labels = ["RMSE (°C)", "MAE (°C)"]
    vals = [m["rmse_celsius"], m["mae_celsius"]]
    plt.bar(labels, vals, color="#059669")
    plt.title(f"L2 Weather LSTM — test metrics ({m['test_weeks']} weeks)")
    plt.tight_layout()
    out = FIG / "panel_c_weather_forecast.png"
    plt.savefig(out, dpi=150)
    plt.close()
    print("Wrote", out, "(summary chart — re-export Colab line plot if supervisor wants forecast curve)")


if __name__ == "__main__":
    FIG.mkdir(parents=True, exist_ok=True)
    panel_b_from_metrics()
    panel_c_from_metrics()
