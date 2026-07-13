"""Train Notebook A locally (sklearn only) — saves rf_suitability.pkl + panel_a PNG."""
from pathlib import Path
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, train_test_split

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "suitability" / "Crop_recommendation.csv"
ART = ROOT / "artifacts"
FIG = ROOT / "figures"

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"


def main():
    ART.mkdir(parents=True, exist_ok=True)
    FIG.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(DATA)
    X, y = df[FEATURES], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    grid = GridSearchCV(
        RandomForestClassifier(random_state=42, n_jobs=-1),
        {"n_estimators": [100, 200, 300], "max_depth": [None, 10, 20]},
        cv=3,
        scoring="f1_weighted",
        n_jobs=-1,
    )
    grid.fit(X_train, y_train)
    rf = grid.best_estimator_
    y_pred = rf.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    metrics_a = {
        "model": "L1 Random Forest",
        "optimization": "GridSearchCV",
        "best_params": grid.best_params_,
        "cv_f1_weighted": round(float(grid.best_score_), 4),
        "accuracy": round(acc, 4),
        "accuracy_pct": round(acc * 100, 2),
        "f1_weighted": round(f1_score(y_test, y_pred, average="weighted"), 4),
        "f1_macro": round(f1_score(y_test, y_pred, average="macro"), 4),
        "precision_weighted": round(precision_score(y_test, y_pred, average="weighted"), 4),
        "recall_weighted": round(recall_score(y_test, y_pred, average="weighted"), 4),
        "nfr3_target": 0.85,
        "nfr3_pass": bool(acc >= 0.85),
    }
    with open(ART / "metrics_a.json", "w") as f:
        json.dump(metrics_a, f, indent=2)
    with open(ART / "metrics_a_report.txt", "w") as f:
        f.write(classification_report(y_test, y_pred))

    joblib.dump(rf, ART / "rf_suitability.pkl")

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    axes[0].bar(
        ["Weighted F1", "Macro F1", "Accuracy"],
        [metrics_a["f1_weighted"], metrics_a["f1_macro"], metrics_a["accuracy"]],
        color=["#059669", "#34d399", "#6ee7b7"],
    )
    axes[0].axhline(0.85, color="red", linestyle="--", label="NFR3")
    axes[0].set_ylim(0, 1.05)
    axes[0].set_title("L1 RF — F1 & accuracy")
    axes[0].legend()
    cm = confusion_matrix(y_test, y_pred, labels=rf.classes_)
    sns.heatmap(cm, ax=axes[1], cmap="Greens", xticklabels=rf.classes_, yticklabels=rf.classes_)
    axes[1].set_title(f"Confusion matrix — {metrics_a['accuracy_pct']}%")
    plt.tight_layout()
    plt.savefig(FIG / "panel_a_rf_confusion.png", dpi=150)
    plt.close()

    print("Saved:", ART / "rf_suitability.pkl", FIG / "panel_a_rf_confusion.png")
    print(json.dumps(metrics_a, indent=2))


if __name__ == "__main__":
    main()
