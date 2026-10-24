"""
Tests para la integración de Global Fishing Watch con mocks.
"""

import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

import pytest

from app.gfw_fetch import (
    is_gfw_configured,
    bbox_to_geojson_polygon,
    normalize_vessel,
    normalize_event,
    run_gfw_fetch_job,
)


@pytest.fixture(autouse=True)
def mock_env():
    """Mock de variables de entorno."""
    with patch.dict(
        os.environ,
        {
            "GFW_API_TOKEN": "test_token",
            "MONGODB_PASSWORD": "test_password",
            "GFW_BBOX": "-38.5,-61.0,-30.5,-50.5",
            "GFW_LOOKBACK_DAYS": "14",
        },
        clear=False,
    ):
        yield


def test_is_gfw_configured():
    """Verifica detección de configuración GFW."""
    with patch.dict(os.environ, {"GFW_API_TOKEN": "test_token"}, clear=False):
        assert is_gfw_configured() is True

    with patch.dict(os.environ, {"GFW_API_TOKEN": ""}, clear=False):
        assert is_gfw_configured() is False


def test_bbox_to_geojson_polygon():
    """Convierte bbox a polígono GeoJSON."""
    bbox = (-38.5, -61.0, -30.5, -50.5)
    polygon = bbox_to_geojson_polygon(bbox)

    assert polygon["type"] == "Polygon"
    assert len(polygon["coordinates"][0]) == 5
    assert polygon["coordinates"][0][0] == [-61.0, -38.5]
    assert polygon["coordinates"][0][4] == [-61.0, -38.5]


def test_normalize_vessel():
    """Normaliza datos de buque GFW."""
    raw = {
        "id": "vessel-123",
        "name": "Test Vessel",
        "ssvid": "123456789",
        "flag": "URY",
        "type": "fishing",
    }

    result = normalize_vessel(raw)

    assert result["id"] == "vessel-123"
    assert result["name"] == "Test Vessel"
    assert result["mmsi"] == "123456789"
    assert result["flag"] == "URY"
    assert result["type"] == "fishing"


def test_normalize_vessel_none():
    """Normaliza vessel None."""
    assert normalize_vessel(None) is None


def test_normalize_event_fishing():
    """Normaliza evento de pesca."""
    raw = {
        "id": "event-123",
        "position": {"lat": -35.0, "lon": -56.0},
        "start": "2026-10-20T12:00:00Z",
        "end": "2026-10-20T15:00:00Z",
        "vessel": {
            "id": "vessel-123",
            "name": "Test Vessel",
            "ssvid": "123456789",
        },
        "regions": ["EEZ:URY"],
    }

    result = normalize_event(raw, "fishing")

    assert result["eventId"] == "event-123"
    assert result["eventType"] == "fishing"
    assert result["lat"] == -35.0
    assert result["lon"] == -56.0
    assert result["startTime"] == "2026-10-20T12:00:00Z"
    assert result["vessel"]["name"] == "Test Vessel"
    assert result["location"]["type"] == "Point"
    assert result["location"]["coordinates"] == [-56.0, -35.0]


def test_normalize_event_encounter():
    """Normaliza evento de encuentro."""
    raw = {
        "id": "encounter-456",
        "position": {"lat": -35.5, "lon": -55.5},
        "start": "2026-10-21T08:00:00Z",
        "vessel": {"name": "Vessel A", "ssvid": "111111111"},
        "encounter": {
            "type": "rendezvous",
            "vessel": {"name": "Vessel B", "ssvid": "222222222"},
        },
    }

    result = normalize_event(raw, "encounter")

    assert result["eventType"] == "encounter"
    assert result["vessel"]["name"] == "Vessel A"
    assert result["secondVessel"]["name"] == "Vessel B"
    assert result["encounterType"] == "rendezvous"


def test_normalize_event_missing_position():
    """Evento sin posición retorna None."""
    raw = {
        "id": "event-789",
        "start": "2026-10-20T12:00:00Z",
    }

    result = normalize_event(raw, "fishing")
    assert result is None


@patch("app.gfw_fetch.MongoClient")
@patch("app.gfw_fetch.GFWApi")
def test_run_gfw_fetch_job_success(mock_gfw_api_class, mock_mongo_client):
    """Job de fetch GFW exitoso."""
    # Mock API GFW
    mock_api = Mock()
    mock_gfw_api_class.return_value = mock_api
    mock_api.get_events.return_value = {
        "entries": [
            {
                "id": "fishing-1",
                "position": {"lat": -35.0, "lon": -56.0},
                "start": "2026-10-20T12:00:00Z",
                "vessel": {"name": "Test", "ssvid": "123456789"},
            }
        ]
    }

    # Mock MongoDB
    mock_client = Mock()
    mock_db = Mock()
    mock_collection = Mock()
    mock_client.__getitem__ = Mock(return_value=mock_db)
    mock_db.__getitem__ = Mock(return_value=mock_collection)
    mock_collection.insert_one = Mock()
    mock_collection.delete_many = Mock(return_value=Mock(deleted_count=5))
    mock_mongo_client.return_value = mock_client

    result = run_gfw_fetch_job()

    assert result["ok"] is True
    assert "stats" in result
    mock_api.get_events.assert_called()
    mock_collection.insert_one.assert_called()


def test_run_gfw_fetch_job_not_configured():
    """Job sin token configurado."""
    with patch.dict(os.environ, {"GFW_API_TOKEN": ""}, clear=False):
        result = run_gfw_fetch_job()

        assert result["ok"] is False
        assert "no configurado" in result["msg"].lower()


@patch("app.gfw_fetch.MongoClient")
@patch("app.gfw_fetch.GFWApi")
def test_run_gfw_fetch_job_api_error(mock_gfw_api_class, mock_mongo_client):
    """Job con error de API."""
    mock_api = Mock()
    mock_gfw_api_class.return_value = mock_api
    mock_api.get_events.side_effect = Exception("API error")

    mock_client = Mock()
    mock_db = Mock()
    mock_collection = Mock()
    mock_client.__getitem__ = Mock(return_value=mock_db)
    mock_db.__getitem__ = Mock(return_value=mock_collection)
    mock_mongo_client.return_value = mock_client

    result = run_gfw_fetch_job()

    assert result["ok"] is False
    assert "error" in result["msg"].lower()
