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
| Estado | `mapDetail` + `openMapDetail` / `closeMapDetail` en `CentinelaPage.jsx` |
| Estilos | `.centinela-detail-window*` en `centinela-map.css` |

## Contrato

```js
openMapDetail({
  id: "ais:701000000",      // estable por selección
  title: "Nombre o tipo",   // header de la ventana
  body: <AlgunDetailBody />, // ReactNode con los mismos datos que el popup viejo
});
```

Las capas **no** montan `<Popup>` de react-leaflet. En el `click` llaman `onOpenDetail(...)`.

## Reglas

1. **Ventana arrastrable** solo para **datos de buques**: AIS, eventos Skylight de detección/comportamiento, Posicionamiento SICEN, predicción del dossier.
2. **Popup Leaflet anclado al punto** para el resto: click en mapa (coords + viento/corrientes/olas/batimetría), labels de batimetría, zonas/brevets, pasadas satelitales (frames).
3. Al abrir la ventana de buque: **cerrar cualquier popup** Leaflet (`map.closePopup`) y **frenar la propagación** del click para que no se abra el popup de coordenadas.
4. La ventana es `position: fixed` y se arrastra por el header; Escape o X cierran.
5. Un solo detalle de buque a la vez: abrir otro reemplaza el actual.
6. El título del body interno se oculta por CSS; el título visible es el del header.

## Antipatrones

- Usar `CentinelaDetailWindow` para coords / viento / batimetría / zonas / frames.
- Volver a usar `<Popup>` anclado para buques AIS / Skylight / SICEN.
- Abrir ventana y popup del mismo clic de buque.

## Ejemplos vivos

**Ventana arrastrable (buques):**
- `AisVesselLayer` + `AisVesselDetailBody`
- `SkylightEventsLayer` + `SkylightEventDetailBody`
- `SicenPositioningLayer`, `SkylightVesselTrackLayer` (predicción)

**Popup anclado al punto:**
- `MapClickCoords`, `BathymetryLayer`, `ZonesLayer`, `SkylightFramesLayer`
