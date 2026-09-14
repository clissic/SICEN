/**
 * Límite noroeste del Río de la Plata (referencia operacional SICEN).
 * Polilínea costa AR (San Fernando / Martínez) → Punta Gorda (UY).
 * Al este y al sur = Río de la Plata; al oeste/norte = delta del Paraná / Río Uruguay.
 *
 * Punta Gorda ≈ paralelo que separa Río Uruguay y Río de la Plata
 * (Tratado del Río de la Plata, 1973).
 *
 * @type {[number, number][]} lat, lon
 */
export const RIO_DE_LA_PLATA_NW_CUT_LATLON = [
  [-34.492, -58.508],
  [-34.420, -58.47],
  [-34.35, -58.445],
  [-34.28, -58.42],
  [-34.21, -58.4],
  [-34.14, -58.395],
  [-34.07, -58.405],
  [-34.01, -58.42],
  [-33.96, -58.425],
  [-33.91611, -58.41444], // Punta Gorda
];

/** Paralelo de Punta Gorda (°). */
export const PUNTA_GORDA_LAT = -33.91611;
