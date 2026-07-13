"""Free demand signals — no paid API keys.

1. Google Trends (UK) via public Trends endpoints (warm cookie + explore)
2. Wikipedia pageviews (Wikimedia REST) as secondary / fallback

Both are free public sources. Results are cached ~12h to avoid rate limits.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from datetime import date, timedelta
from http.cookiejar import CookieJar
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen

from cachetools import TTLCache

logger = logging.getLogger(__name__)

_cache: TTLCache = TTLCache(maxsize=64, ttl=12 * 3600)
_lock = threading.Lock()

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
WIKI_UA = "FarmSenseAI/1.0 (Northumbria UG project; mailto:blsthathsara@gmail.com)"

CROP_QUERIES: dict[str, tuple[str, str]] = {
    "Tomato": ("tomato", "Tomato"),
    "Potato": ("potato", "Potato"),
    "Onion": ("onion", "Onion"),
    "Cabbage": ("cabbage", "Cabbage"),
    "Carrot": ("carrot", "Carrot"),
    "Beans": ("green beans", "Green_bean"),
    "Chili": ("chilli pepper", "Chili_pepper"),
    "Maize": ("maize", "Maize"),
    "Rice": ("rice", "Rice"),
}


def _strip_xhr(raw: str) -> dict:
    text = (raw or "").strip()
    # Google Trends XHR responses are prefixed with )]}'  (sometimes )]}',\n)
    if text.startswith(")]}'"):
        text = text[4:].lstrip("\r\n ,")
    return json.loads(text)


def _label_from_change(pct: float) -> str:
    if pct >= 15:
        return "Surging"
    if pct >= 5:
        return "Rising"
    if pct <= -15:
        return "Dropping"
    if pct <= -5:
        return "Cooling"
    return "Steady"


def _read(url: str, headers: dict[str, str], opener=None, timeout: float = 20.0) -> str:
    req = Request(url, headers=headers)
    if opener is not None:
        with opener.open(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    with urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _fetch_google_trends_uk(keyword: str) -> dict[str, Any] | None:
    """Interest over last ~3 months in GB. Returns None on rate-limit / parse errors."""
    explore_referer = f"https://trends.google.com/trends/explore?geo=GB&q={quote(keyword)}"
    headers = {
        "User-Agent": UA,
        "Accept-Language": "en-GB,en;q=0.9",
        "Accept": "application/json, text/plain, */*",
        "Referer": explore_referer,
    }
    try:
        jar = CookieJar()
        opener = build_opener(HTTPCookieProcessor(jar))
        # Warm session — required to avoid empty/429 responses
        _read("https://trends.google.com/trends/?geo=GB", headers, opener=opener)
        time.sleep(1.0)
        explore_req = {
            "comparisonItem": [{"keyword": keyword, "geo": "GB", "time": "today 3-m"}],
            "category": 0,
            "property": "",
        }
        explore_url = (
            "https://trends.google.com/trends/api/explore"
            f"?hl=en-GB&tz=0&req={quote(json.dumps(explore_req))}"
        )
        explore_raw = _read(explore_url, headers, opener=opener)
        widgets = _strip_xhr(explore_raw).get("widgets") or []
        multi = next((w for w in widgets if w.get("id") == "TIMESERIES"), None)
        if not multi:
            return None
        time.sleep(0.7)
        qs = (
            f"hl=en-GB&tz=0&req={quote(json.dumps(multi['request']))}"
            f"&token={quote(multi['token'])}"
        )
        multi_raw = _read(
            f"https://trends.google.com/trends/api/widgetdata/multiline?{qs}",
            headers,
            opener=opener,
        )
        timeline = (_strip_xhr(multi_raw).get("default") or {}).get("timelineData") or []
        vals: list[int] = []
        for point in timeline:
            has = point.get("hasData")
            if has is not None and not (has[0] if isinstance(has, list) else has):
                continue
            v = point.get("value") or [None]
            if v[0] is None:
                continue
            vals.append(int(v[0]))
        if len(vals) < 7:
            return None
        recent = sum(vals[-7:]) / 7
        prior = (
            sum(vals[-14:-7]) / 7
            if len(vals) >= 14
            else sum(vals[:-7]) / max(1, len(vals) - 7)
        )
        change = ((recent - prior) / prior * 100) if prior else 0.0
        avg = sum(vals) / len(vals)
        return {
            "label": _label_from_change(change),
            "score": round(recent, 1),
            "avgScore": round(avg, 1),
            "changePct": round(change, 1),
            "detail": (
                f"UK Google search interest for “{keyword}” "
                f"(last week vs prior: {change:+.0f}%; 0–100 Trends scale)."
            ),
            "source": "Google Trends (GB, free)",
        }
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.warning("Google Trends failed for %s: %s", keyword, exc)
        return None


def _fetch_wikipedia_interest(article: str) -> dict[str, Any] | None:
    """Daily pageviews on English Wikipedia — free Wikimedia REST API."""
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=60)
    title = quote(article, safe="")
    url = (
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
        f"en.wikipedia/all-access/user/{title}/daily/"
        f"{start.strftime('%Y%m%d')}/{end.strftime('%Y%m%d')}"
    )
    try:
        raw = _read(url, {"User-Agent": WIKI_UA}, timeout=15.0)
        items = json.loads(raw).get("items") or []
        views = [int(i["views"]) for i in items if "views" in i]
        if len(views) < 14:
            return None
        recent = sum(views[-7:]) / 7
        prior = sum(views[-14:-7]) / 7
        change = ((recent - prior) / prior * 100) if prior else 0.0
        return {
            "label": _label_from_change(change),
            "avgDailyViews": round(recent),
            "changePct": round(change, 1),
            "detail": (
                f"English Wikipedia interest in “{article.replace('_', ' ')}” "
                f"({change:+.0f}% week-on-week; ~{round(recent):,} views/day)."
            ),
            "source": "Wikimedia pageviews (free)",
        }
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.warning("Wikipedia pageviews failed for %s: %s", article, exc)
        return None


def get_crop_queries(crop_name: str) -> tuple[str, str]:
    name = (crop_name or "").strip()
    key = next((k for k in CROP_QUERIES if k.lower() == name.lower()), None)
    if key:
        return CROP_QUERIES[key]
    return name.lower() or "vegetable", name.replace(" ", "_") or "Vegetable"


def get_public_demand(crop_name: str) -> dict[str, Any]:
    """Return Google Trends (preferred) and Wikipedia signals for a crop."""
    keyword, article = get_crop_queries(crop_name)
    cache_key = f"demand:{keyword}:{article}"
    with _lock:
        hit = _cache.get(cache_key)
        if hit is not None:
            return hit

    trends = _fetch_google_trends_uk(keyword)
    wiki = _fetch_wikipedia_interest(article)

    if trends:
        primary = {
            "googleTrends": trends["label"],
            "googleTrendsLabel": "UK search interest",
            "googleTrendsDetail": trends["detail"],
            "googleTrendsSource": trends["source"],
            "googleTrendsChangePct": trends["changePct"],
        }
    elif wiki:
        primary = {
            "googleTrends": wiki["label"],
            "googleTrendsLabel": "Web interest",
            "googleTrendsDetail": wiki["detail"] + " (Google Trends temporarily unavailable.)",
            "googleTrendsSource": wiki["source"],
            "googleTrendsChangePct": wiki["changePct"],
        }
    else:
        primary = {
            "googleTrends": None,
            "googleTrendsLabel": "UK search interest",
            "googleTrendsDetail": "Live Trends unavailable right now — try again later.",
            "googleTrendsSource": None,
            "googleTrendsChangePct": None,
        }

    payload = {
        **primary,
        "wikipedia": wiki,
        "trends": trends,
    }
    with _lock:
        _cache[cache_key] = payload
    return payload
