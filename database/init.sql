-- FarmSense AI — PostgreSQL schema v1
-- Matches database-design-plan.html and dissertation §5.2 (Figure 5.2)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('farmer', 'admin');
CREATE TYPE recommendation_status AS ENUM ('completed', 'partial', 'failed');
CREATE TYPE oversupply_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE soil_source AS ENUM ('manual', 'sensor');

CREATE TABLE user_account (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(120),
    role            user_role NOT NULL DEFAULT 'farmer',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE TABLE farm_profile (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    farm_name       VARCHAR(120),
    district_code   VARCHAR(32) NOT NULL,
    district_name   VARCHAR(120) NOT NULL,
    region_label    VARCHAR(160),
    country_code    CHAR(2) NOT NULL DEFAULT 'GB',
    area_hectares   NUMERIC(8, 2),
    water_source    VARCHAR(80),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE crop_reference (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(64) NOT NULL UNIQUE,
    display_name    VARCHAR(80) NOT NULL,
    l1_label        VARCHAR(64),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    min_ph          NUMERIC(4, 2),
    max_ph          NUMERIC(4, 2)
);

CREATE TABLE soil_reading (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_profile_id UUID NOT NULL REFERENCES farm_profile(id) ON DELETE CASCADE,
    nitrogen        NUMERIC(8, 2) NOT NULL,
    phosphorus      NUMERIC(8, 2) NOT NULL,
    potassium       NUMERIC(8, 2) NOT NULL,
    ph              NUMERIC(4, 2) NOT NULL CHECK (ph >= 0 AND ph <= 14),
    temperature     NUMERIC(5, 2),
    humidity        NUMERIC(5, 2) CHECK (humidity IS NULL OR (humidity >= 0 AND humidity <= 100)),
    rainfall        NUMERIC(8, 2) CHECK (rainfall IS NULL OR rainfall >= 0),
    texture         VARCHAR(40),
    crop_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    source          soil_source NOT NULL DEFAULT 'manual',
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recommendation_run (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_profile_id     UUID NOT NULL REFERENCES farm_profile(id) ON DELETE CASCADE,
    soil_reading_id     UUID REFERENCES soil_reading(id) ON DELETE SET NULL,
    model_bundle_version VARCHAR(40) NOT NULL DEFAULT 'v1',
    status              recommendation_status NOT NULL DEFAULT 'completed',
    ranked_output       JSONB NOT NULL,
    top_crop            VARCHAR(80),
    top_profit_estimate NUMERIC(12, 2),
    explainability      JSONB,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market_snapshot (
    id                  BIGSERIAL PRIMARY KEY,
    crop_id             INTEGER NOT NULL REFERENCES crop_reference(id) ON DELETE CASCADE,
    source              VARCHAR(40) NOT NULL,
    week_start          DATE NOT NULL,
    price_gbp_per_tonne NUMERIC(12, 2),
    trend_pct           NUMERIC(6, 2),
    forecast_price      NUMERIC(12, 2),
    demand_google_score NUMERIC(8, 4),
    demand_sentiment    VARCHAR(40),
    raw_json            JSONB,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (crop_id, source, week_start)
);

CREATE TABLE confirmed_crop_plan (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_profile_id     UUID NOT NULL REFERENCES farm_profile(id) ON DELETE CASCADE,
    recommendation_run_id UUID REFERENCES recommendation_run(id) ON DELETE SET NULL,
    crop_id             INTEGER NOT NULL REFERENCES crop_reference(id),
    season_year         SMALLINT NOT NULL,
    week_number         SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 53),
    confirmed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contributes_to_district BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE district_crop_aggregate (
    id              BIGSERIAL PRIMARY KEY,
    district_code   VARCHAR(32) NOT NULL,
    crop_id         INTEGER NOT NULL REFERENCES crop_reference(id),
    season_year     SMALLINT NOT NULL,
    week_number     SMALLINT NOT NULL,
    plan_count      INTEGER NOT NULL DEFAULT 0 CHECK (plan_count >= 0),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (district_code, crop_id, season_year, week_number)
);

CREATE TABLE oversupply_alert (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_code   VARCHAR(32) NOT NULL,
    crop_id         INTEGER NOT NULL REFERENCES crop_reference(id),
    threshold_count INTEGER NOT NULL CHECK (threshold_count > 0),
    current_count   INTEGER NOT NULL CHECK (current_count >= 0),
    risk_level      oversupply_level NOT NULL,
    warning_message TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_farm_profile_user ON farm_profile(user_id);
CREATE INDEX idx_farm_profile_district ON farm_profile(district_code);
CREATE INDEX idx_soil_reading_farm ON soil_reading(farm_profile_id, recorded_at DESC);
CREATE INDEX idx_recommendation_run_farm ON recommendation_run(farm_profile_id, created_at DESC);
CREATE INDEX idx_market_snapshot_crop_week ON market_snapshot(crop_id, week_start DESC);
CREATE INDEX idx_district_aggregate_lookup ON district_crop_aggregate(district_code, season_year, week_number);
CREATE INDEX idx_oversupply_active ON oversupply_alert(district_code, is_active) WHERE is_active = TRUE;

-- Idempotency keys for safe POST retries (Stripe-style pattern)
CREATE TABLE idempotency_record (
    idempotency_key   VARCHAR(128) PRIMARY KEY,
    user_id           UUID REFERENCES user_account(id) ON DELETE CASCADE,
    method            VARCHAR(10) NOT NULL,
    path              VARCHAR(255) NOT NULL,
    request_hash      VARCHAR(64) NOT NULL,
    response_status   INTEGER NOT NULL,
    response_body     JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_record(expires_at);
CREATE INDEX idx_idempotency_user ON idempotency_record(user_id);

-- Password reset tokens (forgot-password emails via Resend)
CREATE TABLE password_reset_token (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_user ON password_reset_token(user_id);
CREATE INDEX idx_password_reset_expires ON password_reset_token(expires_at);

INSERT INTO crop_reference (slug, display_name, l1_label) VALUES
    ('maize', 'Maize', 'maize'),
    ('rice', 'Rice', 'rice'),
    ('wheat', 'Wheat', 'wheat'),
    ('potato', 'Potato', 'potato'),
    ('tomato', 'Tomato', 'tomato'),
    ('cabbage', 'Cabbage', 'cabbage'),
    ('onion', 'Onion', 'onion'),
    ('carrot', 'Carrot', 'carrot'),
    ('chili', 'Chili', 'chili'),
    ('beans', 'Beans', 'kidneybeans')
ON CONFLICT (slug) DO NOTHING;
