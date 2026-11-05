/**
 * Porcentajes a 1 decimal para una barra apilada al 100%.
 *
 * Usa el método del resto mayor (Hare–Niemeyer) sobre décimas, para que
 * la suma sea exactamente 100.0 salvo total nulo.
 */

export const DEFAULT_MIN_LABEL_PERCENT = 8;

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {{ key?: string, label?: string, value: number }[] | number[]} items
 * @returns {number[]}
 */
function valuesOf(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) =>
    typeof item === "number" || typeof item === "string"
      ? toFiniteNumber(item)
      : toFiniteNumber(item?.value)
  );
}

/**
 * Redondea una lista de valores a porcentajes de 1 decimal que suman 100.0.
 * Los ceros y negativos no entran al total (aportan 0).
 *
 * @param {number[]} values
 * @returns {number[]}
 */
export function roundPercentsToOneDecimal(values) {
  const nums = Array.isArray(values) ? values.map(toFiniteNumber) : [];
  const weights = nums.map((n) => (n > 0 ? n : 0));
  const total = weights.reduce((sum, n) => sum + n, 0);
  if (!(total > 0)) return nums.map(() => 0);

  const exactTenths = weights.map((n) => (n / total) * 1000);
  const floors = exactTenths.map((t) => Math.floor(t + 1e-9));
  let leftover = 1000 - floors.reduce((sum, n) => sum + n, 0);

  const order = exactTenths
    .map((t, i) => ({ i, frac: t - floors[i], weight: weights[i] }))
    .filter((row) => row.weight > 0)
    .sort((a, b) => b.frac - a.frac || b.weight - a.weight || a.i - b.i);

  if (leftover > 0) {
    for (let k = 0; k < leftover && k < order.length; k += 1) {
      floors[order[k].i] += 1;
    }
  } else if (leftover < 0) {
    const take = order.slice().reverse();
    for (let k = 0; k < -leftover && k < take.length; k += 1) {
      if (floors[take[k].i] > 0) floors[take[k].i] -= 1;
    }
  }

  return floors.map((t, i) => (weights[i] > 0 ? t / 10 : 0));
}

/**
 * @param {{ key: string, label: string, value: number }[]} items
 * @param {{ minLabelPercent?: number }} [options]
 * @returns {{
 *   key: string,
 *   label: string,
 *   value: number,
 *   percent: number,
 *   showLabel: boolean,
 * }[]}
 */
export function stackedBarPercents(items, options = {}) {
  const minLabelPercent =
    options.minLabelPercent == null
      ? DEFAULT_MIN_LABEL_PERCENT
      : Number(options.minLabelPercent);
  const list = Array.isArray(items) ? items : [];
  const percents = roundPercentsToOneDecimal(valuesOf(list));

  return list
    .map((item, i) => {
      const value = toFiniteNumber(item?.value);
      const percent = percents[i] || 0;
      if (!(value > 0) || !(percent > 0)) return null;
      return {
        key: item.key ?? String(i),
        label: item.label ?? String(item.key ?? i),
        value,
        percent,
        showLabel: percent >= minLabelPercent,
      };
    })
    .filter(Boolean);
}
