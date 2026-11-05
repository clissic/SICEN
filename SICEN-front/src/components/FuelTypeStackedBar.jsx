import { stackedBarPercents } from "../utils/stackedBarPercents.js";

const INSIDE_LABEL_MIN_PERCENT = 12;

function formatPercent(n) {
  return `${n.toFixed(1)}%`;
}

/**
 * Barra apilada 100 %: el porcentaje va DENTRO de cada segmento.
 * Si el tramo es chico, se oculta la cifra y queda el popover.
 */
export function FuelTypeStackedBar({ items, formatValue }) {
  const rows = stackedBarPercents(items, {
    minLabelPercent: INSIDE_LABEL_MIN_PERCENT,
  });
  if (!rows.length) return null;

  const summary = rows
    .map((row) => `${row.label} ${formatPercent(row.percent)}`)
    .join(", ");

  return (
    <div
      className="empre-fuel-mix"
      role="img"
      aria-label={`Consumo por tipo de combustible: ${summary}`}
    >
      <div className="empre-fuel-mix__track">
        {rows.map((row) => {
          const valueLabel =
            typeof formatValue === "function" ? formatValue(row.value) : "";
          const tip = valueLabel
            ? `${row.label} · ${formatPercent(row.percent)} · ${valueLabel}`
            : `${row.label} · ${formatPercent(row.percent)}`;
          return (
            <div
              key={row.key}
              className={[
                "empre-fuel-mix__seg",
                `empre-fuel-mix__seg--${row.key}`,
                row.showLabel ? "" : "is-compact",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ flex: `0 0 ${row.percent}%` }}
              data-sicen-popover={tip}
              data-sicen-popover-placement="top"
            >
              {row.showLabel ? formatPercent(row.percent) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
