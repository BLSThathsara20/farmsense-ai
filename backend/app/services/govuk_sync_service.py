"""Refresh GOV.UK agricultural price indices from the official monthly CSV."""

from __future__ import annotations

import io
import logging
import time
from pathlib import Path

import httpx
import pandas as pd

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Official Defra monthly dataset (same schema as bundled artefact)
GOVUK_CSV_URL = (
    "https://assets.publishing.service.gov.uk/media/6a392d4b0bea238415c9a3ba/API_20260625.csv"
)

_last_refresh_attempt = 0.0
_REFRESH_COOLDOWN_SEC = 6 * 3600  # try at most every 6 hours per process


def _target_path() -> Path:
    return get_settings().resolved_ml_artifacts_dir / "govuk_price_indices.csv"


def _normalize_frame(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.copy()
    if "category" not in df.columns and "Category" in df.columns:
        df = df.rename(columns={"Category": "category", "Date": "date", "Index": "index", "Type": "type"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["index"] = pd.to_numeric(df["index"], errors="coerce")
    df = df.dropna(subset=["date", "index", "category"])
    if "type" not in df.columns:
        df["type"] = "output"
    return df.sort_values("date")


def _latest_month(df: pd.DataFrame) -> pd.Timestamp | None:
    if df.empty:
        return None
    return pd.Timestamp(df["date"].max()).replace(day=1)


def refresh_govuk_indices(*, force: bool = False) -> dict:
    """Download official CSV when newer than local copy. Returns status dict."""
    global _last_refresh_attempt

    now = time.time()
    if not force and now - _last_refresh_attempt < _REFRESH_COOLDOWN_SEC:
        return {"skipped": True, "reason": "cooldown"}
    _last_refresh_attempt = now

    path = _target_path()
    local_latest = None
    if path.exists():
        try:
            local_latest = _latest_month(_normalize_frame(pd.read_csv(path)))
        except Exception:
            local_latest = None

    try:
        with httpx.Client(timeout=45.0, follow_redirects=True) as client:
            res = client.get(GOVUK_CSV_URL)
            res.raise_for_status()
            remote = _normalize_frame(pd.read_csv(io.BytesIO(res.content)))
    except Exception as exc:
        logger.warning("GOV.UK price index refresh failed: %s", exc)
        return {"ok": False, "error": str(exc), "localLatest": str(local_latest) if local_latest else None}

    remote_latest = _latest_month(remote)
    if local_latest is not None and remote_latest is not None and remote_latest <= local_latest:
        return {
            "ok": True,
            "updated": False,
            "latest": remote_latest.strftime("%Y-%m-%d"),
            "message": "Local GOV.UK index already up to date.",
        }

    path.parent.mkdir(parents=True, exist_ok=True)
    remote.to_csv(path, index=False)

    # Drop cached pandas frame so market reads fresh file
    from app.services.market_data_service import _load_govuk_frame

    _load_govuk_frame.cache_clear()

    return {
        "ok": True,
        "updated": True,
        "latest": remote_latest.strftime("%Y-%m-%d") if remote_latest else None,
        "rows": len(remote),
    }


def maybe_refresh_govuk_indices() -> None:
    """Best-effort refresh before market reads (rate-limited)."""
    try:
        refresh_govuk_indices(force=False)
    except Exception:
        pass
