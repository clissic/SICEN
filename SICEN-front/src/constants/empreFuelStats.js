/**
 * Consumo de combustible del ejercicio — Estado Mayor (EMPRE) / P3.
 * Litros por tipo. La barra apilada usa estos valores como 100 %.
 */
export const EMPRE_FUEL_TYPES = Object.freeze([
  { key: "gasoil", label: "Gasoil", liters: 18450 },
  { key: "naftaSuper", label: "Nafta Súper", liters: 7320 },
  { key: "naftaPremium", label: "Nafta Premium", liters: 980 },
  { key: "otros", label: "Otros", liters: 210 },
]);

export function empreFuelTotalLiters(types = EMPRE_FUEL_TYPES) {
  return types.reduce((sum, row) => sum + (Number(row.liters) || 0), 0);
}
