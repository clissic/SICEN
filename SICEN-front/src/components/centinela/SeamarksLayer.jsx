import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const SEAMARK_URL = "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png";

/**
 * Aclara solo trazos finos (leyendas Fl.G…, nombres).
 * Los rellenos negros de boyas/topmarks se detectan por morfología
 * (erosión+dilatación) y se dejan sin tocar. Colores saturados tampoco.
 */
function isDarkNeutral(r, g, b, a) {
  if (a < 8) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return sat <= 0.22 && max <= 110;
}

function erodeDarkMask(mask, width, height) {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      if (!mask[p]) continue;
      if (
        mask[p - 1] &&
        mask[p + 1] &&
        mask[p - width] &&
        mask[p + width]
      ) {
        out[p] = 1;
      }
    }
  }
  return out;
}

function dilateDarkMask(mask, width, height) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      let keep = mask[p];
      if (!keep) {
        for (let dy = -1; dy <= 1 && !keep; dy += 1) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            if (mask[ny * width + nx]) {
              keep = 1;
              break;
            }
          }
        }
      }
      if (keep) out[p] = 1;
    }
  }
  return out;
}

function lightenLabelPixels(data, width, height) {
  const n = width * height;
  const dark = new Uint8Array(n);
  for (let p = 0; p < n; p += 1) {
    const i = p * 4;
    if (isDarkNeutral(data[i], data[i + 1], data[i + 2], data[i + 3])) {
      dark[p] = 1;
    }
  }

  // Rellenos sólidos (boyas) sobreviven a erosiones; el texto fino no.
  let solid = erodeDarkMask(dark, width, height);
  solid = erodeDarkMask(solid, width, height);
  solid = dilateDarkMask(solid, width, height);
  solid = dilateDarkMask(solid, width, height);

  for (let p = 0; p < n; p += 1) {
    if (!dark[p] || solid[p]) continue;
    const i = p * 4;
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const out = Math.max(205, 255 - max);
    data[i] = out;
    data[i + 1] = out;
    data[i + 2] = out;
  }
}

const SeamarkLabelLightTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement("canvas");
    const ctx = tile.getContext("2d", { willReadFrequently: true });
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        ctx.clearRect(0, 0, size.x, size.y);
        ctx.drawImage(img, 0, 0, size.x, size.y);
        const imageData = ctx.getImageData(0, 0, size.x, size.y);
        lightenLabelPixels(imageData.data, size.x, size.y);
        ctx.putImageData(imageData, 0, 0);
        done(null, tile);
      } catch {
        ctx.clearRect(0, 0, size.x, size.y);
        ctx.drawImage(img, 0, 0, size.x, size.y);
        done(null, tile);
      }
    };
    img.onerror = (err) => {
      done(err, tile);
    };
    img.src = this.getTileUrl(coords);
    return tile;
  },
});

function createSeamarkLayer(lightenLabels) {
  const options = {
    attribution: '&copy;&nbsp;<a href="https://www.openseamap.org">SeaMap</a>',
    maxZoom: 18,
    opacity: 1,
    pane: "overlayPane",
    className: "centinela-seamarks-layer",
    zIndex: 450,
    crossOrigin: "anonymous",
  };
  if (lightenLabels) {
    return new SeamarkLabelLightTileLayer(SEAMARK_URL, options);
  }
  return L.tileLayer(SEAMARK_URL, options);
}

/**
 * Overlay OpenSeaMap (seamarks). Con `lightenLabels` (tema oscuro) aclara
 * solo el texto fino de las leyendas; rellenos negros de boyas y colores
 * saturados (R/G/Y) se mantienen.
 */
export function SeamarksLayer({ enabled, lightenLabels = false }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    const layer = createSeamarkLayer(lightenLabels);
    layerRef.current = layer;
    return () => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [map, lightenLabels]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const onMap = map.hasLayer(layer);
    if (enabled && !onMap) {
      layer.addTo(map);
      if (typeof layer.bringToFront === "function") layer.bringToFront();
    } else if (!enabled && onMap) {
      map.removeLayer(layer);
    }
  }, [enabled, map, lightenLabels]);

  return null;
}
