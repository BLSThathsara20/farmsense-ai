import hashlib
import json
import time
import uuid
from collections.abc import Callable
from typing import Any

from cachetools import TTLCache
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.core.config import get_settings

# Process-local TTL cache for hot GET endpoints (upgrade to Redis in production).
response_cache: TTLCache = TTLCache(maxsize=512, ttl=get_settings().cache_ttl_seconds)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request.state.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


def cache_key(method: str, path: str, query: str, user_id: str | None) -> str:
    raw = f"{method}:{path}:{query}:{user_id or 'anon'}"
    return hashlib.sha256(raw.encode()).hexdigest()


def get_cached_response(key: str) -> dict[str, Any] | None:
    return response_cache.get(key)


def set_cached_response(key: str, payload: dict[str, Any]) -> None:
    response_cache[key] = payload


def stable_request_hash(body: dict[str, Any] | None) -> str:
    encoded = json.dumps(body or {}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def install_middleware(app) -> None:
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(RequestContextMiddleware)
