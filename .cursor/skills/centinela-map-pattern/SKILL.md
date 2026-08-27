---
name: centinela-map-pattern
description: >-
  Mapa interactivo de El Centinela (Leaflet + OpenSeaMap seamarks + capas
  conmutables + bridge AIS autenticado + viento/corrientes/olas Open-Meteo +
  batimetría GEBCO). Usar al tocar `/centinela`, CentinelaPage, AisVesselLayer,
  useAisVessels, /api/ais, /api/wind, /api/currents, /api/waves, batimetría GEBCO
  o la fuente AISStream.
---

# El Centinela — mapa y capas

## Piezas

| Pieza | Path |
|---|---|
| Página | `SICEN-front/src/pages/CentinelaPage.jsx` |
| Estilos | `SICEN-front/src/styles/centinela-map.css` |
| Capa AIS UI | `SICEN-front/src/components/centinela/AisVesselLayer.jsx` |
| Seamarks | `SICEN-front/src/components/centinela/SeamarksLayer.jsx` (add/remove imperativo + `overlayPane`) |
| Batimetría | `BathymetryLayer.jsx` + `BathymetryLegend.jsx` (números de profundidad sobre agua; GEBCO) |
| Batimetría API | `gebcoBathymetry.js` → `POST /api/bathymetry/points` (OpenTopoData gebco2020) |
| Proxy batimetría | `bathymetryProxy.service.js` + `utils/gebcoBathymetry.js` |
| HTTP batimetría | `bathymetry.controller.js` + `bathymetry.router.js` → `/api/bathymetry` |
| Zonas | `centinelaZones.js` + `ZonesLayer.jsx` (polígonos Leaflet) |
| Brevets | `centinelaBrevetCategories.js` (A–D) + `sportPorts.js` (índice Categoría C) |
| Puertos C | Front `constants/sportPorts.js` + Back `src/constants/sportPorts.js` (mismo índice; `id` estable) |
| Grilla | `GraticuleLayer.jsx` (lat/lon, paso según zoom) |
| Click coords | `MapClickCoords.jsx` (popup lat/lon; viento / corrientes / oleaje si capas activas) |
| Viento | `WindLayer.jsx` + `windVelocityData.js` + `WindLegend.jsx` |
| Corrientes | `CurrentsLayer.jsx` + `currentsVelocityData.js` + `CurrentsLegend.jsx` (Open-Meteo Marine) |
| Olas | `WavesLayer.jsx` + `wavesVelocityData.js` + `WavesLegend.jsx` (partículas; color = Hs; escala visual ∝ período medio) |
| Cliente API | `openAisStream` / `aisStatus` / `aisVessels` / `windFetchPoints` / `currentsFetchPoints` / `wavesFetchPoints` en `client.js` |
| Viento API | `openMeteoWind.js` → `POST /api/wind/points` |
| Corrientes API | `openMeteoCurrents.js` → `POST /api/currents/points` |
| Olas API | `openMeteoWaves.js` → `POST /api/waves/points` |
| Proxy corrientes | `currentsProxy.service.js` + `utils/openMeteoCurrents.js` |
| HTTP corrientes | `currents.controller.js` + `currents.router.js` → `/api/currents` |
| Proxy olas | `wavesProxy.service.js` + `utils/openMeteoWaves.js` |
| HTTP olas | `waves.controller.js` + `waves.router.js` → `/api/waves` |
| Bridge AIS | `SICEN-back/src/services/aisBridge.service.js` |
| Proxy viento | `SICEN-back/src/services/windProxy.service.js` + `utils/openMeteoWind.js` |
| HTTP AIS | `ais.controller.js` + `ais.router.js` → `/api/ais` |
| HTTP viento | `wind.controller.js` + `wind.router.js` → `/api/wind` |

## Cartografía

- Mapa a **pantalla completa** (sin `Layout`/nav/footer); panel flotante **liquid glass** (`.centinela-glass`) con capas, tema e Inicio. Cierre: solapa (`.centinela-glass__collapse`) pegada al borde derecho del panel.
- Base según tema: CARTO Voyager (light) / `dark_all` (dark) vía `useBootstrapTheme`. Key opcional `VITE_CARTO_API_KEY` → `?key=` en la URL de tiles (quita watermark).
- Overlay seamarks: `SeamarksLayer` + tiles OpenSeaMap.
- Zonas: catálogo en `centinelaZones.js`; fila con checkbox maestro (todas on/off, indeterminate si parcial) + desplegable por zona (`zoneVisibility`); `<ZonesLayer zones={visibleZones} />`.
- Brevets deportivos: catálogo en `centinelaBrevetCategories.js` (A–D). Categoría A `infoOnly` (popover en ícono). Categorías B/C/D: checkbox + ícono info con `data-sicen-popover` (`infoText`); no usar Swal. Categoría B: unión de círculos 15 MN recortada al lado mar (`clipPolygonToSeawardOfCoast`); cortes en `brevetBStripCuts.js`; checkpoint `v1` vía `restore-brevet-b-checkpoint.mjs v1`; regenerar con `build-brevet-b-strip.mjs`. Categoría C `portPicker`: select por puerto desde `sportPorts.js` (id estable, sector, `radiusNm` 20/15); círculo vía `circlePolygonLatLon`. Índice también en `SICEN-back/src/constants/sportPorts.js` para unidades/despachos. D pendiente.
- Orden de capas en UI: Coordenadas → Seamarks OSM → **Batimetría** → **Viento** → **Corrientes** → **Olas** → AIS EXPERIMENTAL → Zonas → Brevets. Al entrar: solo Coordenadas y Seamarks OSM activos.
- **Batimetría:** checkbox → `BathymetryLayer` (números coloreados de profundidad solo sobre agua). Muestras **aleatorias** (~mismo cupo que antes, tope 128 pts; prioriza agua). Datos: `POST /api/bathymetry/points` → OpenTopoData GEBCO 2020. Pane z 350.
- **Viento:** checkbox → `WindLayer` (`leaflet-velocity`) + `POST /api/wind/points`. Leyenda azul/amarillo/rojo.
- **Corrientes:** checkbox → `CurrentsLayer` + `POST /api/currents/points` (Open-Meteo Marine SMOC). Máscara de agua (`currentsWaterMask.js`: anillo seaward costa UY + exclusión tierra AR) aplicada al canvas cada frame — las partículas no se ven sobre tierra. Leyenda teal/verde/violeta. Pane `centinelaCurrentsPane` z 435.
- **Olas:** checkbox → `WavesLayer` (`leaflet-velocity`) + `POST /api/waves/points`. **Color = Hs** (paleta sky→rojo, `maxVelocity` 4 m). Dirección = desde. `velocityScale` se ajusta con el período medio del viewport (la lib acopla color y velocidad al mismo campo). Máscara de agua. Pane `centinelaWavesPane` z 430. Hs+período+dir en popup. Leyendas en `.centinela-env-legends`.
- Grilla: `GraticuleLayer` + checkbox; click en el mapa → `MapClickCoords` (popup con lat/lon + env si capas activas).
- Disclaimer en UI: no sustituye carta oficial.

### Índice de puertos (Categoría C / unidades)

- Fuente: `SPORT_PORTS` con `id`, `name`, `lat`, `lon`, `sector`, `radiusNm`, `brevetCategory: "C"`.
- Sectores: `rio-plata-superior` (20 MN) y `rio-plata-inferior` (15 MN; lista incompleta a propósito).
- Helpers front: `SPORT_PORTS_BY_ID`, `getSportPortById`, `sportPortsBySector`, `SPORT_PORT_SECTOR_LABELS`.
- Al agregar puertos: actualizar **ambos** archivos (front y back) con el mismo `id`.
- Asignación futura a unidades: guardar `id` (no el nombre libre) en `portsUnderJurisdiction`.


## Incorporaciones pendientes

UI placeholder: botones deshabilitados arriba de **Inicio** en el panel (`.centinela-glass__footer-actions`). Documentado también en `README.md` → *Implementaciones pendientes* → El Centinela.

### Simular incidente de hidrocarburo (HC)

- Botón: **Simular incidente de HC**.
- Motor: **OpenDrift/OpenOil** o **PyGNOME** (NOAA) como servicio Python (no calcular en el browser).
- Inputs: punto, volumen, tipo de oil, horizonte temporal; forzado corrientes + viento.
- Salida UI: GeoJSON (trayectorias / mancha por timestep) en Leaflet + disclaimer.

### Pronosticar deriva de objeto (SAR)

- Botón: **Pronosticar deriva de objeto**.
- Motor: mismo OpenDrift, módulo **`Leeway`** (tabla `OBJECTPROP.DAT`: PIW, balsas, kayaks, embarcaciones, etc.).
- Física: advection por corriente + leeway empírico (downwind / crosswind) según tipo de objeto; ensemble Monte Carlo → área de probabilidad.
- Inputs: última posición conocida (+ radio de incertidumbre), hora del evento, `object_type`, horizonte (p. ej. 6/12/24 h); forzado corrientes + viento.
- Salida UI: nube de partículas / polígono de densidad / animación temporal en Leaflet + disclaimer (apoyo a búsqueda, no ubicación certe).
- Al implementar ambos: endpoints autenticados compartiendo el worker de forzado ambiental; habilitar los botones y ampliar esta sección a patrón completo.

## AIS

1. **La API key nunca va al front.** Solo `AIS_STREAM_API_KEY` en `.env.*` → `env.aisStreamApiKey`.
2. Upstream: WebSocket AISStream (`ws` + `perMessageDeflate`) con bbox (`AIS_BBOX` o default Río de la Plata). Incluir Class A y Class B. `warmAisBridge()` al arrancar mantiene cache caliente.
3. Fan-out a clientes: **SSE** `GET /api/ais/stream` con `...guarded` (Bearer). El front usa `fetch` + ReadableStream (`openAisStream`), no `EventSource`.
4. Eventos SSE: `status`, `snapshot`, `update`, `remove`.
5. Sin key: el mapa funciona; la capa AIS muestra aviso de no configurado.
6. **Cobertura:** AISStream libre suele tener receptores en BA y casi ninguno en Montevideo; para AIS local real hace falta receptor propio / AISHub.
7. Fuentes futuras (receptor NMEA / AISHub) deben alimentar el mismo store/`upsertVessel` del bridge, sin cambiar el contrato del front.

## Viento (proxy)

1. **El front no llama Open-Meteo directo.** Usar `windFetchPoints` → `POST /api/wind/points` con `...guarded`.
2. Body: `{ points: [{ lat, lon }], forecastHoursOffset }` (0 | 3 | 6 | 12 | 24). Máx. 64 puntos.
3. Cache en memoria por clave `offset:lat,lon` (2 decimales). TTL `WIND_CACHE_TTL_MS` (default 10 min).
4. Respuesta: `{ ok, points, cacheHits, cacheMisses, forecastHoursOffset, source }`.
5. Simuladores HC/SAR futuros: reutilizar `windProxy.service.js` / `currentsProxy.service.js` o extraer forzado ambiental compartido.

## Corrientes (proxy)

1. Front: `currentsFetchPoints` → `POST /api/currents/points` (`...guarded`).
2. Body: `{ points: [{ lat, lon }], forecastHoursOffset }` (0 | 3 | 6 | 12 | 24). Máx. 64 puntos.
3. Upstream: `marine-api.open-meteo.com` (`ocean_current_velocity`, `ocean_current_direction`, `wind_speed_unit=kn`).
4. Cache en memoria; TTL `CURRENTS_CACHE_TTL_MS` (default 10 min).
5. Convención de dirección: **hacia** (no “desde”, a diferencia del viento).

## Olas (proxy)

1. Front: `wavesFetchPoints` → `POST /api/waves/points` (`...guarded`).
2. Body: `{ points: [{ lat, lon }], forecastHoursOffset }` (0 | 3 | 6 | 12 | 24). Máx. 64 puntos.
3. Upstream: `marine-api.open-meteo.com` (`wave_height`, `wave_period`, `wave_direction`).
4. Cache en memoria; TTL `WAVES_CACHE_TTL_MS` (default 10 min).
5. Respuesta punto: `{ lat, lon, heightM, periodS, directionDeg, time }`. Visual: partículas leaflet-velocity; **color = Hs**; `velocityScale` ∝ período medio del viewport; Hs/período/dir en popup.
6. Dirección de olas: **desde** dónde viene el oleaje (misma convención que viento).

## Reglas

1. Ruta `/centinela` protegida + prefijo en `MAIN_MENU_ROUTE_PREFIXES`.
2. Tile de Home con `MainMenuLink` a `/centinela` (sin overlay EN DESARROLLO).
3. Desactivar `compression` para `/api/ais/stream`.
4. Markers AIS con `L.divIcon` (no depender de iconos default de Leaflet rotos en bundlers).

## Template capa nueva

```jsx
// En CentinelaPage: checkbox + montaje condicional dentro de MapContainer
{miCapaOn ? <MiCapaLayer data={data} /> : null}
```

Backend: si la capa necesita stream, reutilizar el patrón SSE autenticado o ampliar `aisBridge` con un bus de eventos compartido.

## Ejemplos vivos

- `CentinelaPage.jsx`, `AisVesselLayer.jsx`, `aisBridge.service.js`
