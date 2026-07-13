from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import desc, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import IdempotencyGuard, get_current_user, idempotency_key_header, require_admin
from app.core.exceptions import (
    AppError,
    ServiceUnavailableError,
    app_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.core.middleware import cache_key, get_cached_response, install_middleware, set_cached_response
from app.db.models import SoilReading, UserAccount
from app.db.session import SessionLocal, get_db
from app.ml_service import ModelNotFoundError, district_oversupply_warning, predict_suitability, rank_by_profit
from app.schemas import (
    AdminFarmerStatusRequest,
    AdminModelTestRequest,
    ConfirmPlanRequest,
    CropScore,
    ForgotPasswordRequest,
    LoginRequest,
    OversupplyInput,
    RegisterRequest,
    ResetPasswordRequest,
    SoilInput,
    SoilSubmitRequest,
)
from app.services.admin_service import (
    admin_analytics,
    admin_overview,
    delete_farmer,
    get_farmer,
    list_farmers,
    set_farmer_active,
)
from app.services.model_lab_service import DEFAULT_PAYLOADS, model_lab_status, run_model_lab
from app.services.auth_service import login_user, register_user, user_to_json
from app.services.password_reset_service import request_password_reset, reset_password
from app.services.profile_service import get_user_profile
from app.services.recommendation_service import (
    community_payload,
    dashboard_payload,
    delete_recommendation_plans,
    finalize_recommendation_run,
    generate_recommendation_run,
    get_market_payload,
    latest_recommendations,
    list_active_crops,
)
from app.services.seed_service import ensure_farm_has_demo_aggregates, seed_reference_data
from app.services.soil_service import create_soil_reading, get_primary_farm

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)
idempotency = IdempotencyGuard(settings.idempotency_ttl_hours)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        seed_reference_data(db)
    except Exception:
        pass
    finally:
        db.close()

    try:
        from app.ml.loader import load_model

        load_model()
    except Exception:
        pass

    # Warm heavy L2/L3 LSTM models so first Plan submit is not cold-start slow
    if settings.ml_heavy:
        try:
            from app.ml.lstm_inference import warm_lstm_models

            warm_lstm_models()
        except Exception:
            pass

    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Response-Time-Ms", "Idempotency-Replayed"],
    )
    install_middleware(app)
    app.add_middleware(SlowAPIMiddleware)

    app.include_router(build_router())
    return app


def build_router() -> APIRouter:
    router = APIRouter()

    @router.get("/health")
    @limiter.limit(settings.rate_limit_default)
    def health(request: Request):
        return {"status": "healthy"}

    @router.get("/health/ready")
    @limiter.limit(settings.rate_limit_default)
    def health_ready(request: Request, db: Annotated[Session, Depends(get_db)]):
        db_ok = False
        ml_ok = False
        layers = {"l1_soil": False, "l2_weather": False, "l3_price": False, "heavy": settings.ml_heavy}
        try:
            db.execute(text("SELECT 1"))
            db_ok = True
        except Exception:
            pass
        try:
            from app.ml.loader import get_model

            get_model()
            ml_ok = True
            layers["l1_soil"] = True
        except Exception:
            pass
        if settings.ml_heavy:
            try:
                from app.ml.lstm_inference import tensorflow_available, warm_lstm_models

                if tensorflow_available():
                    status = warm_lstm_models()
                    layers["l2_weather"] = bool(status.get("weather"))
                    layers["l3_price"] = bool(status.get("price"))
            except Exception:
                pass
        status = "ready" if db_ok and ml_ok else "degraded"
        code = 200 if db_ok else 503
        return ORJSONResponse(
            status_code=code,
            content={
                "status": status,
                "database": db_ok,
                "ml_model": ml_ok,
                "layers": layers,
            },
        )

    @router.post("/auth/register")
    @limiter.limit("30/minute")
    def auth_register(request: Request, payload: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
        user, farm, token = register_user(db, payload.model_dump())
        return {"user": user_to_json(user, farm), "token": token}

    @router.post("/auth/login")
    @limiter.limit("60/minute")
    def auth_login(request: Request, payload: LoginRequest, db: Annotated[Session, Depends(get_db)]):
        user, farm, token = login_user(db, payload.email, payload.password)
        return {"user": user_to_json(user, farm), "token": token}

    @router.post("/auth/forgot-password")
    @limiter.limit("10/minute")
    def auth_forgot_password(
        request: Request,
        payload: ForgotPasswordRequest,
        db: Annotated[Session, Depends(get_db)],
    ):
        return request_password_reset(db, payload.email)

    @router.post("/auth/reset-password")
    @limiter.limit("20/minute")
    def auth_reset_password(
        request: Request,
        payload: ResetPasswordRequest,
        db: Annotated[Session, Depends(get_db)],
    ):
        return reset_password(db, payload.token, payload.password)

    @router.get("/auth/me")
    @limiter.limit(settings.rate_limit_default)
    def auth_me(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        user: Annotated[UserAccount, Depends(get_current_user)],
    ):
        return get_user_profile(db, user)

    @router.post("/soil")
    @limiter.limit("30/minute")
    def submit_soil(
        request: Request,
        payload: SoilSubmitRequest,
        db: Annotated[Session, Depends(get_db)],
        user: Annotated[UserAccount, Depends(get_current_user)],
        idem_key: Annotated[str | None, Depends(idempotency_key_header)],
    ):
        farm = get_primary_farm(db, user)
        body = payload.model_dump()

        def handler():
            reading = create_soil_reading(db, farm, body)
            recs = generate_recommendation_run(db, farm, reading)
            return 201, {
                "soilReadingId": str(reading.id),
                "recommendations": recs,
            }

        status, data, replayed = idempotency.check_or_store(
            db,
            key=idem_key,
            user_id=user.id,
            method="POST",
            path="/soil",
            body=body,
            handler=handler,
        )
        response = ORJSONResponse(status_code=status, content=data)
        if replayed:
            response.headers["Idempotency-Replayed"] = "true"
        return response

    @router.get("/recommendations")
    @limiter.limit(settings.rate_limit_default)
    def get_recommendations(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        user: Annotated[UserAccount, Depends(get_current_user)],
    ):
        farm = get_primary_farm(db, user)
        recs = latest_recommendations(db, farm)
        if not recs:
            return {"recommendations": [], "topRecommendation": None, "runDate": None, "planStatus": None}
        return recs

    @router.post("/recommendations/confirm")
    @limiter.limit("30/minute")
    def confirm_recommendations(
        request: Request,
        payload: ConfirmPlanRequest,
        db: Annotated[Session, Depends(get_db)],
        user: Annotated[UserAccount, Depends(get_current_user)],
    ):
        farm = get_primary_farm(db, user)
        try:
            return finalize_recommendation_run(db, farm, payload.cropIds)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.delete("/recommendations/plan")
    @limiter.limit("20/minute")
    def delete_plan(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        user: Annotated[UserAccount, Depends(get_current_user)],
    ):
        """Permanently delete the farm's crop recommendation plan(s). Soil readings are kept."""
        from app.core.middleware import response_cache

        farm = get_primary_farm(db, user)
        result = delete_recommendation_plans(db, farm)
        key = cache_key("GET", "/dashboard", "", str(user.id))
        response_cache.pop(key, None)
        return result

    @router.get("/dashboard")
    @limiter.limit(settings.rate_limit_default)
    def get_dashboard(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        user: Annotated[UserAccount, Depends(get_current_user)],
    ):
        farm = get_primary_farm(db, user)
        ensure_farm_has_demo_aggregates(db, farm)
        recs = latest_recommendations(db, farm)
        reading = db.scalar(
            select(SoilReading)
            .where(SoilReading.farm_profile_id == farm.id)
            .order_by(desc(SoilReading.recorded_at))
            .limit(1)
        )
        key = cache_key("GET", "/dashboard", "", str(user.id))
        cached = get_cached_response(key)
        if cached:
            return cached
        payload = dashboard_payload(db, user, farm, recs, reading)
        set_cached_response(key, payload)
        return payload

    @router.get("/market/crops")
    @limiter.limit(settings.rate_limit_default)
    def market_crops(request: Request, db: Annotated[Session, Depends(get_db)]):
        key = cache_key("GET", "/market/crops", "", None)
        cached = get_cached_response(key)
        if cached:
            return cached
        crops = list_active_crops(db)
        set_cached_response(key, crops)
        return crops

    @router.get("/market")
    @limiter.limit(settings.rate_limit_default)
    def market_data(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        crop: Annotated[str, Query()] = "Tomato",
    ):
        key = cache_key("GET", "/market", f"crop={crop}", None)
        cached = get_cached_response(key)
        if cached:
            return cached
        payload = {"crop": crop, "data": get_market_payload(db, crop)}
        set_cached_response(key, payload)
        return payload

    @router.get("/community")
    @limiter.limit(settings.rate_limit_default)
    def community(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        user: Annotated[UserAccount, Depends(get_current_user)],
    ):
        farm = get_primary_farm(db, user)
        ensure_farm_has_demo_aggregates(db, farm)
        key = cache_key("GET", "/community", farm.district_code, str(user.id))
        cached = get_cached_response(key)
        if cached:
            return cached
        payload = community_payload(db, farm)
        set_cached_response(key, payload)
        return payload

    # —— Super admin (privacy-limited farmer oversight) ——
    @router.get("/admin/overview")
    @limiter.limit(settings.rate_limit_default)
    def admin_overview_endpoint(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        _admin: Annotated[UserAccount, Depends(require_admin)],
    ):
        return admin_overview(db)

    @router.get("/admin/analytics")
    @limiter.limit(settings.rate_limit_default)
    def admin_analytics_endpoint(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        _admin: Annotated[UserAccount, Depends(require_admin)],
    ):
        return admin_analytics(db)

    @router.get("/admin/farmers")
    @limiter.limit(settings.rate_limit_default)
    def admin_farmers_list(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
        _admin: Annotated[UserAccount, Depends(require_admin)],
        q: Annotated[str | None, Query()] = None,
        page: Annotated[int, Query(ge=1)] = 1,
        limit: Annotated[int, Query(ge=1, le=100)] = 20,
    ):
        return list_farmers(db, q=q, page=page, limit=limit)

    @router.get("/admin/farmers/{farmer_id}")
    @limiter.limit(settings.rate_limit_default)
    def admin_farmer_detail(
        request: Request,
        farmer_id: str,
        db: Annotated[Session, Depends(get_db)],
        _admin: Annotated[UserAccount, Depends(require_admin)],
    ):
        import uuid as uuid_mod

        try:
            uid = uuid_mod.UUID(farmer_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid farmer id") from exc
        return get_farmer(db, uid)

    @router.patch("/admin/farmers/{farmer_id}")
    @limiter.limit("30/minute")
    def admin_farmer_status(
        request: Request,
        farmer_id: str,
        payload: AdminFarmerStatusRequest,
        db: Annotated[Session, Depends(get_db)],
        _admin: Annotated[UserAccount, Depends(require_admin)],
    ):
        import uuid as uuid_mod

        try:
            uid = uuid_mod.UUID(farmer_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid farmer id") from exc
        return set_farmer_active(db, uid, payload.isActive)

    @router.delete("/admin/farmers/{farmer_id}")
    @limiter.limit("20/minute")
    def admin_farmer_delete(
        request: Request,
        farmer_id: str,
        db: Annotated[Session, Depends(get_db)],
        _admin: Annotated[UserAccount, Depends(require_admin)],
    ):
        import uuid as uuid_mod

        try:
            uid = uuid_mod.UUID(farmer_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid farmer id") from exc
        return delete_farmer(db, uid)

    @router.get("/admin/models/status")
    @limiter.limit(settings.rate_limit_default)
    def admin_models_status(
        request: Request,
        _admin: Annotated[UserAccount, Depends(require_admin)],
    ):
        """Artefact readiness for the model lab playground."""
        status = model_lab_status()
        status["defaults"] = DEFAULT_PAYLOADS
        return status

    @router.post("/admin/models/test")
    @limiter.limit("30/minute")
    def admin_models_test(
        request: Request,
        body: AdminModelTestRequest,
        _admin: Annotated[UserAccount, Depends(require_admin)],
    ):
        """Run one ML / demand layer with custom JSON — admin playground."""
        return run_model_lab(body.layer, body.payload)

    # Legacy ML endpoints (dissertation Table 7.1 / pytest TC01–TC06)
    @router.post("/predict/suitability")
    @limiter.limit("60/minute")
    def predict_suitability_endpoint(request: Request, soil: SoilInput):
        try:
            return predict_suitability(soil.model_dump())
        except ModelNotFoundError as exc:
            raise ServiceUnavailableError(str(exc)) from exc

    @router.post("/recommend/rank")
    @limiter.limit("60/minute")
    def rank_crops(request: Request, crops: list[CropScore]):
        return {"ranked": rank_by_profit([c.model_dump() for c in crops])}

    @router.post("/oversupply/check")
    @limiter.limit("60/minute")
    def oversupply_check(request: Request, payload: OversupplyInput):
        return {
            "warning": district_oversupply_warning(payload.district_count, payload.limit),
            "district_count": payload.district_count,
            "limit": payload.limit,
        }

    return router


app = create_app()
