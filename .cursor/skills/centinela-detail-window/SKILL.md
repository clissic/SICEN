---
name: centinela-detail-window
description: >-
  Ventana fija arrastrable de detalle en El Centinela (reemplaza popups
  Leaflet anclados al mapa). Usar al agregar o tocar selección de un dato
  del mapa (AIS, Skylight, SICEN, zonas, frames, coords, batimetría) o
  CentinelaDetailWindow / openMapDetail.
---

# Ventana de detalle fija (El Centinela)

## Pieza

| Pieza | Path |
|---|---|
| Ventana | `SICEN-front/src/components/centinela/CentinelaDetailWindow.jsx` |
| Estado | `mapDetails[]` + `focusedDetailId` + `openMapDetail` / `closeMapDetail(id)` / `focusMapDetail` en `CentinelaPage.jsx` |
| Estilos | `.centinela-detail-window*` en `centinela-map.css` (`is-focused` / `is-dimmed`) |

## Contrato

```js
openMapDetail({
  id: "ais:701000000",      // estable por selección (upsert: no reemplaza otras ventanas)
  title: "Nombre o tipo",   // header de la ventana
  body: <AlgunDetailBody />, // ReactNode con los mismos datos que el popup viejo
  anchor: { x, y },         // clientX/clientY del click (ventana arriba del punto)
});
```

Las capas **no** montan `<Popup>` de react-leaflet. En el `click` llaman `onOpenDetail(...)` con `anchor` desde el evento (`clientX`/`clientY`) o, si abren por selección programática, `clientAnchorFromMapLatLng(map, lat, lon)`.

## Reglas

1. **Ventana arrastrable** solo para **datos de buques**: AIS, eventos Skylight de detección/comportamiento, Posicionamiento SICEN, predicción del dossier.
2. **Popup Leaflet anclado al punto** para el resto: click en mapa (coords + viento/corrientes/olas/batimetría), labels de batimetría, zonas/brevets, pasadas satelitales (frames).
3. Al abrir la ventana de buque: **cerrar cualquier popup** Leaflet (`map.closePopup`) y **frenar la propagación** del click con `stopLeafletMapClick` (`bubblingMouseEvents={false}` + `originalEvent._stopped`) para que no se abra el cartel de coordenadas. `MapClickCoords` también ignora clicks sobre `.leaflet-interactive` / markers.
4. La ventana es `position: fixed` y se arrastra por el header; Escape cierra **solo la enfocada**; X cierra esa instancia.
5. **Varias ventanas a la vez:** abrir otro buque **no cierra** la anterior; la nueva toma el foco (`focusedDetailId`) y las demás quedan `is-dimmed`. Click / drag en una ventana la enfoca. z-index fijo: dimmed `5000`, focused `5010` (por encima de FABs/menús); no se incrementa.
5b. Al cerrar una ficha `ais:MMSI`, se elimina también la sesión de Historial / predicción de ese MMSI (`vesselDossiers`).
5c. Si el buque tiene color de historial (`vesselDossiers[].color`), la ventana recibe `accentColor` (borde del color del trazo).
5d. Enfocar una ficha de detalle quita el foco de herramientas del dock (`focusedToolId = null`) y viceversa.
6. El título del body interno se oculta por CSS; el título visible es el del header.
7. Al abrir, la ventana se **centra horizontalmente y queda arriba** del `anchor`, con stagger leve si hay varias (`staggerIndex`). Helpers: `positionAboveAnchor`, `clientAnchorFromLeafletEvent`, `clientAnchorFromMapLatLng`.

## Antipatrones

- Usar `CentinelaDetailWindow` para coords / viento / batimetría / zonas / frames.
- Volver a usar `<Popup>` anclado para buques AIS / Skylight / SICEN.
- Abrir ventana y popup del mismo clic de buque.
- Reemplazar todo `mapDetails` al abrir un buque nuevo (rompe multi-ficha).

## Ejemplos vivos

**Ventana arrastrable (buques):**
- `AisVesselLayer` + `AisVesselDetailBody`
- `SkylightEventsLayer` + `SkylightEventDetailBody` (+ chip `SkylightDetectionImage` si hay `details.imageUrl`)
- `SicenPositioningLayer`, `SkylightVesselTrackLayer` (predicción)

**Popup anclado al punto:**
- `MapClickCoords`, `BathymetryLayer`, `ZonesLayer`, `SkylightFramesLayer`
