from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app, raise_server_exceptions=False)


def test_global_exception_handler():

    @app.get("/force-error")
    def force_error():
        raise RuntimeError("Test error")

    response = client.get("/force-error")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal Server Error"}
