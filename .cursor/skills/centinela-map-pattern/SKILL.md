---
name: centinela-map-pattern
description: >-
  Mapa interactivo de El Centinela (Leaflet + OpenSeaMap seamarks + capas
  conmutables + bridge AIS autenticado). Usar al tocar `/centinela`,
  CentinelaPage, AisVesselLayer, useAisVessels, /api/ais o la fuente AISStream.
---

# El Centinela — mapa y capas

## Piezas

| Pieza | Path |
|---|---|
| Página | `SICEN-front/src/pages/CentinelaPage.jsx` |
| Estilos | `SICEN-front/src/styles/centinela-map.css` |
| Capa AIS UI | `SICEN-front/src/components/centinela/AisVesselLayer.jsx` |
| Seamarks | `SICEN-front/src/components/centinela/SeamarksLayer.jsx` (add/remove imperativo + `overlayPane`) |
| Zonas | `centinelaZones.js` + `ZonesLayer.jsx` (polígonos Leaflet) |
| Grilla | `GraticuleLayer.jsx` (lat/lon, paso según zoom) |
| Click coords | `MapClickCoords.jsx` (popup lat/lon al click) |
| Hook stream | `SICEN-front/src/hooks/useAisVessels.js` |
| Cliente API | `openAisStream` / `aisStatus` / `aisVessels` en `client.js` |
| Bridge | `SICEN-back/src/services/aisBridge.service.js` |
| HTTP | `ais.controller.js` + `ais.router.js` → `/api/ais` |

## Cartografía

- Mapa a **pantalla completa** (sin `Layout`/nav/footer); panel flotante **liquid glass** (`.centinela-glass`) con capas, tema e Inicio.
- Base según tema: CARTO Voyager (light) / `dark_all` (dark) vía `useBootstrapTheme`.
- Overlay seamarks: `SeamarksLayer` + tiles OpenSeaMap.
- Zonas: catálogo en `centinelaZones.js`; fila con checkbox maestro (todas on/off, indeterminate si parcial) + desplegable por zona (`zoneVisibility`); `<ZonesLayer zones={visibleZones} />`.
- Orden de capas en UI: Grilla (coordenadas) → Seamarks OSM → AIS (experimental) → Zonas.
- Grilla: `GraticuleLayer` + checkbox; click en el mapa → `MapClickCoords` (popup con lat/lon).
- Disclaimer en UI: no sustituye carta oficial.

## AIS

1. **La API key nunca va al front.** Solo `AIS_STREAM_API_KEY` en `.env.*` → `env.aisStreamApiKey`.
2. Upstream: WebSocket AISStream (`ws` + `perMessageDeflate`) con bbox (`AIS_BBOX` o default Río de la Plata). Incluir Class A y Class B. `warmAisBridge()` al arrancar mantiene cache caliente.
3. Fan-out a clientes: **SSE** `GET /api/ais/stream` con `...guarded` (Bearer). El front usa `fetch` + ReadableStream (`openAisStream`), no `EventSource`.
4. Eventos SSE: `status`, `snapshot`, `update`, `remove`.
5. Sin key: el mapa funciona; la capa AIS muestra aviso de no configurado.
6. **Cobertura:** AISStream libre suele tener receptores en BA y casi ninguno en Montevideo; para AIS local real hace falta receptor propio / AISHub.
7. Fuentes futuras (receptor NMEA / AISHub) deben alimentar el mismo store/`upsertVessel` del bridge, sin cambiar el contrato del front.

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
