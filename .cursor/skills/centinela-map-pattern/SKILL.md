---
name: centinela-map-pattern
description: >-
  Mapa interactivo de El Centinela (Leaflet + OpenSeaMap seamarks + capas
  conmutables + bridge AIS autenticado + Skylight detecciones satelitales +
  IUU LAC FIU (FeatureServers públicos) + viento/corrientes/olas Open-Meteo +
  batimetría GEBCO + simulación HC OpenOil/Lagrangian + deriva SAR Leeway/ADD +
  límites marítimos MarineRegions 12/24 MN y ZEE).
  Usar al tocar `/centinela`, CentinelaPage, AisVesselLayer, SkylightEventsLayer,
  FiuIuuEventsLayer, HcSpillPanel, SarDriftPanel, MaritimeBoundariesLayer,
  useAisVessels, /api/ais, /api/skylight, /api/fiuIuu, /api/hc, /api/sar,
  /api/maritimeBoundaries, /api/wind, /api/currents, /api/waves, batimetría GEBCO,
  AISStream, SICEN-sim o refuerzo Skylight last-known / Global Fishing Watch
  (identidad OMI) en la capa AIS.
---

# El Centinela — mapa y capas

## Piezas

| Pieza | Path |
|---|---|
| Página | `SICEN-front/src/pages/CentinelaPage.jsx` |
| Estilos | `SICEN-front/src/styles/centinela-map.css` |
| Capa AIS UI | `AisVesselLayer.jsx` + `aisLayers.js` (fuentes AISStream / Skylight) |
| Skylight | `SkylightEventsLayer.jsx` + `SkylightFramesLayer.jsx` + `SkylightEventsList.jsx` + `SkylightVesselDossierPanel.jsx` + `SkylightVesselTrackLayer.jsx` + `SkylightAisCrossLinks.jsx` + `skylightLayers.js` + `skylightZoneAoiSync.js` + `skylightEventHelpers.js` + `/api/skylight` |
| IUU LAC (FIU) | `FiuIuuEventsLayer.jsx` + `CentinelaFiuIuuAttribution.jsx` + `fiuIuuLayers.js` + `/api/fiuIuu` (FeatureServers públicos Windward vía FIU; sin key; uso no comercial) |
| Medición | `MeasureDistanceLayer.jsx` + `MeasureDistancePanel.jsx` + `utils/geoMeasure.js` |
| Ir al punto | `GoToPointPanel.jsx` + `parseDmsDigits` / hemi N·S E·O + `openMapCoordsPopup` |
| Marcadores | `UserMarkersLayer.jsx` + `UserMarkersPanel.jsx` + `MarkerFormModal.jsx` + `POST/GET/PUT/DELETE /api/mapMarkers` |
| Detalle mapa | `CentinelaDetailWindow.jsx` (ventana fija arrastrable; skill `centinela-detail-window`) |
| Posicionamiento SICEN | `SicenPositioningLayer.jsx` + `useSportMovementTrackingStream.js` |
| Seamarks | `SICEN-front/src/components/centinela/SeamarksLayer.jsx` (add/remove imperativo + `overlayPane`) |
| Batimetría | `BathymetryLayer.jsx` + `BathymetryLegendSection` en `BathymetryLegend.jsx` (GEBCO) |
| Leyendas unificadas | `CentinelaEnvLegendsPanel.jsx` + `CentinelaEnvForecastSelector.jsx` (centro inferior) + `CentinelaGebcoAttribution.jsx` / `CentinelaFiuIuuAttribution.jsx` (control Leaflet) |
| Batimetría API | `gebcoBathymetry.js` → `POST /api/bathymetry/points` (OpenTopoData gebco2020) |
| Proxy batimetría | `bathymetryProxy.service.js` + `utils/gebcoBathymetry.js` |
| HTTP batimetría | `bathymetry.controller.js` + `bathymetry.router.js` → `/api/bathymetry` |
| Marcadores API | `mapMarkers.*` + `mapMarkerCatalog.js` → `/api/mapMarkers` |
| Zonas | `centinelaZones.js` + `ZonesLayer.jsx` (polígonos Leaflet) |
| Límites marítimos | `maritimeBoundaryLayers.js` + `MaritimeBoundariesLayer.jsx` + `/api/maritimeBoundaries` (MarineRegions 12/24 MN + ZEE) |
| Brevets | `centinelaBrevetCategories.js` (A–D) + `sportPorts.js` (índice Categoría C) |
| Puertos C | Front `constants/sportPorts.js` + Back `src/constants/sportPorts.js` (mismo índice; `id` estable) |
| Grilla | `GraticuleLayer.jsx` (lat/lon, paso según zoom) |
| Click coords | `MapClickCoords.jsx` (popup lat/lon; viento / corrientes / oleaje si capas activas) |
| Simulación HC | `HcSpillPanel.jsx` + `HcSpillLayer.jsx` + `/api/hc` + worker `SICEN-sim` |
| Deriva SAR | `SarDriftPanel.jsx` + `SarDriftLayer.jsx` + `/api/sar` + `SICEN-sim` `/run-sar` |
| Escala + cursor | `MapCursorScaleBar.jsx` (barra MN + Lat/Long al mover cursor; solo desktop) |
| Viento | `WindLayer.jsx` + `windVelocityData.js` + `WindLegend.jsx` |
| Corrientes | `CurrentsLayer.jsx` + `currentsVelocityData.js` + `CurrentsLegend.jsx` (Open-Meteo Marine) |
| Olas | `WavesLayer.jsx` + `wavesVelocityData.js` + `WavesLegend.jsx` (partículas; color = Hs; escala visual ∝ período medio) |
| Cliente API | `openAisStream` / `openSportMovementTrackingStream` / `sportMovementTrackingActiveMap` / `aisStatus` / … en `client.js` |
| Viento API | `openMeteoWind.js` → `POST /api/wind/points` |
| Corrientes API | `openMeteoCurrents.js` → `POST /api/currents/points` |
| Olas API | `openMeteoWaves.js` → `POST /api/waves/points` |
| Proxy corrientes | `currentsProxy.service.js` + `utils/openMeteoCurrents.js` |
| HTTP corrientes | `currents.controller.js` + `currents.router.js` → `/api/currents` |
| Proxy olas | `wavesProxy.service.js` + `utils/openMeteoWaves.js` |
| HTTP olas | `waves.controller.js` + `waves.router.js` → `/api/waves` |
| Bridge AIS | `aisBridge.service.js` (+ identidad `gfwProxy.service.js`) |
| Proxy viento | `SICEN-back/src/services/windProxy.service.js` + `utils/openMeteoWind.js` |
| HTTP AIS | `ais.controller.js` + `ais.router.js` → `/api/ais` |
| HTTP viento | `wind.controller.js` + `wind.router.js` → `/api/wind` |

## Cartografía

- Mapa a **pantalla completa** (sin `Layout`/nav/footer); panel flotante **liquid glass** (`.centinela-glass`) con capas. FABs izquierda: **Inicio** → **tema** (luna/sol) → **Capas** → **zoom +/− unidos** (`.centinela-fab-zoom`, un solo bloque glass). **Sin popovers** en FABs laterales (solo `aria-label`). Panel desktop a la derecha de los FABs (`left: calc(1rem + 2.75rem + 1rem)`); sin solapa de cierre en desktop (se cierra con el FAB Capas). En mobile: drawer + solapa `.centinela-glass__collapse` y menús `z-index` 1110 por encima de FABs.
- Base según tema: CARTO Voyager (light) / `dark_all` (dark) vía `useBootstrapTheme`. Key opcional `VITE_CARTO_API_KEY` → `?key=` en la URL de tiles (quita watermark).
- Overlay seamarks: `SeamarksLayer` + tiles OpenSeaMap. En tema oscuro (`lightenLabels`), aclara **solo trazos finos** de leyendas (morfología erode/dilate para no tocar rellenos negros de boyas); rojo/verde/amarillo saturados intactos.
- Zonas: desplegable con subgrupos **Fondeo y otros servicios** (`centinelaZones.js`), **Brevets deportivos** y **Límites marítimos** (12 MN / 24 MN / ZEE vía MarineRegions). Checkbox maestro de Zonas prende/apaga los tres. Capas: `<ZonesLayer />` + `<MaritimeBoundariesLayer />`.
- **Límites marítimos:** proxy `GET /api/maritimeBoundaries?layers=12nm,24nm,eez,rdp`. Subcapas **J.E. 2 MN** / **J.E. 7 MN**: círculos 2/7 MN desde costa UY ∩ RDP; separadas por la línea Colonia–Punta Lara (`jeExclusiveJurisdiction.js`: oeste=2 MN, este=7 MN). Regenerar `build-brevet-b-strip.mjs`.
- Zonas / brevets (`ZonesLayer`): igual, solo pintura en mapa (sin popup al clic) para no bloquear medir / coords.
- Brevets deportivos (dentro de Zonas): catálogo en `centinelaBrevetCategories.js` (A–D). Categoría B: franja∪RDP∪Río Uruguay (eje OSM `rioUruguayCenterline.js` + buffer 0.85 MN hasta 30°11′44.6″S 057°38′49.4″O). Regenerar `build-brevet-b-strip.mjs`. Categoría C `portPicker`…
- Orden de capas en UI: **Posicionamiento SICEN** → Coordenadas → Seamarks OSM → **Inteligencia marítima** (por FUNCIÓN: Detecciones / Pesca / STS / Dark gaps / Posiciones AIS; fuentes Skylight+FIU+GFW+AISStream debajo) → **Zonas** (Fondeo… + Brevets). Pie del panel: **Medio marino** → **Herramientas**. Al entrar: Posicionamiento SICEN, Coordenadas y Seamarks OSM activos.
- **Inteligencia marítima:** catálogo `centinelaIntelLayers.js` + panel `CentinelaIntelLayersPanel`. No agrupar por proveedor. GFW: eventos pesca/encounters/gaps + atribución obligatoria «Powered by Global Fishing Watch» (`CentinelaGfwAttribution`, CC BY-NC 4.0). Insights GFW en dossier del buque.
- **Skylight / FIU:** siguen como providers detrás de los checkboxes funcionales; AOIs/frames siguen `hiddenInUi` en `skylightLayers.js`.
- **Posicionamiento SICEN:** checkbox maestro (default **on**) + línea de estado. `SicenPositioningLayer` muestra markers de movimientos `inTransit` con `tracking.active`. Snapshot `GET /api/sportMovements/tracking/active-map` + SSE `GET /api/sportMovements/tracking/stream` (proxy sin timeout en Vite, como AIS).
- **Medio marino:** toggles por botón (no checkbox en Capas), orden: Batimetría `bi-moisture`, Viento `bi-wind`, Corrientes `bi-water`, Olas `bi-tsunami`.
- **Batimetría:** `BathymetryLayer` (números coloreados de profundidad solo sobre agua). Muestras **aleatorias** (~mismo cupo que antes, tope 128 pts; prioriza agua). Datos: `POST /api/bathymetry/points` → OpenTopoData GEBCO 2020. Pane z 350.
- **Viento:** `WindLayer` (`leaflet-velocity`) + `POST /api/wind/points`. Leyenda azul/amarillo/rojo.
- **Corrientes:** `CurrentsLayer` + `POST /api/currents/points` (Open-Meteo Marine SMOC). Máscara de agua (`currentsWaterMask.js`: anillo seaward costa UY + exclusión tierra AR) aplicada al canvas cada frame — las partículas no se ven sobre tierra. Leyenda teal/verde/violeta. Pane `centinelaCurrentsPane` z 435.
- **Olas:** `WavesLayer` (`leaflet-velocity`) + `POST /api/waves/points`. **Color = Hs** (paleta sky→rojo, `maxVelocity` 4 m). Dirección = desde. `velocityScale` se ajusta con el período medio del viewport (la lib acopla color y velocidad al mismo campo). Máscara de agua. Pane `centinelaWavesPane` z 430. Hs+período+dir en popup.
- **Leyendas ambientales:** un solo panel `CentinelaEnvLegendsPanel` en `.centinela-env-legends` (centro inferior; **34.375rem** en desktop, **ancho completo** ≤1024px). Selector único de pronóstico (`CentinelaEnvForecastSelector`) arriba del panel cuando hay viento/corrientes/olas activos; estado compartido `envForecastHours` en `CentinelaPage`. Título de unidad y swatches en la misma fila (`centinela-wind-legend__body`). Atribución **GEBCO 2020** vía `CentinelaGebcoAttribution` en el control nativo de Leaflet cuando batimetría está on. Atribución **Windward vía FIU SRH LAC IUU** (+ Dashboard, Jack Gordon Institute, Daitrix, UF Geomatics) vía `CentinelaFiuIuuAttribution` cuando hay capas IUU LAC activas.
- Grilla: `GraticuleLayer` + checkbox; click en el mapa → `MapClickCoords` (popup con lat/lon + env si capas activas). **Coordenadas visibles siempre en DMS** (`geoDms.js`; skill `geo-dms-format`).
- **Escala / cursor:** `MapCursorScaleBar` en la esquina inferior derecha, **una sola línea** con atribuciones Leaflet. Orden: escala MN · Lat · Long (solo desktop) · referencias de mapas.
- Disclaimer en UI: no sustituye carta oficial.

### Índice de puertos (Categoría C / unidades)

- Fuente: `SPORT_PORTS` con `id`, `name`, `lat`, `lon`, `sector`, `radiusNm`, `brevetCategory: "C"`.
- Sectores: `rio-plata-superior` (20 MN) y `rio-plata-inferior` (15 MN; lista incompleta a propósito).
- Helpers front: `SPORT_PORTS_BY_ID`, `getSportPortById`, `sportPortsBySector`, `SPORT_PORT_SECTOR_LABELS`.
- Al agregar puertos: actualizar **ambos** archivos (front y back) con el mismo `id`.
- Asignación futura a unidades: guardar `id` (no el nombre libre) en `portsUnderJurisdiction`.


## Incorporaciones pendientes

Más capas (catastro), tracks históricos, correlación MMSI ↔ `vessels`, receptor AIS propio / AISHub. HC y SAR ya están activos (ver abajo). Documentado también en `README.md` → *Implementaciones pendientes* → El Centinela.

### Ayuda / Manual de usuario

- Botón `bi-book` en la columna FAB izquierda (debajo de Capas) → `CentinelaHelpModal`: modal grande con índice en acordeón y contenido navegable.
- Fuente de verdad orientada a operadores: `SICEN-front/src/content/centinela-manual-usuario.md` (import `?raw`).
- Parser liviano: `utils/centinelaHelpMarkdown.js` (`##` = sección del acordeón, `###` = subtítulo con scroll).
- Incluye secciones **Simulación HC** y **Simulación SAR** (uso, parámetros, ADD, límites).
- Callouts en el MD: líneas `> tip: …`, `> aviso: …`, `> clave: …` (también `ok` / nota). Listas numeradas `1.` con estilo de pasos.
- Estilos: `.centinela-help-modal*` en `centinela-map.css` (cabecera marina, tipografía de lectura, callouts).

### Medir distancias y radios

- Botón `bi-rulers` → panel inferior (`MeasureDistancePanel`) con herramienta Distancia/Radio, unidad km/MN, totales y acciones **Deshacer / Reiniciar / Fijar** (misma fila, mismo ancho).
- **Fijar:** el panel **sigue abierto** (no se pierde el total). Desactiva nuevos clicks (`active = measureOn && !measurePinned`). Volver a tocar Fijar suelta y permite seguir midiendo.
- **Edición al fijar:** handles `L.marker` draggables sobre vértices y bordes de radio; al arrastrar se recalculan distancias/radios en vivo. Sin plugins (Leaflet nativo).
- **Distancia:** clicks → tramos con etiqueta `10.56 MN @ 254°`.
- **Radio:** centro = último punto (o 1er click) → click de borde fija `L.circle` + radio.
- Tras un radio, el siguiente tramo de distancia sale del **centro** pero resta el radio (`max(0, dist − R)`), midiendo desde el perímetro.
- Capa: `MeasureDistanceLayer` (`active` + `pinned`) + `utils/geoMeasure.js`. Mientras mide (`active`), se desactiva el popup de coordenadas.

### Ir al punto (Go-to)

- Botón `bi-geo-alt` en **Herramientas** → flotante `GoToPointPanel` (Lat/Long en DMS tipado). Toggle: segundo click en el ícono cierra (sin título ni X).
- Filas: etiqueta + input + hemi en la misma línea (`Latitud` / `Longitud` alineados con el input).
- Inputs enmascaran dígitos → `° ′ ″` (`formatDmsDigitsInput`); long con 3 cifras de grados (`056°`). Toggle N/S y E/O al estilo horizonte de pronóstico.
- **Ir al punto:** valida con `parseDmsDigits` + hemi, cierra el panel, `flyTo` y abre el mismo popup que el click en el mapa (`openMapCoordsPopup`: coords + viento/corrientes/olas/batimetría según capas activas).

### Mis marcadores (personales)

- Botón `bi-bookmark-star` en **Herramientas** → muestra/oculta capa `UserMarkersLayer` y habilita FAB de lista (panel empieza **cerrado**).
- Popup de coords: botón **Agregar marcador** → evento `centinela:add-marker` → `MarkerFormModal` (DMS tipado, nombre, paleta de color, acordeón de [Material Symbols](https://fonts.google.com/icons) wght 400 / opsz 24).
- Panel `UserMarkersPanel`: **Nuevo marcador**, lista con editar/borrar (`confirmDelete`) / flyTo.
- Persistencia: colección `mapMarkers` ligada a `userId`; API `guarded` `/api/mapMarkers`. Catálogo whitelist en `centinelaMarkerIcons.js` (front) y `mapMarkerCatalog.js` (back).

### Simular incidente de hidrocarburo (HC)

- Botón `bi-droplet-half` en **Herramientas** → panel `HcSpillPanel` + capa `HcSpillLayer`.
- Worker Python **`SICEN-sim/`** (FastAPI `:8091`): motor Lagrangian NOAA-like (MVP) u OpenDrift/OpenOil si está instalado (`SICEN_SIM_ENGINE=auto|lagrangian|opendrift`).
- Forzado: Open-Meteo forecast + marine en grilla horaria (`app/forcing.py`) + landmask simplificado RDP.
- Backend Node: `POST /api/hc/simulate` (202 + jobId), `GET /api/hc/jobs/:id`, `GET /api/hc/status` (`...guarded`). Env: `HC_SIM_ENABLED`, `HC_SIM_URL`, `HC_SIM_TIMEOUT_MS`.
- Catálogo curado: `diesel`, `ifo180`, `crude_light`, `crude_heavy`.
- Salida: timesteps GeoJSON + contorno + oil budget. Disclaimer en UI y manual de usuario.
- Spike: `SICEN-sim/scripts/spike_openoil.py` (forzado constante; masa contabilizada ≈ liberada).
- Arranque local: ver `SICEN-sim/README.md`.

### Pronosticar deriva de objeto (SAR)

- Botón `bi-compass` en **Herramientas** → `SarDriftPanel` + `SarDriftLayer` (nube ámbar/azul; pane dedicado). Exclusión mutua razonable con HC (abrir uno cierra el otro).
- Mismo worker **`SICEN-sim/`** (`POST /run-sar`, `GET /sar-objects`). Motor: OpenDrift **Leeway** si `SICEN_SIM_ENGINE=auto|opendrift` e instalado; si no, **Lagrangian leeway-like** (`leeway_engine.py`) con coeficientes del catálogo `sar_objects.py` (OBJECTPROP-like).
- Catálogo: `piw_unknown`, `piw_pfd`, `piw_deceased_surface`, `piw_deceased_submerged`, `kayak`, `liferaft`, `small_boat`, `fishing_vessel`.
- Inputs: LKP (DMS o pick en mapa), `startTime`, `objectTypeId`, `uncertaintyRadiusM` (default 500), `horizonHours` 6/12/24/48, `numParticles`.
- **ADD (fase 2):** solo `piw_deceased_submerged` — acumula °C·día con SST del forzado; umbral ~100 (banda 80–140); sin puntos en superficie hasta flotar; luego leeway de fallecido flotando. Sin corriente 3D de fondo. Casos hundidos forzados a Lagrangian.
- Backend Node: `POST /api/sar/simulate`, `GET /api/sar/jobs/:id`, `GET /api/sar/status` (`...guarded`). Env: `SAR_SIM_ENABLED` + mismo `HC_SIM_URL` (puerto 8091).
- Front API: `sarSimStatus` / `sarSimStart` / `sarSimJob` en `client.js`.
- Spike: `SICEN-sim/scripts/spike_leeway.py`.
- Disclaimer: apoyo a la búsqueda, no ubicación certe ni doctrina IAMSAR. Manual + skill + `SICEN-sim/README.md`.

## AIS

1. **Keys nunca van al front.** `AIS_STREAM_API_KEY` y/o `SKYLIGHT_API_KEY` en `.env.*`.
2. Bridge unificado `aisBridge.service.js`: store MMSI → buque + fan-out SSE. Fuentes:
   - **AISStream** (WebSocket en vivo, Class A/B, bbox `AIS_BBOX` o default Río de la Plata).
   - **Skylight last-known** (`searchLastKnownPositions` vía `skylightProxy`, poll ~90 s) + enriquecimiento de identidad (`getVesselHistory`, cache MMSI).
3. Merge: si AISStream actualizó hace &lt; 5 min, Skylight **no pisa** posición/cinemática; solo rellena nombre/OMI/indicativo. Preferir `positionSource: aisstream|skylight`.
4. Fan-out: **SSE** `GET /api/ais/stream` con `...guarded` (Bearer). Front: `fetch` + ReadableStream (`openAisStream`), no `EventSource`.
5. Eventos SSE: `status`, `snapshot`, `update`, `remove`. Status incluye `sources: { aisstream, aisstreamConnected, skylight, skylightOk, … }`.
6. `warmAisBridge()` al arrancar: conecta AISStream si hay key y arranca poll Skylight si hay `SKYLIGHT_API_KEY` (independientes).
7. **UI:** desplegable tipo Skylight/FIU (`aisLayers.js`): maestro + **AISStream (en vivo)** + **Skylight (última conocida)**. Filtra markers en front (`filterVesselsByAisSources`); el SSE sigue unificado. Flechas orientadas a `heading ?? cog` (`AisVesselLayer`). Detalle: fuente, antigüedad, clase AIS; sin destino/ETA. Identidad OMI enriquecida vía Skylight y/o **GFW** (`sources.gfw` → “Identidad: Global Fishing Watch”).
8. **GFW (identidad):** token `GFW_API_TOKEN` (Bearer, uso no comercial). Proxy `gfwProxy.service.js` → `GET /v3/vessels/search?query={mmsi}&datasets[0]=public-global-vessel-identity:latest` (**obligatorio** `datasets[0]=`; con `datasets=` GFW responde 403). Solo rellena OMI/nombre/indicativo/bandera (no posiciones). Poll identidad ~90 s junto a Skylight. Cache MMSI (TTL `GFW_IDENTITY_CACHE_TTL_MS`, default 7 d; negativos 6 h). Tras 401/403: cooldown 30 min + un solo warning (no spam por MMSI).
9. Sin ninguna key de posición: el mapa funciona; la capa AIS muestra aviso de no configurado.
10. **Cobertura:** AISStream libre suele fallar en Montevideo; Skylight refuerza last-known en el bbox. Para AIS local real: receptor propio / AISHub al mismo `upsertVessel`.
11. Fuentes futuras (NMEA / AISHub) → mismo store, sin cambiar el contrato del front.

## Skylight (proxy)

1. **La API key nunca va al front.** Solo `SKYLIGHT_API_KEY` → `env.skylightApiKey`.
2. Upstream GraphQL: `https://api.skylight.earth/graphql` con `Authorization: Bearer`.
3. Front: `skylightFetchEvents` → `POST /api/skylight/events` (`...guarded`). Body: `{ eventTypes, darkOnly, lookbackHours, limit }`.
4. Bbox espacial = `SKYLIGHT_BBOX` (fallback `AIS_BBOX` → default Uruguay/Río de la Plata/Atlántico `-38.5,-61.0,-30.5,-50.5`). Cache TTL `SKYLIGHT_CACHE_TTL_MS` (default 5 min).
5. Capas UI en `skylightLayers.js`; mapa `SkylightEventsLayer` + `SkylightFramesLayer`; lista viewport `SkylightEventsList`.
6. Pesca/STS: Polyline si `end` ≠ `start`.
7. **AOIs:** lógica lista (`POST /aois`, match con `CENTINELA_ZONES`, eventos `aoi_visit`/`speed_range`) pero checkboxes **ocultos** (`hiddenInUi: true`) hasta tener AOIs cargados en la cuenta Skylight. Para reactivar: quitar `hiddenInUi` en `skylightLayers.js`.
8. **Frames:** lógica lista (`POST /frames` → polígonos con conteos correlated/uncorrelated) pero checkbox **oculto** (`hiddenInUi: true`). Para reactivar: quitar `hiddenInUi` en `satellite_frames` en `skylightLayers.js`.
9. **v4 — dossier + cruce AIS:** clic en buque AIS (o botón «Historial / predicción» en popup Skylight) → `POST /api/skylight/vessel-dossier` (+ insights GFW). Panel `SkylightVesselDossierPanel` (misma cáscara que Eventos; X minimiza a FAB `bi-clock-history`). En desktop el panel **siempre** usa `--float-beside-fab` (`right: calc(1rem + 2.75rem + 1rem)`) para quedar a la izquierda de la columna de FABs con 1rem de margen. Cruce visual por MMSI: markers violeta, `SkylightAisCrossLinks`, badge «Cruce AIS/Skylight».
10. Sin key: HTTP 503; el mapa sigue funcionando.
11. Coordenadas siempre DMS (`geo-dms-format`).

## IUU LAC / FIU (proxy)

1. **Sin API key de terceros.** FeatureServers públicos ArcGIS del org FIU SRH (`pnYK7hEZV7vyJWwQ`).
2. Front: `fiuIuuFetchEvents` → `POST /api/fiuIuu/events` (`...guarded`). Body: `{ layerTypes: ["fishing"|"dark"|"sts"], bbox?, limit? }`.
3. Bbox: viewport del mapa (si viene) → `FIU_IUU_BBOX` → `AIS_BBOX` → default LAC. Cache `FIU_IUU_CACHE_TTL_MS` (default 5 min). **No** guardar eventos en Mongo.
4. Capas UI en `fiuIuuLayers.js`; mapa `FiuIuuEventsLayer`; atribución `CentinelaFiuIuuAttribution`.
5. Marco legal: uso no comercial / analítico (metodología FIU); datos Windward vía FIU; disclaimer + links dashboard/metodología en UI.
6. Coordenadas siempre DMS (`geo-dms-format`).

## Viento (proxy)

1. **El front no llama Open-Meteo directo.** Usar `windFetchPoints` → `POST /api/wind/points` con `...guarded`.
2. Body: `{ points: [{ lat, lon }], forecastHoursOffset }` (0 | 3 | 6 | 12 | 24). Máx. 64 puntos.
3. Cache en memoria por clave `offset:lat,lon` (2 decimales). TTL `WIND_CACHE_TTL_MS` (default 10 min).
4. Respuesta: `{ ok, points, cacheHits, cacheMisses, forecastHoursOffset, source }`.
5. Simuladores HC/SAR: forzado ambiental propio en el worker `SICEN-sim` (`forcing.py` / Open-Meteo); los proxies `/api/wind|currents|waves` siguen para las capas visuales del mapa.

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
