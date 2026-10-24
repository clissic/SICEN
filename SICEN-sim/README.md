# SICEN-sim — worker de simulación HC, SAR y AIS Ingest

Servicio Python que provee:

- **HC:** trayectorias y meteorización de derrames de hidrocarburo.
- **SAR:** deriva Leeway de objetos (PIW, balsas, embarcaciones) y fase ADD
  hundido → reaparición.
- **AIS Ingest:** decodificación NMEA AIVDM (pyais) desde receptores AIS locales.

Usado por **El Centinela** a través de la API Node (`/api/hc`, `/api/sar`, `/api/ais/ingest`).

## Arranque local (sin Docker)

```bash
cd SICEN-sim
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8091
```

Health: `GET http://127.0.0.1:8091/health`

### HC

- Catálogo: `GET /oils`
- Simular: `POST /run`
- Spike: `python scripts/spike_openoil.py`

### SAR

- Catálogo: `GET /sar-objects`
- Simular: `POST /run-sar`
- Spike: `python scripts/spike_leeway.py`

Criterio spike SAR: job completa, timesteps ≥ 2, features > 0, `meta.engine` informado.

## Docker

```bash
docker build -t sicen-sim .
docker run --rm -p 8091:8091 -e SICEN_SIM_ENGINE=auto sicen-sim
```

En la imagen se intenta instalar OpenDrift (`requirements-opendrift.txt`).
Si no está disponible, el worker usa motores **Lagrangian** (HC NOAA-like / SAR leeway-like).

## Variables

| Variable | Default | Descripción |
|----------|---------|-------------|
| `SICEN_SIM_ENGINE` | `auto` | `auto` \| `lagrangian` \| `opendrift` |
| `SICEN_SIM_CACHE_DIR` | `data/cache` | Cache forzado Open-Meteo |
| `SICEN_SIM_CACHE_TTL_S` | `21600` | TTL cache (6 h) |
| `PORT` | `8091` | Puerto uvicorn |

Con `auto`: OpenOil / OpenDrift Leeway si están instalados; si no, Lagrangian.
Los casos SAR `piw_deceased_submerged` (ADD) usan siempre Lagrangian.

## Contrato `POST /run` (HC)

```json
{
  "lat": -35.05,
  "lon": -55.85,
  "volumeM3": 10,
  "oilTypeId": "diesel",
  "startTime": "2026-09-13T18:00:00Z",
  "horizonHours": 12,
  "releaseDurationHours": 0,
  "numParticles": 2000,
  "constantForcing": false
}
```

Respuesta: `timesteps[]`, `contours[]`, `budget`, `meta`.

## Contrato `POST /run-sar`

```json
{
  "lat": -35.05,
  "lon": -55.85,
  "objectTypeId": "piw_unknown",
  "startTime": "2026-09-13T18:00:00Z",
  "horizonHours": 12,
  "uncertaintyRadiusM": 500,
  "numParticles": 2000,
  "constantForcing": false
}
```

`horizonHours`: 6 | 12 | 24 | 48.

Respuesta: `timesteps[]` (GeoJSON + `phase` / `addMean` si aplica), `contours[]`, `meta`
(`floatState`, `engine`, LKP, objeto, ADD si hundido).

### ADD (persona fallecida hundida)

`objectTypeId: "piw_deceased_submerged"`: acumula °C·día con SST hasta ~100
(banda Monte Carlo 80–140); sin partículas en superficie hasta flotar; luego
leeway de fallecido flotando. Sin corriente 3D de fondo.

## AIS Ingest (receptor NMEA local)

Ver [README-AIS.md](./README-AIS.md) para documentación completa.

### Arranque rápido

```bash
# Instalar dependencias
pip install -r requirements-ais.txt

# Configurar (copiar .env.ais.example a .env.ais)
# AIS_MONGODB_URI=mongodb://localhost:27017/SICEN

# Correr servicio (escucha UDP 10110 por default)
python -m app.ais_ingest

# Testing con replay de archivo NMEA
python scripts/replay_nmea.py data/sample-nmea.txt --loop
```

El servicio decodifica mensajes NMEA AIVDM (tipos 1-3, 18/19, 5, 24) y los persiste
en MongoDB. Las posiciones se exponen en SICEN-back vía `/api/ais/ingest/positions`.

## SICEN-back

En `.env.development`:

```
HC_SIM_ENABLED=true
SAR_SIM_ENABLED=true
HC_SIM_URL=http://127.0.0.1:8091
```

`SAR_SIM_ENABLED` reutiliza la misma URL del worker (`HC_SIM_URL`).

Las posiciones AIS del ingest NMEA se exponen automáticamente en `/api/ais/ingest/*`
(sin necesidad de configuración adicional en SICEN-back, solo que MongoDB esté corriendo).
