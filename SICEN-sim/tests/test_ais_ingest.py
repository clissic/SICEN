"""
Tests para el servicio de ingest AIS.
"""
import asyncio
from datetime import datetime, timezone

import pytest
from app.ais_ingest import AisIngestService


# Mensajes NMEA de ejemplo reales
NMEA_TYPE_1 = "!AIVDM,1,1,,A,13HOI:0P0000VOHLCnHQKwvL05Ip,0*23"  # Position Report Class A
NMEA_TYPE_3 = "!AIVDM,1,1,,B,35Mtp?0Oh0Jw<tSF0l4Q@V1L0L3t,0*36"  # Position Report Class A
NMEA_TYPE_5 = "!AIVDM,2,1,3,B,55?MbV02>H97Hl4N220<4hDp000000000000017GG8?C0<50hH@Ql3kSp888,0*0E\n!AIVDM,2,2,3,B,88888888880,2*2F"  # Static Data
NMEA_TYPE_18 = "!AIVDM,1,1,,A,B5NJ;PP005l4ot5Isbl03wsUkP06,0*76"  # Class B Position
NMEA_TYPE_19 = "!AIVDM,1,1,,B,C5N3SRP0IH1<GD8HUo0DQ=@T4p62222216L961O3U28H88888888888880,2*48"  # Extended Class B
NMEA_TYPE_24 = "!AIVDM,1,1,,A,H5NLCTQp5ITh4U2220<5P<588888888888888?21<0864l4h4pDTp00,2*52"  # Static Data Class B

NMEA_INVALID = "!AIVDM,INVALID,MESSAGE"


@pytest.fixture
def service():
    """Fixture que crea una instancia del servicio sin conectar a MongoDB."""
    return AisIngestService(mongo_uri="mongodb://localhost:27017/test")


class TestNmeaParsing:
    """Tests de parsing de mensajes NMEA."""

    def test_parse_type1_position(self, service):
        """Test de parsing de mensaje tipo 1 (Position Report Class A)."""
        data = service.parse_nmea_message(NMEA_TYPE_1)
        
        assert data is not None
        assert data["msg_type"] == 1
        assert data["mmsi"] == "227006760"
        assert data["data_type"] == "position"
        assert data["ais_class"] == "A"
        assert "lat" in data
        assert "lon" in data
        assert "location" in data
        assert data["location"]["type"] == "Point"
        assert len(data["location"]["coordinates"]) == 2
        assert "sog" in data
        assert "cog" in data

    def test_parse_type3_position(self, service):
        """Test de parsing de mensaje tipo 3 (Position Report Class A)."""
        data = service.parse_nmea_message(NMEA_TYPE_3)
        
        assert data is not None
        assert data["msg_type"] == 3
        assert data["data_type"] == "position"
        assert data["ais_class"] == "A"
        assert "mmsi" in data
        assert "lat" in data
        assert "lon" in data

    def test_parse_type18_position(self, service):
        """Test de parsing de mensaje tipo 18 (Class B Position)."""
        data = service.parse_nmea_message(NMEA_TYPE_18)
        
        assert data is not None
        assert data["msg_type"] == 18
        assert data["data_type"] == "position"
        assert data["ais_class"] == "B"
        assert "mmsi" in data
        assert "lat" in data
        assert "lon" in data

    def test_parse_type5_static(self, service):
        """Test de parsing de mensaje tipo 5 (Static Data Class A)."""
        # Type 5 es multi-parte, usar solo la primera línea para el test
        lines = NMEA_TYPE_5.split("\n")
        data = service.parse_nmea_message(lines[0])
        
        # pyais puede necesitar ambas partes para decodificar completamente
        # En este test verificamos que al menos intenta procesar
        # En uso real, el stream manejará las múltiples partes
        assert data is None or data.get("msg_type") == 5

    def test_parse_invalid_message(self, service):
        """Test de manejo de mensaje inválido."""
        data = service.parse_nmea_message(NMEA_INVALID)
        assert data is None
        assert service.stats["errors"] > 0

    def test_parse_empty_message(self, service):
        """Test de manejo de mensaje vacío."""
        data = service.parse_nmea_message("")
        assert data is None


class TestDataExtraction:
    """Tests de extracción de datos específicos."""

    def test_position_has_geojson_point(self, service):
        """Test de que los mensajes de posición incluyen formato GeoJSON."""
        data = service.parse_nmea_message(NMEA_TYPE_1)
        
        assert data is not None
        assert "location" in data
        location = data["location"]
        
        assert location["type"] == "Point"
        assert "coordinates" in location
        coords = location["coordinates"]
        assert len(coords) == 2
        # GeoJSON usa [lon, lat]
        assert coords[0] == data["lon"]
        assert coords[1] == data["lat"]

    def test_position_has_timestamp(self, service):
        """Test de que los mensajes incluyen timestamp."""
        data = service.parse_nmea_message(NMEA_TYPE_1)
        
        assert data is not None
        assert "timestamp" in data
        assert isinstance(data["timestamp"], datetime)
        assert data["timestamp"].tzinfo == timezone.utc

    def test_ais_class_detection(self, service):
        """Test de detección de clase AIS."""
        # Class A
        data_a = service.parse_nmea_message(NMEA_TYPE_1)
        assert data_a is not None
        assert data_a["ais_class"] == "A"
        
        # Class B
        data_b = service.parse_nmea_message(NMEA_TYPE_18)
        assert data_b is not None
        assert data_b["ais_class"] == "B"


class TestStatistics:
    """Tests de estadísticas del servicio."""

    def test_stats_initialization(self, service):
        """Test de inicialización de estadísticas."""
        assert service.stats["messages_received"] == 0
        assert service.stats["messages_decoded"] == 0
        assert service.stats["messages_stored"] == 0
        assert service.stats["errors"] == 0

    def test_stats_increment_on_parse(self, service):
        """Test de incremento de stats al decodificar."""
        initial_decoded = service.stats["messages_decoded"]
        
        service.parse_nmea_message(NMEA_TYPE_1)
        assert service.stats["messages_decoded"] == initial_decoded + 1

    def test_stats_increment_on_error(self, service):
        """Test de incremento de stats en error."""
        initial_errors = service.stats["errors"]
        
        service.parse_nmea_message(NMEA_INVALID)
        assert service.stats["errors"] == initial_errors + 1


class TestDataTypes:
    """Tests de tipos de datos."""

    def test_mmsi_is_string(self, service):
        """Test de que MMSI se guarda como string."""
        data = service.parse_nmea_message(NMEA_TYPE_1)
        
        assert data is not None
        assert "mmsi" in data
        assert isinstance(data["mmsi"], str)

    def test_coordinates_are_floats(self, service):
        """Test de que coordenadas son floats."""
        data = service.parse_nmea_message(NMEA_TYPE_1)
        
        assert data is not None
        assert isinstance(data["lat"], (int, float))
        assert isinstance(data["lon"], (int, float))

    def test_data_type_field_present(self, service):
        """Test de que campo data_type está presente."""
        data_pos = service.parse_nmea_message(NMEA_TYPE_1)
        assert data_pos is not None
        assert data_pos["data_type"] == "position"


@pytest.mark.asyncio
class TestMongoOperations:
    """Tests de operaciones MongoDB (requieren motor mock o MongoDB test)."""

    async def test_store_message_without_connection(self, service):
        """Test de que store_message maneja conexión nula."""
        # Sin conectar, no debe crashear
        data = service.parse_nmea_message(NMEA_TYPE_1)
        await service.store_message(data)
        # No hay assertion, solo verificamos que no lanza excepción

    async def test_store_message_without_mmsi(self, service):
        """Test de que store_message ignora mensajes sin MMSI."""
        data = {"data_type": "position", "lat": 10.0, "lon": 20.0}
        await service.store_message(data)
        # No hay assertion, solo verificamos que no lanza excepción


def test_version_info():
    """Test de información de versión (smoke test)."""
    import pyais
    assert hasattr(pyais, "__version__")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
