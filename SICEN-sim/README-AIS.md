# SICEN AIS Ingest — Decodificación NMEA con pyais

Servicio Python que escucha mensajes NMEA AIVDM por UDP o TCP, los decodifica con [pyais](https://github.com/M0r13n/pyais) y persiste las posiciones AIS en MongoDB.

## Características

- **Decodificación NMEA AIVDM** con pyais
- Soporte para tipos de mensaje:
  - **1, 2, 3**: Position Report (Class A)
  - **18**: Standard Class B Position Report
  - **19**: Extended Class B Position Report (con datos estáticos)
  - **5**: Static and Voyage Related Data (Class A)
  - **24**: Static Data Report (Class B)
- **Persistencia MongoDB** con índices 2dsphere para queries geoespaciales
- **TTL automático** (24h default) en las posiciones
- Escucha por **UDP o TCP** (configurable)
- **Upsert** por MMSI (mantiene última posición conocida)

## Instalación

```bash
cd SICEN-sim
pip install -r requirements-ais.txt
```

O usar Docker:

```bash
docker build -f Dockerfile.ais -t sicen-ais-ingest .
```

## Configuración

Copiar `.env.ais.example` a `.env.ais` (o definir variables de entorno):

```bash
# MongoDB (usar la misma base que SICEN-back)
AIS_MONGODB_URI=mongodb://localhost:27017/SICEN

# Protocolo de escucha (udp o tcp)
AIS_PROTOCOL=udp

# Host y puerto para escuchar mensajes NMEA AIVDM
AIS_HOST=0.0.0.0
AIS_PORT=10110
```

## Uso

### Desarrollo local

```bash
cd SICEN-sim
python -m app.ais_ingest
```

### Docker (UDP)

```bash
docker run --rm -p 10110:10110/udp \
  -e AIS_MONGODB_URI=mongodb://host.docker.internal:27017/SICEN \
  sicen-ais-ingest
```

### Docker (TCP)

```bash
docker run --rm -p 10110:10110/tcp \
  -e AIS_MONGODB_URI=mongodb://host.docker.internal:27017/SICEN \
  -e AIS_PROTOCOL=tcp \
  sicen-ais-ingest
```

## Testing

### Script de replay

Para testing sin hardware AIS real:

```bash
# Enviar una vez
python scripts/replay_nmea.py data/sample-nmea.txt

# Enviar por TCP
python scripts/replay_nmea.py data/sample-nmea.txt --tcp

# Loop continuo con delay
python scripts/replay_nmea.py data/sample-nmea.txt --loop --delay 0.5

# A otro host/puerto
python scripts/replay_nmea.py data/sample-nmea.txt --host 192.168.1.100 --port 5000
```

### Tests unitarios

```bash
cd SICEN-sim
pytest tests/test_ais_ingest.py -v
```

## Estructura de datos MongoDB

### Colección `aisPositions`

Cada documento representa la última posición conocida de un buque (upsert por MMSI):

```json
{
  "mmsi": "227006760",
  "msg_type": 1,
  "timestamp": "2026-10-23T23:45:12.000Z",
  "lat": -34.9056,
  "lon": -56.1913,
  "location": {
    "type": "Point",
    "coordinates": [-56.1913, -34.9056]
  },
  "sog": 12.3,
  "cog": 245.0,
  "heading": 243,
  "turn": 0,
  "nav_status": 0,
  "ais_class": "A",
  "name": "BUQUE EJEMPLO",
  "callsign": "CX1234",
  "imo": 1234567,
  "ship_type": 70,
  "data_type": "position",
  "created_at": "2026-10-23T20:00:00.000Z"
}
```

### Índices

- `location` (2dsphere): queries geoespaciales
- `mmsi`: búsquedas rápidas por buque
- `timestamp` (TTL 24h): limpieza automática de posiciones viejas
- `(mmsi, timestamp)`: consulta de última posición por buque

## Integración con SICEN-back

El backend Node expone las posiciones a través de `/api/ais/ingest`:

```javascript
// Lista posiciones recientes (última hora, máx 500)
GET /api/ais/ingest/positions?maxAgeMinutes=60&limit=500

// Posiciones en bounding box
POST /api/ais/ingest/positions/bbox
Body: { minLat, maxLat, minLon, maxLon, maxAgeMinutes?, limit? }

// Última posición de un buque
GET /api/ais/ingest/position/:mmsi

// Estadísticas del ingest
GET /api/ais/ingest/stats
```

Todas las rutas requieren autenticación (Bearer JWT).

## Arquitectura

```
Receptor AIS    ┌─────────────────────┐
(NMEA UDP/TCP) →│  SICEN-sim          │
                │  ais_ingest.py      │
                │  (pyais decoder)    │
                └──────────┬──────────┘
                           ↓
                    ┌──────────────┐
                    │  MongoDB     │
                    │ aisPositions │
                    └──────┬───────┘
                           ↓
                ┌──────────────────────┐
                │  SICEN-back          │
                │  /api/ais/ingest/*   │
                └──────────┬───────────┘
                           ↓
                ┌──────────────────────┐
                │  SICEN-front         │
                │  El Centinela        │
                │  (Leaflet map)       │
                └──────────────────────┘
```

## Fuentes de datos NMEA

### Receptor AIS local

Conectar un receptor AIS USB (ej: dAISy, RTL-SDR) y configurarlo para enviar NMEA por UDP/TCP al puerto 10110.

### AISHub (relay UDP)

AISHub permite recibir NMEA en tiempo real:

1. Registrarse en [AISHub](https://www.aishub.net/)
2. Configurar relay UDP hacia tu servidor
3. El servicio de ingest recibirá los mensajes

### Replay de archivos

Para desarrollo o testing con datos históricos:

```bash
python scripts/replay_nmea.py tu-archivo.nmea --loop
```

## Monitoreo

El servicio registra estadísticas cada 100 mensajes:

```
Stats: {
  'messages_received': 1234,
  'messages_decoded': 1150,
  'messages_stored': 1150,
  'errors': 84
}
```

Las estadísticas también están disponibles en:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/ais/ingest/stats
```

## Tipos de mensaje soportados

| Tipo | Descripción | Datos |
|------|-------------|-------|
| 1-3 | Position Report (Class A) | Posición, SOG, COG, heading, navStatus |
| 18 | Standard Class B Position Report | Posición, SOG, COG |
| 19 | Extended Class B Position Report | Posición + nombre + dimensiones |
| 5 | Static and Voyage Related Data (A) | Nombre, callsign, IMO, tipo, dimensiones, ETA |
| 24 | Static Data Report (Class B) | Nombre, callsign, tipo, dimensiones |

## Limitaciones

- **No soporta fragmentación multi-parte** en UDP (type 5 y algunos 24 pueden requerir múltiples mensajes)
- **TTL fijo** de 24h (configurable cambiando el índice en `ais_ingest.py`)
- **Sin historial** de trayectorias (solo última posición por MMSI)
- **Sin validación geográfica** (se almacenan todas las posiciones decodificadas)

## Troubleshooting

### No se reciben mensajes

1. Verificar que el receptor AIS está enviando a la IP y puerto correctos
2. Verificar firewall (abrir puerto UDP 10110)
3. Para UDP, usar `tcpdump` o `netcat` para verificar tráfico:

```bash
# Escuchar tráfico UDP
sudo tcpdump -i any udp port 10110 -A

# Enviar mensaje de prueba
echo '!AIVDM,1,1,,A,13HOI:0P0000VOHLCnHQKwvL05Ip,0*23' | nc -u 127.0.0.1 10110
```

### Mensajes no se decodifican

- Verificar que los mensajes son NMEA AIVDM válidos (deben empezar con `!AIVDM`)
- Revisar logs del servicio para ver errores de pyais
- Algunos tipos de mensaje requieren múltiples partes (type 5, 24)

### Conexión a MongoDB falla

- Verificar `AIS_MONGODB_URI` en `.env.ais`
- Verificar que MongoDB está corriendo
- Si usas Docker, usar `host.docker.internal` en lugar de `localhost`

## Referencias

- [pyais GitHub](https://github.com/M0r13n/pyais)
- [AIS Message Types](https://gpsd.gitlab.io/gpsd/AIVDM.html)
- [NMEA 0183](https://en.wikipedia.org/wiki/NMEA_0183)
- [Centinela Map Pattern Skill](../.cursor/skills/centinela-map-pattern/SKILL.md)
