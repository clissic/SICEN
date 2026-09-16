---
name: geo-dms-format
description: >-
  Formato DMS (grados, minutos y segundos de arco) para latitud y longitud en
  SICEN (UI, emails, popups de mapa). Usar siempre que se muestre al usuario una
  coordenada geográfica; nunca grados decimales en pantalla o correos.
---

# Coordenadas geográficas — formato DMS

## Helper obligatorio

| Entorno | Archivo |
|---|---|
| Front | `SICEN-front/src/utils/geoDms.js` |
| Back (emails, plantillas) | `SICEN-back/src/utils/geoDms.js` |

```js
import {
  formatCoordDms,
  formatCoordDm,
  formatCoordPairLabel,
  parseCoordDms,
  formatDmsDigitsInput,
  parseDmsDigits,
} from "../utils/geoDms.js";

formatCoordDms(-34.8954, "lat");   // → 34° 53′ 43.4″ S
formatCoordDms(-56.1901, "lng");   // → 056° 11′ 24.4″ O
formatCoordDm(-34.5, "lat");       // → 34° 30′ S  (graticule)
formatCoordDm(-56.5, "lng");       // → 056° 30′ O

formatCoordPairLabel(lat, lng);    // → Lat. … · Long. …

parseCoordDms("34° 53′ 43.4″ S", "lat"); // → -34.895...
parseCoordDms("56 11 24.4 O", "lng");    // → -56.190...

// Entrada tipada (Ir al punto): solo dígitos + hemi aparte
formatDmsDigitsInput("3453434", "lat"); // → 34° 53′ 43.4″
parseDmsDigits("05611244", "lng", "O"); // → -56.190...
```

## Reglas

1. **Nunca** mostrar lat/lng al usuario como grados decimales (`toFixed`, `34.89°`, etc.).
2. Hemisferios: lat **N/S**, long **E/O** (oeste rioplatense = **O**).
3. Segundos con **1 decimal**; minutos con **2 dígitos** (`padStart(2, "0")`).
4. Grados: lat **2** cifras; long **3** cifras con cero a la izquierda si &lt; 100 (`056°`).
5. Valor inválido → `—` (formato) o `null` (`parseCoordDms` / `parseDmsDigits`).
6. En BD y APIs se siguen guardando/enviando **números decimales**; solo la **presentación** (y el ingreso tipado) es DMS.
7. Popups de Centinela, tracking GPS, tablas de historial y emails usan **`formatCoordDms`**.
8. Graticule de El Centinela (`GraticuleLayer`): etiquetas con **`formatCoordDm`** (solo grados + minutos).
9. Texto libre → **`parseCoordDms(text, "lat"|"lng")`**. Entrada enmascarada → **`parseDmsDigits(digits, kind, hemi)`** + toggle hemi (N/S · E/O).

## Entrada tipada (Ir al punto)

- Estado: string de **solo dígitos** + hemisferio elegido (default lat **S**, long **O**).
- Display: `formatDmsDigitsInput` inserta `° ′ ″` según cantidad de dígitos. **No** rellenar grados con ceros hasta completar 2 (lat) / 3 (long); recién ahí se cierra el campo de grados y se puede pasar a minutos (con pad `056°` si aplica).
- Lat máx. 7 dígitos (GG+MM+SS+d); long máx. 8 (GGG+MM+SS+d).
- Toggle horizontal estilo `.centinela-goto-panel__hemi` (mismo look que horizonte de pronóstico).
- Validar al submit: min/seg &lt; 60; lat ≤ 90; lng ≤ 180.

## Antipatrones

- Duplicar `formatCoord` local con `toFixed`.
- Línea extra con decimales “por las dudas” debajo del DMS.
- Formatear en el template HTML sin pasar por `formatCoordDms`.
- Meter el hemisferio dentro del input tipado (va en el toggle).

## Ejemplos vivos

- `SicenPositioningLayer.jsx` (popup Posicionamiento SICEN)
- `SportMovementPositionHistoryModal.jsx` (tabla historial)
- `MapClickCoords.jsx` / `openMapCoordsPopup`, `GraticuleLayer.jsx`, `AisVesselLayer.jsx`, `MapCursorScaleBar.jsx`, `GoToPointPanel.jsx`
- `sportMovementTrackingEmails.service.js` + `emailTemplates.js` (sin señal 5 min)
