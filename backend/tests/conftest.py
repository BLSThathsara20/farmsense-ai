import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    app.state.limiter.enabled = False
    return TestClient(app)
