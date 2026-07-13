import uuid
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import FarmProfile, PasswordResetToken, UserAccount
from app.main import app

pytestmark = pytest.mark.integration


def _db_available() -> bool:
    try:
        from sqlalchemy import text
        from app.db.session import SessionLocal

        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception:
        return False


@pytest.fixture(autouse=True)
def require_db():
    if not _db_available():
        pytest.skip("PostgreSQL not available — run docker compose up -d db")


@pytest.fixture
def db_session():
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def auth_headers(db_session):
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    user = UserAccount(email=email, password_hash=hash_password("secret12"), full_name="Test User")
    db_session.add(user)
    db_session.flush()
    farm = FarmProfile(
        user_id=user.id,
        district_code="test-district",
        district_name="Test District",
        region_label="Test Region",
        area_hectares=2.5,
    )
    db_session.add(farm)
    db_session.commit()

    client = TestClient(app)
    app.state.limiter.enabled = False
    login = client.post("/auth/login", json={"email": email, "password": "secret12"})
    token = login.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_auth_register_and_login(client: TestClient):
    email = f"new-{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={
            "name": "Demo Farmer",
            "email": email,
            "password": "password1",
            "region": "North Yorkshire",
            "farmSize": 3,
            "location": {"label": "North Yorkshire"},
        },
    )
    assert reg.status_code == 200
    assert reg.json()["token"]
    assert reg.json()["user"]["email"] == email

    login = client.post("/auth/login", json={"email": email, "password": "password1"})
    assert login.status_code == 200
    assert login.json()["token"]


def test_soil_idempotency_replay(client: TestClient, auth_headers):
    payload = {
        "region": "Test Region",
        "area": 2,
        "nitrogen": 65,
        "phosphorus": 45,
        "potassium": 70,
        "ph": 6.5,
        "texture": "Loamy",
        "preferences": ["Tomato"],
    }
    headers = {**auth_headers, "Idempotency-Key": f"soil-{uuid.uuid4()}"}
    first = client.post("/soil", json=payload, headers=headers)
    second = client.post("/soil", json=payload, headers=headers)
    assert first.status_code in (200, 201)
    assert second.status_code == first.status_code
    assert second.headers.get("Idempotency-Replayed") == "true"
    assert first.json()["recommendations"]["topRecommendation"]["crop"] == second.json()["recommendations"]["topRecommendation"]["crop"]


def test_forgot_and_reset_password(client: TestClient, db_session):
    email = f"reset-{uuid.uuid4().hex[:8]}@example.com"
    password = "oldpass12"
    user = UserAccount(email=email, password_hash=hash_password(password), full_name="Reset User")
    db_session.add(user)
    db_session.flush()
    db_session.add(
        FarmProfile(
            user_id=user.id,
            district_code="reset-district",
            district_name="Reset District",
            region_label="Reset Region",
            area_hectares=1.0,
        )
    )
    db_session.commit()

    app.state.limiter.enabled = False
    forgot = client.post("/auth/forgot-password", json={"email": email})
    assert forgot.status_code == 200
    body = forgot.json()
    assert body.get("accountFound") is True
    assert body.get("devResetUrl"), "Expected devResetUrl when Resend is not configured"

    unknown = client.post("/auth/forgot-password", json={"email": "nobody-not-registered@example.com"})
    assert unknown.status_code == 404
    assert "No account found" in unknown.json()["error"]["message"]

    token_row = db_session.scalar(
        select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
    )
    assert token_row is not None

    raw = parse_qs(urlparse(body["devResetUrl"]).query)["token"][0]

    new_password = "newpass99"
    reset = client.post("/auth/reset-password", json={"token": raw, "password": new_password})
    assert reset.status_code == 200

    bad = client.post("/auth/login", json={"email": email, "password": password})
    assert bad.status_code == 401

    good = client.post("/auth/login", json={"email": email, "password": new_password})
    assert good.status_code == 200
    assert good.json()["token"]


def test_auth_me_returns_saved_counts(client: TestClient, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["account"]["email"]
    assert "savedData" in body
    assert "soilReadingsCount" in body["savedData"]
    assert "recommendationRunsCount" in body["savedData"]


def test_protected_route_requires_auth(client: TestClient):
    res = client.get("/dashboard")
    assert res.status_code == 401
