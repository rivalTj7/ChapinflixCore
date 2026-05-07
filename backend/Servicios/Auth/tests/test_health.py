import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    """Test que el endpoint /health responde correctamente"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_root_endpoint():
    """Test que el endpoint raíz responde"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()