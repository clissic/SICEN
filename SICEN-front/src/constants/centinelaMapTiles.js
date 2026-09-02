/** Key de tiles CARTO (`VITE_CARTO_API_KEY`); quita el watermark. */
const CARTO_API_KEY = String(import.meta.env.VITE_CARTO_API_KEY || "").trim();

export function cartoTileUrl(stylePath) {
  const base = `https://{s}.basemaps.cartocdn.com/${stylePath}/{z}/{x}/{y}.png`;
  return CARTO_API_KEY
    ? `${base}?key=${encodeURIComponent(CARTO_API_KEY)}`
    : base;
}

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const CENTINELA_BASE_TILES = {
  light: {
    url: cartoTileUrl("rastertiles/voyager"),
    attribution: CARTO_ATTRIBUTION,
  },
  dark: {
    url: cartoTileUrl("dark_all"),
    attribution: CARTO_ATTRIBUTION,
  },
};

export function getCentinelaBaseTiles(isDark) {
  return isDark ? CENTINELA_BASE_TILES.dark : CENTINELA_BASE_TILES.light;
}
