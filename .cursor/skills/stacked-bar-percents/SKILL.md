---
name: stacked-bar-percents
description: >-
  Porcentajes a 1 decimal para barras apiladas al 100% en SICEN-front
  (resto mayor, etiquetas en el segmento, tramos chicos ocultos + popover).
  Usar al tocar la barra de mezcla de combustibles en Gestión de patrullas
  EMPRE, o cualquier barra apilada de composición cuyo % deba sumar ~100%.
---

# Barras apiladas con porcentajes al 100%

Helper: `SICEN-front/src/utils/stackedBarPercents.js`.

Ejemplo vivo: estadísticas **Combustibles** de Gestión de patrullas
(EMPRE / P3) en
`/mi-unidad/p3-planes-y-operaciones/control-de-fronteras/gestion-de-patrullas`
(`BorderPatrolFuelStats`, barra `MonthFuelMix`).

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
menor a `minLabelPercent` (default **8**; en la barra de mezcla se usa
**10** porque la cifra va adentro del tramo).

## Reglas

1. **Cifra DENTRO del segmento** de color, centrada. Mismo `flex-basis`
   que el tramo.
2. **Segmentos chicos:** no apilar cifras. Ocultar el texto y dejar el
   dato en `data-sicen-popover` (skill `popover-pattern`). En tramos
   compactos, `data-sicen-popover-touch="click"` para mobile. No usar
   `title` nativo.
3. **Estilo:** no inventar paleta. Reusar `PATROL_FUEL_BAR_COLORS` y
   `.empre-fuel-mix` de `mi-unidad.css`. Super 95 (fondo claro) lleva
   `is-light` para el texto oscuro.
4. **Datos reales:** los litros salen de patrullas **cumplidas**
   (`fulfillment.fuel`) vía `buildFuelStats` / `fuelMixItems`. No
   hardcodear volúmenes.
5. **Cálculo:** no usar `toFixed` suelto por segmento (puede sumar
   99.9 o 100.1). Siempre `roundPercentsToOneDecimal`.
6. Test del cálculo en `stackedBarPercents.test.js` si se toca la
   fórmula.

## Template

```jsx
const rows = stackedBarPercents(fuelMixItems(byFuel), {
  minLabelPercent: 10,
});

<div className="empre-fuel-mix" role="img" aria-label={summary}>
  {rows.map((row) => (
    <span
      key={row.key}
      className={`empre-fuel-mix__seg${
        row.key === "nafta-super" ? " is-light" : ""
      }${row.showLabel ? "" : " is-compact"}`}
      style={{
        flex: `0 0 ${row.percent}%`,
        background: PATROL_FUEL_BAR_COLORS[row.key] || "#6c757d",
      }}
      data-sicen-popover={`${row.label} · ${row.percent.toFixed(1)}%`}
      data-sicen-popover-placement="top"
    >
      {row.showLabel ? `${row.percent.toFixed(1)}%` : null}
    </span>
  ))}
</div>
```

## Ejemplo vivo

- `SICEN-front/src/components/borderPatrol/BorderPatrolFuelStats.jsx`
  (`MonthFuelMix` + `fuelMixItems`)
- Estilos `.empre-fuel-mix*` en `mi-unidad.css`
- Datos: `GET /api/borderPatrols?year=` → patrullas cumplidas
