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
import { formatCoordDms, formatCoordPairLabel } from "../utils/geoDms.js";

formatCoordDms(-34.8954, "lat");   // → 34° 53′ 43.4″ S
formatCoordDms(-56.1901, "lng");   // → 56° 11′ 24.4″ O

formatCoordPairLabel(lat, lng);    // → Lat. … · Long. …
```

## Reglas

1. **Nunca** mostrar lat/lng al usuario como grados decimales (`toFixed`, `34.89°`, etc.).
2. Hemisferios: lat **N/S**, long **E/O** (oeste rioplatense = **O**).
3. Segundos con **1 decimal**; minutos con **2 dígitos** (`padStart(2, "0")`).
4. Valor inválido → `—`.
5. En BD y APIs se siguen guardando/enviando **números decimales**; solo la **presentación** es DMS.
6. Grillas, popups de Centinela, tracking GPS, tablas de historial y emails usan el mismo helper.

## Antipatrones

- Duplicar `formatCoord` local con `toFixed`.
- Línea extra con decimales “por las dudas” debajo del DMS.
- Formatear en el template HTML sin pasar por `formatCoordDms`.

## Ejemplos vivos

- `SicenPositioningLayer.jsx` (popup Posicionamiento SICEN)
- `SportMovementPositionHistoryModal.jsx` (tabla historial)
- `MapClickCoords.jsx`, `GraticuleLayer.jsx`, `AisVesselLayer.jsx`
- `sportMovementTrackingEmails.service.js` + `emailTemplates.js` (sin señal 5 min)
