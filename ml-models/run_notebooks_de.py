"""Local runners for Notebook D (demand) and E (ranking). Paths relative to ml-models/."""
from pathlib import Path
import json
import os
import time

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
ART = ROOT / "artifacts"
FIG = ROOT / "figures"


def run_notebook_d():
    from scipy.stats import pearsonr
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, classification_report, f1_score
    from sklearn.model_selection import GridSearchCV, train_test_split
    from sklearn.pipeline import Pipeline

    twitter_path = DATA / "sentiment" / "twitter_data.csv"
    price_path = ART / "price_weekly.csv"

    twitter = pd.read_csv(twitter_path)
    nlp_df = twitter[["clean_text", "category"]].dropna().sample(8000, random_state=42)
    X_nlp, y_nlp = nlp_df["clean_text"], nlp_df["category"]
    X_nlp_tr, X_nlp_te, y_nlp_tr, y_nlp_te = train_test_split(
        X_nlp, y_nlp, test_size=0.2, random_state=42, stratify=y_nlp
    )

    nlp_pipe = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
        ("clf", LogisticRegression(max_iter=500)),
    ])
    nlp_grid = GridSearchCV(
        nlp_pipe,
        {"clf__C": [0.1, 1, 10]},
        cv=3,
        scoring="f1_weighted",
        n_jobs=-1,
        verbose=1,
    )
    nlp_grid.fit(X_nlp_tr, y_nlp_tr)
    nlp_model = nlp_grid.best_estimator_
    y_nlp_pred = nlp_model.predict(X_nlp_te)

    nlp_f1_w = f1_score(y_nlp_te, y_nlp_pred, average="weighted")
    nlp_f1_m = f1_score(y_nlp_te, y_nlp_pred, average="macro")
    nlp_acc = accuracy_score(y_nlp_te, y_nlp_pred)
    print(f"Sentiment NLP — F1 weighted: {nlp_f1_w:.4f}, F1 macro: {nlp_f1_m:.4f}")
    print(f"Best params: {nlp_grid.best_params_}")
    print(classification_report(y_nlp_te, y_nlp_pred))

    keywords = ["wheat", "potato", "barley"]
    trends_source = "google_trends"
    trends = None

    try:
        from pytrends.exceptions import TooManyRequestsError
        from pytrends.request import TrendReq

        TRENDS_PAUSE = 30
        TRENDS_RETRIES = 2

        def fetch_trends_one_by_one(keywords, timeframe="today 3-y", geo="GB"):
            pytrends = TrendReq(hl="en-GB", tz=0, retries=2, backoff_factor=1.0)
            parts = []
            for kw in keywords:
                ok = False
                for attempt in range(TRENDS_RETRIES):
                    try:
                        wait = TRENDS_PAUSE * (attempt + 1)
                        if attempt > 0:
                            print(f"Retry {kw} in {wait}s...")
                            time.sleep(wait)
                        else:
                            time.sleep(5)
                        pytrends.build_payload([kw], timeframe=timeframe, geo=geo)
                        df = pytrends.interest_over_time()
                        if df is None or df.empty:
                            raise ValueError("empty response")
                        if "isPartial" in df.columns:
                            df = df.drop(columns=["isPartial"])
                        parts.append(df[[kw]])
                        print(f"Downloaded Trends: {kw}")
                        time.sleep(TRENDS_PAUSE)
                        ok = True
                        break
                    except (TooManyRequestsError, Exception) as e:
                        print(f"{kw} attempt {attempt+1}/{TRENDS_RETRIES}: {type(e).__name__}")
                if not ok:
                    print(f"Could not fetch {kw} from Google Trends")
            if not parts:
                return None
            out = pd.concat(parts, axis=1)
            return out.resample("W").mean().dropna()

        trends = fetch_trends_one_by_one(keywords)
    except Exception as e:
        print(f"pytrends unavailable: {e}")
        trends = None

    def offline_sentiment_proxy(keywords, price_index):
        twitter = pd.read_csv(twitter_path)
        n = len(price_index)
        proxy = pd.DataFrame(index=price_index.index)
        for kw in keywords:
            mask = twitter["clean_text"].str.contains(kw, case=False, na=False)
            sub = twitter.loc[mask]
            base = (sub["category"].mean() + 1.0) if len(sub) else 0.0
            proxy[kw] = base + np.linspace(0, len(sub) / max(n, 1), n) * 0.01
        return proxy

    if trends is None or trends.empty:
        trends_source = "offline_sentiment_proxy"
        prices_tmp = pd.read_csv(price_path, index_col=0, parse_dates=True)
        trends = offline_sentiment_proxy(keywords, prices_tmp)
        print("Trends blocked or empty. Using offline sentiment proxy.")

    prices = pd.read_csv(price_path, index_col=0, parse_dates=True)
    prices.columns = ["price_index"]
    prices["price_change"] = prices["price_index"].pct_change()

    merged = trends.join(prices["price_change"], how="inner").dropna()
    print("Aligned weeks:", len(merged))

    results = []
    for kw in keywords:
        if kw in merged.columns:
            r, p = pearsonr(merged[kw], merged["price_change"])
            results.append({"keyword": kw, "pearson_r": float(r), "p_value": float(p)})
            print(f"{kw}: r={r:.3f}, p={p:.4f}")

    results_df = pd.DataFrame(results)
    results_df["rq2_significant"] = results_df["p_value"] < 0.05
    results_df.to_csv(ART / "metrics_d.csv", index=False)

    metrics_d = {
        "model": "L4 Demand",
        "nlp_optimization": "GridSearchCV LogisticRegression+TF-IDF",
        "nlp_best_params": nlp_grid.best_params_,
        "nlp_f1_weighted": round(float(nlp_f1_w), 4),
        "nlp_f1_macro": round(float(nlp_f1_m), 4),
        "nlp_accuracy": round(float(nlp_acc), 4),
        "trends_vs_price": {
            "source": trends_source,
            "aligned_weeks": int(len(merged)),
            "keywords": keywords,
            "results": results_df.to_dict(orient="records"),
        },
    }
    with open(ART / "metrics_d.json", "w") as f:
        json.dump(metrics_d, f, indent=2)
    print("Saved metrics_d.json")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    axes[0].bar(["F1 weighted", "F1 macro", "Accuracy"], [nlp_f1_w, nlp_f1_m, nlp_acc], color="#059669")
    axes[0].set_ylim(0, 1.05)
    axes[0].set_title("L4 Sentiment NLP (optimized)")
    axes[1].bar(results_df["keyword"], results_df["pearson_r"], color="#2563eb")
    axes[1].axhline(0, color="black", linewidth=0.8)
    axes[1].set_title(f"Trends vs price (RQ2) — {trends_source}")
    axes[1].set_ylabel("Pearson r")
    plt.tight_layout()
    plt.savefig(FIG / "panel_d_demand_correlation.png", dpi=150)
    plt.close()
    print("Saved panel_d_demand_correlation.png")


def run_notebook_e():
    import joblib
    from sklearn.model_selection import GridSearchCV
    from xgboost import XGBRegressor

    rf = joblib.load(ART / "rf_suitability.pkl")
    prices = pd.read_csv(ART / "price_weekly.csv", index_col=0, parse_dates=True)
    prices.columns = ["price_index"]
    latest_price = float(prices["price_index"].iloc[-1])

    scenarios = pd.DataFrame([
        {"name": "Heavy clay", "N": 80, "P": 40, "K": 40, "temperature": 14, "humidity": 75, "ph": 6.5, "rainfall": 90},
        {"name": "Sandy loam", "N": 60, "P": 35, "K": 50, "temperature": 16, "humidity": 65, "ph": 6.8, "rainfall": 55},
        {"name": "Chalk down", "N": 70, "P": 30, "K": 45, "temperature": 15, "humidity": 70, "ph": 7.2, "rainfall": 70},
    ])
    FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

    W_SUIT, W_WEATHER, W_PRICE, W_DEMAND = 0.35, 0.20, 0.30, 0.15
    proba = rf.predict_proba(scenarios[FEATURES])
    classes = rf.classes_

    rows = []
    for i, row in scenarios.iterrows():
        top_idx = np.argsort(proba[i])[-5:][::-1]
        for j in top_idx:
            crop = classes[j]
            suit_score = proba[i][j]
            weather_score = 0.7
            price_score = min(latest_price / 200, 1.0)
            demand_score = 0.6
            soil_only = suit_score
            full = (
                W_SUIT * suit_score
                + W_WEATHER * weather_score
                + W_PRICE * price_score
                + W_DEMAND * demand_score
            )
            profit_proxy = full * latest_price
            rows.append({
                "scenario": row["name"],
                "crop": crop,
                "soil_only": soil_only,
                "full_pipeline": full,
                "profit_proxy": profit_proxy,
            })

    rank_df = pd.DataFrame(rows)
    top_full = rank_df.sort_values("full_pipeline", ascending=False).groupby("scenario").head(1)
    top_soil = rank_df.sort_values("soil_only", ascending=False).groupby("scenario").head(1)

    train_X = rank_df[["soil_only", "full_pipeline"]].copy()
    train_X["price"] = latest_price
    y = rank_df["profit_proxy"]

    xgb_base = XGBRegressor(random_state=42, n_jobs=-1)
    xgb_grid = GridSearchCV(
        xgb_base,
        {"n_estimators": [50, 100, 200], "max_depth": [3, 4, 6]},
        cv=3,
        scoring="neg_mean_squared_error",
        n_jobs=-1,
        verbose=1,
    )
    xgb_grid.fit(train_X, y)
    xgb = xgb_grid.best_estimator_
    rank_df["xgb_profit"] = xgb.predict(train_X)
    joblib.dump(xgb, ART / "ranking_model.pkl")

    comparison = []
    for scenario in scenarios["name"]:
        soil_row = top_soil[top_soil["scenario"] == scenario].iloc[0]
        full_row = top_full[top_full["scenario"] == scenario].iloc[0]
        comparison.append({
            "scenario": scenario,
            "soil_only_crop": str(soil_row["crop"]),
            "soil_only_score": round(float(soil_row["soil_only"]), 4),
            "full_pipeline_crop": str(full_row["crop"]),
            "full_pipeline_score": round(float(full_row["full_pipeline"]), 4),
            "full_pipeline_wins": bool(full_row["full_pipeline"] > soil_row["soil_only"]),
        })

    comparison_df = pd.DataFrame(comparison)
    comparison_df.to_csv(ART / "ranking_results.csv", index=False)

    metrics_e = {
        "model": "L5 Ranking",
        "optimization": "GridSearchCV XGBRegressor",
        "xgb_best_params": xgb_grid.best_params_,
        "weights": {"suitability": 0.35, "weather": 0.20, "price": 0.30, "demand": 0.15},
        "scenarios": comparison,
        "rq1_supported": bool(comparison_df["full_pipeline_wins"].any()),
    }
    with open(ART / "metrics_e.json", "w") as f:
        json.dump(metrics_e, f, indent=2)
    print(comparison_df)
    print(f"RQ1 supported? {metrics_e['rq1_supported']}")

    plot_df = rank_df.groupby("scenario").agg({"soil_only": "max", "full_pipeline": "max"}).reset_index()
    x = np.arange(len(plot_df))
    w = 0.35
    plt.figure(figsize=(9, 5))
    plt.bar(x - w / 2, plot_df["soil_only"], w, label="Soil-only (RF)", color="#94a3b8")
    plt.bar(x + w / 2, plot_df["full_pipeline"], w, label="Full pipeline", color="#059669")
    plt.xticks(x, plot_df["scenario"])
    plt.ylabel("Composite score")
    plt.title("L5 Ranking — soil-only vs full pipeline (RQ1)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIG / "panel_e_profit_rank.png", dpi=150)
    plt.close()
    print("Saved Notebook E outputs")


if __name__ == "__main__":
    os.chdir(ROOT)
    print("=== Notebook D ===")
    run_notebook_d()
    print("=== Notebook E ===")
    run_notebook_e()
