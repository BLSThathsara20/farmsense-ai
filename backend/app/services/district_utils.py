"""Resolve a short UK (or general) district label from a free-text farm location."""

from __future__ import annotations

import re
from functools import lru_cache

import httpx

_COUNTRY_TAIL = re.compile(
    r",?\s*(United Kingdom|UK|England|Scotland|Wales|Northern Ireland|Great Britain)\s*$",
    re.IGNORECASE,
)
_MULTI_COUNTRY = re.compile(
    r",?\s*(United Kingdom|UK|England|Scotland|Wales|Northern Ireland)\s*",
    re.IGNORECASE,
)


def heuristic_district(raw: str | None) -> str:
    """Take a district-style name from a long address string without calling an API."""
    if not raw or not str(raw).strip():
        return "Unknown"
    text = str(raw).strip()
    # Drop trailing country parts repeatedly
    cleaned = text
    for _ in range(4):
        nxt = _COUNTRY_TAIL.sub("", cleaned).strip(" ,")
        if nxt == cleaned:
            break
        cleaned = nxt
    cleaned = _MULTI_COUNTRY.sub(", ", cleaned)
    parts = [p.strip() for p in cleaned.split(",") if p.strip()]
    if not parts:
        return text.split(",")[0].strip() or "Unknown"
    # Prefer the last remaining part (often the administrative area), else first
    if len(parts) == 1:
        return parts[0]
    # "Place, Greater London" → Greater London; "Greater London" alone already handled
    preferred = parts[-1]
    # Avoid tiny locality-only leftovers when a clearer area exists earlier
    if len(preferred) <= 2 and len(parts) > 1:
        return parts[0]
    return preferred


def _district_from_nominatim_address(address: dict) -> str | None:
    for key in (
        "city_district",
        "borough",
        "municipality",
        "county",
        "state_district",
        "city",
        "town",
        "village",
        "state",
    ):
        val = address.get(key)
        if val and str(val).strip():
            return str(val).strip()
    return None


@lru_cache(maxsize=256)
def _nominatim_district(query: str) -> str | None:
    """Look up a place string on OpenStreetMap Nominatim; return district if found."""
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": query,
                    "format": "json",
                    "addressdetails": 1,
                    "limit": 1,
                },
                headers={
                    "User-Agent": "FarmSenseAI-Admin/1.0 (university project)",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return None

    if not data:
        return None
    address = data[0].get("address") or {}
    return _district_from_nominatim_address(address)


def resolve_district(raw: str | None, *, use_api: bool = True) -> str:
    """
    Return a short district name for admin display/grouping.

    Tries Nominatim when the string looks like a full address; always falls back
    to a local heuristic so admin never blocks on the network.
    """
    if not raw or not str(raw).strip():
        return "Unknown"
    text = str(raw).strip()
    looks_long = "," in text or len(text) > 40 or bool(_MULTI_COUNTRY.search(text))

    if use_api and looks_long:
        found = _nominatim_district(text)
        if found:
            return found

    return heuristic_district(text)
