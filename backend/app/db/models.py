import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    farmer = "farmer"
    admin = "admin"


class RecommendationStatus(str, enum.Enum):
    completed = "completed"
    partial = "partial"
    failed = "failed"


class OversupplyLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class SoilSource(str, enum.Enum):
    manual = "manual"
    sensor = "sensor"


class UserAccount(Base):
    __tablename__ = "user_account"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), default=UserRole.farmer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    farm_profiles: Mapped[list["FarmProfile"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class FarmProfile(Base):
    __tablename__ = "farm_profile"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user_account.id", ondelete="CASCADE"))
    farm_name: Mapped[str | None] = mapped_column(String(120))
    district_code: Mapped[str] = mapped_column(String(32), nullable=False)
    district_name: Mapped[str] = mapped_column(String(120), nullable=False)
    region_label: Mapped[str | None] = mapped_column(String(160))
    country_code: Mapped[str] = mapped_column(String(2), default="GB")
    area_hectares: Mapped[float | None] = mapped_column(Numeric(8, 2))
    water_source: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped[UserAccount] = relationship(back_populates="farm_profiles")
    soil_readings: Mapped[list["SoilReading"]] = relationship(back_populates="farm_profile", cascade="all, delete-orphan")
    recommendation_runs: Mapped[list["RecommendationRun"]] = relationship(
        back_populates="farm_profile", cascade="all, delete-orphan"
    )


class CropReference(Base):
    __tablename__ = "crop_reference"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    l1_label: Mapped[str | None] = mapped_column(String(64))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SoilReading(Base):
    __tablename__ = "soil_reading"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farm_profile.id", ondelete="CASCADE"))
    nitrogen: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    phosphorus: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    potassium: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    ph: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    temperature: Mapped[float | None] = mapped_column(Numeric(5, 2))
    humidity: Mapped[float | None] = mapped_column(Numeric(5, 2))
    rainfall: Mapped[float | None] = mapped_column(Numeric(8, 2))
    texture: Mapped[str | None] = mapped_column(String(40))
    crop_preferences: Mapped[dict] = mapped_column(JSONB, default=list)
    source: Mapped[SoilSource] = mapped_column(
        Enum(SoilSource, name="soil_source"), default=SoilSource.manual
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm_profile: Mapped[FarmProfile] = relationship(back_populates="soil_readings")


class RecommendationRun(Base):
    __tablename__ = "recommendation_run"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farm_profile.id", ondelete="CASCADE"))
    soil_reading_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("soil_reading.id", ondelete="SET NULL"))
    model_bundle_version: Mapped[str] = mapped_column(String(40), default="v1")
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus, name="recommendation_status"), default=RecommendationStatus.completed
    )
    ranked_output: Mapped[dict] = mapped_column(JSONB, nullable=False)
    top_crop: Mapped[str | None] = mapped_column(String(80))
    top_profit_estimate: Mapped[float | None] = mapped_column(Numeric(12, 2))
    explainability: Mapped[dict | None] = mapped_column(JSONB)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm_profile: Mapped[FarmProfile] = relationship(back_populates="recommendation_runs")


class MarketSnapshot(Base):
    __tablename__ = "market_snapshot"
    __table_args__ = (UniqueConstraint("crop_id", "source", "week_start", name="uq_market_crop_week"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    crop_id: Mapped[int] = mapped_column(Integer, ForeignKey("crop_reference.id", ondelete="CASCADE"))
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    week_start: Mapped[datetime] = mapped_column(Date)
    price_gbp_per_tonne: Mapped[float | None] = mapped_column(Numeric(12, 2))
    trend_pct: Mapped[float | None] = mapped_column(Numeric(6, 2))
    forecast_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    demand_google_score: Mapped[float | None] = mapped_column(Numeric(8, 4))
    demand_sentiment: Mapped[str | None] = mapped_column(String(40))
    raw_json: Mapped[dict | None] = mapped_column(JSONB)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DistrictCropAggregate(Base):
    __tablename__ = "district_crop_aggregate"
    __table_args__ = (
        UniqueConstraint("district_code", "crop_id", "season_year", "week_number", name="uq_district_crop_week"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    district_code: Mapped[str] = mapped_column(String(32), nullable=False)
    crop_id: Mapped[int] = mapped_column(Integer, ForeignKey("crop_reference.id"))
    season_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    week_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    plan_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OversupplyAlert(Base):
    __tablename__ = "oversupply_alert"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    district_code: Mapped[str] = mapped_column(String(32), nullable=False)
    crop_id: Mapped[int] = mapped_column(Integer, ForeignKey("crop_reference.id"))
    threshold_count: Mapped[int] = mapped_column(Integer, nullable=False)
    current_count: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[OversupplyLevel] = mapped_column(Enum(OversupplyLevel, name="oversupply_level"))
    warning_message: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_record"

    idempotency_key: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("user_account.id", ondelete="CASCADE"))
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    response_status: Mapped[int] = mapped_column(Integer, nullable=False)
    response_body: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_token"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
