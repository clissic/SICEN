---
name: stacked-bar-percents
description: >-
  Porcentajes a 1 decimal para barras apiladas al 100% en SICEN-front
  (resto mayor, etiquetas en el segmento, tramos chicos ocultos + popover).
  Usar al tocar la barra de combustibles de P3 EMPRE, o cualquier barra
  apilada de composición cuyo % deba sumar ~100%.
---

# Barras apiladas con porcentajes al 100%

Helper: `SICEN-front/src/utils/stackedBarPercents.js`.

Ejemplo vivo: estadísticas **Combustible** de P3 (Estado Mayor / EMPRE)
en `/mi-unidad/p3-planes-y-operaciones` (`EmpreFuelStats` +
`FuelTypeStackedBar`).

## Helper

```js
import {
  roundPercentsToOneDecimal,
  stackedBarPercents,
} from "../utils/stackedBarPercents.js";

roundPercentsToOneDecimal([1, 1, 1]); // [33.4, 33.3, 33.3]
```

`stackedBarPercents` omite ceros, redondea a **1 decimal** con resto
mayor (suma **100.0**) y marca `showLabel: false` si el segmento es
menor a `minLabelPercent` (default **8**; en la barra de P3 se usa **12**
porque la cifra va adentro del tramo).

## Reglas

1. **Cifra DENTRO del segmento** de color, centrada. Mismo `flex-basis`
   que el tramo.
2. **Segmentos chicos:** no apilar cifras. Ocultar el texto y dejar el
   dato en `data-sicen-popover` (skill `popover-pattern`). No usar
   `title` nativo.
3. **Estilo P3:** bloque oscuro (`#2b3035` / `#1c2126` en dark), paleta
   apagada, barra fina. Leyenda de tipos debajo.
4. **Cálculo:** no usar `toFixed` suelto por segmento (puede sumar
   99.9 o 100.1). Siempre `roundPercentsToOneDecimal`.
5. Test del cálculo en `stackedBarPercents.test.js` si se toca la
   fórmula.

## Template

```jsx
<div className="empre-fuel-mix" role="img" aria-label={summary}>
  <div className="empre-fuel-mix__track">
    {rows.map((row) => (
      <div
        key={row.key}
        className={`empre-fuel-mix__seg empre-fuel-mix__seg--${row.key}${
          row.showLabel ? "" : " is-compact"
        }`}
        style={{ flex: `0 0 ${row.percent}%` }}
        data-sicen-popover={`${row.label} · ${row.percent.toFixed(1)}%`}
        data-sicen-popover-placement="top"
      >
        {row.showLabel ? `${row.percent.toFixed(1)}%` : null}
      </div>
    ))}
  </div>
</div>
```

## Ejemplo vivo

- `SICEN-front/src/components/FuelTypeStackedBar.jsx`
- `SICEN-front/src/components/EmpreFuelStats.jsx`
- `SICEN-front/src/pages/MiUnidadEmpreDivisionPage.jsx` (solo slug `p3-planes-y-operaciones`)
- Estilos `.empre-fuel-*` en `mi-unidad.css`
