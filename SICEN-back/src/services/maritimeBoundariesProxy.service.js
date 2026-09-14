/**
 * Proxy a MarineRegions (VLIZ) WFS para límites marítimos.
 * Capas: mar territorial 12 MN, zona contigua 24 MN, ZEE (UY) y Río de la Plata (IHO).
 * Fuente: Flanders Marine Institute — misma base que usa Skylight en su UI.
 */

import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";
import polygonClipping from "polygon-clipping";
import {
  PUNTA_GORDA_LAT,
  RIO_DE_LA_PLATA_NW_CUT_LATLON,
} from "../constants/rioDeLaPlataClip.js";

const WFS_BASE =
  "https://geo.vliz.be/geoserver/MarineRegions/wfs";

/**
 * @typedef {{
 *   typeName: string,
 *   territories?: string[],
 *   mrgid?: number,
 *   cqlFilter?: string,
 *   featureName?: string,
 *   label: string,
 *   infoText: string,
 *   color: string,
 *   borderColor: string,
 *   fillOpacity: number,
 *   simplifyTol?: number,
 *   clipNwCut?: boolean,
 * }} MaritimeLayerSpec
 */

/** @type {Record<string, MaritimeLayerSpec>} */
export const MARITIME_LAYER_SPECS = {
  "12nm": {
    typeName: "MarineRegions:eez_12nm",
    territories: ["Uruguay"],
    label: "Mar territorial (12 MN)",
    infoText:
      "Mar territorial de Uruguay (aprox. 12 MN). Fuente MarineRegions / VLIZ. Referencia analítica, no carta oficial.",
    color: "#38bdf8",
    borderColor: "#0284c7",
    fillOpacity: 0.12,
  },
  "24nm": {
    typeName: "MarineRegions:eez_24nm",
    territories: ["Uruguay"],
    label: "Zona contigua (24 MN)",
    infoText:
      "Zona contigua de Uruguay (hasta 24 MN desde la línea de base). Fuente MarineRegions / VLIZ. Referencia analítica, no carta oficial.",
    color: "#22d3ee",
    borderColor: "#0891b2",
    fillOpacity: 0.1,
  },
  eez: {
    typeName: "MarineRegions:eez",
    /** Solo ZEE uruguaya (8467); el régimen conjunto exterior se omite acá. */
    mrgid: 8467,
    label: "ZEE (200 MN)",
    infoText:
      "Zona Económica Exclusiva de Uruguay (aprox. 200 MN). Fuente MarineRegions / VLIZ. Referencia analítica, no carta oficial.",
    color: "#818cf8",
    borderColor: "#4f46e5",
    fillOpacity: 0.08,
  },
  rdp: {
    typeName: "MarineRegions:iho",
    mrgid: 4325,
    featureName: "Río de la Plata",
    label: "Río de la Plata",
    infoText:
      "Río de la Plata (referencia MarineRegions / IHO), recortado al este/sur del límite operacional San Fernando–Punta Gorda: excluye delta del Paraná y Río Uruguay al norte del paralelo de Punta Gorda. No es carta oficial ni el trazado del Tratado.",
    color: "#34d399",
    borderColor: "#059669",
    fillOpacity: 0.14,
    simplifyTol: 0.003,
    /** Recorte NW: ver `rioDeLaPlataClip.js`. */
    clipNwCut: true,
  },
};

/** Prefijo de cache: al cambiar specs / recortes invalidá entradas viejas. */
const CACHE_KEY_PREFIX = "uy-rdp-v2:";

const ALLOWED_LAYERS = new Set(Object.keys(MARITIME_LAYER_SPECS));

/** @type {Map<string, { at: number, data: object }>} */
const cache = new Map();

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

function cacheTtlMs() {
  return Number(env.maritimeBoundariesCacheTtlMs) || 604_800_000;
}

/**
 * Distancia perpendicular punto–segmento (grados, plano local).
 * @param {[number, number]} p
 * @param {[number, number]} a
 * @param {[number, number]} b
 */
function perpDist(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + tc * dx), y - (y1 + tc * dy));
}

/**
 * Douglas–Peucker sobre anillo [lon, lat][].
 * @param {[number, number][]} ring
 * @param {number} tolerance
 */
function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length <= 4) return ring;
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring.slice();
  if (pts.length <= 3) return ring;

  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;

  /** @type {[number, number][]} */
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i += 1) {
      const d = perpDist(pts[i], pts[start], pts[end]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > tolerance && maxIdx >= 0) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }

  const out = [];
  for (let i = 0; i < pts.length; i += 1) {
    if (keep[i]) out.push(pts[i]);
  }
  if (closed && out.length) {
    out.push([out[0][0], out[0][1]]);
  }
  return out.length >= 4 ? out : ring;
}

function simplifyCoords(coords, type, tolerance) {
  if (type === "Polygon") {
    return coords.map((ring) => simplifyRing(ring, tolerance));
  }
  if (type === "MultiPolygon") {
    return coords.map((poly) =>
      poly.map((ring) => simplifyRing(ring, tolerance))
    );
  }
  return coords;
}

/**
 * Convierte geometría GeoJSON a lista de anillos [lat, lon][] (solo exteriores).
 * @param {{ type: string, coordinates: any }} geometry
 * @returns {[number, number][][]}
 */
function geometryToOuterRingsLatLon(geometry) {
  if (!geometry?.type || !geometry.coordinates) return [];
  const polys =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  /** @type {[number, number][][]} */
  const rings = [];
  for (const poly of polys) {
    const outer = poly?.[0];
    if (!Array.isArray(outer) || outer.length < 3) continue;
    const latLon = [];
    for (const c of outer) {
      const lon = Number(c?.[0]);
      const lat = Number(c?.[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        latLon.push([lat, lon]);
      }
    }
    if (latLon.length >= 3) rings.push(latLon);
  }
  return rings;
}

/**
 * Anillo [lon,lat] cerrado: este/sur del corte NW (Río de la Plata a conservar).
 * @param {[number, number][]} cutLatLon
 */
function buildRdpKeepRingLonLat(cutLatLon = RIO_DE_LA_PLATA_NW_CUT_LATLON) {
  if (!cutLatLon?.length) return [];
  const eastLon = -54.7;
  const southLat = -36.45;
  const start = cutLatLon[0];
  const end = cutLatLon[cutLatLon.length - 1];
  const northLat = Number.isFinite(PUNTA_GORDA_LAT)
    ? PUNTA_GORDA_LAT
    : end[0];

  /** @type {[number, number][]} */
  const ring = cutLatLon.map(([lat, lon]) => [lon, lat]);
  ring.push([eastLon, northLat]);
  ring.push([eastLon, southLat]);
  ring.push([start[1] - 0.05, southLat]);
  ring.push([start[1], start[0]]);
  return ring;
}

/**
 * Intersecta anillos [lat,lon][] con el área a conservar del Río de la Plata.
 * @param {[number, number][][]} ringsLatLon
 * @returns {[number, number][][]}
 */
function clipRingsToRioDeLaPlata(ringsLatLon) {
  const keep = buildRdpKeepRingLonLat();
  if (!keep.length || !ringsLatLon?.length) return ringsLatLon || [];

  /** @type {[number, number][][][]} */
  const subject = ringsLatLon.map((ring) => {
    const lonLat = ring.map(([lat, lon]) => [lon, lat]);
    const first = lonLat[0];
    const last = lonLat[lonLat.length - 1];
    if (!first || !last) return [lonLat];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      lonLat.push([first[0], first[1]]);
    }
    return [lonLat];
  });

  let clipped;
  try {
    clipped = polygonClipping.intersection(subject, [[keep]]);
  } catch (e) {
    logger.warning(`rdp clip: ${e.message || e}`);
    return ringsLatLon;
  }
  if (!clipped?.length) return [];

  /** @type {[number, number][][]} */
  const out = [];
  for (const poly of clipped) {
    const outer = poly?.[0];
    if (!Array.isArray(outer) || outer.length < 4) continue;
    const latLon = outer.slice(0, -1).map(([lon, lat]) => [
      Number(lat.toFixed(6)),
      Number(lon.toFixed(6)),
    ]);
    if (latLon.length >= 3) out.push(latLon);
  }
  return out;
}

function buildCqlFilter(spec) {
  if (spec.cqlFilter) return String(spec.cqlFilter);
  if (spec.mrgid != null && Number.isFinite(Number(spec.mrgid))) {
    return `mrgid=${Number(spec.mrgid)}`;
  }
  const territories = Array.isArray(spec.territories) ? spec.territories : [];
  if (!territories.length) {
    throw httpError("Capa marítima sin filtro CQL configurado.", 500);
  }
  return territories
    .map((t) => `territory1='${String(t).replace(/'/g, "''")}'`)
    .join(" OR ");
}

/**
 * @param {string} layerId
 * @param {MaritimeLayerSpec} spec
 */
async function fetchLayerFromWfs(layerId, spec) {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: spec.typeName,
    cql_filter: buildCqlFilter(spec),
    outputFormat: "application/json",
  });
  const url = `${WFS_BASE}?${params.toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw httpError(
        `MarineRegions HTTP ${res.status} (${layerId}).`,
        res.status >= 500 ? 502 : 502
      );
    }
    const geojson = await res.json();
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    const tolerance =
      Number.isFinite(spec.simplifyTol)
        ? Number(spec.simplifyTol)
        : layerId === "eez"
          ? 0.012
          : 0.004;
    /** @type {object[]} */
    const zones = [];
    for (const ft of features) {
      const props = ft?.properties || {};
      let geometry = ft?.geometry;
      if (!geometry) continue;
      geometry = {
        type: geometry.type,
        coordinates: simplifyCoords(
          geometry.coordinates,
          geometry.type,
          tolerance
        ),
      };
      let rings = geometryToOuterRingsLatLon(geometry);
      if (!rings.length) continue;
      if (spec.clipNwCut) {
        rings = clipRingsToRioDeLaPlata(rings);
        if (!rings.length) continue;
      }
      const territory = props.territory1 || props.sovereign1 || "";
      const name =
        spec.featureName ||
        props.geoname ||
        props.name ||
        `${spec.label}${territory ? ` — ${territory}` : ""}`;
      rings.forEach((positions, idx) => {
        zones.push({
          id: `${layerId}-${props.mrgid || "x"}-${idx}`,
          layerId,
          name: rings.length > 1 ? `${name} (${idx + 1})` : name,
          territory: territory || null,
          mrgid: props.mrgid ?? null,
          color: spec.color,
          borderColor: spec.borderColor,
          fillOpacity: spec.fillOpacity,
          infoText: spec.infoText,
          positions,
        });
      });
    }
    return {
      layerId,
      label: spec.label,
      infoText: spec.infoText,
      color: spec.color,
      borderColor: spec.borderColor,
      fillOpacity: spec.fillOpacity,
      zones,
      featureCount: features.length,
      zoneCount: zones.length,
    };
  } catch (e) {
    if (e.name === "AbortError") {
      throw httpError("MarineRegions: timeout al pedir límites marítimos.", 504);
    }
    if (e.status) throw e;
    throw httpError(
      `MarineRegions no disponible: ${e.message || e}`,
      503
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{ layers?: string[] }} opts
 */
export async function getMaritimeBoundaries({ layers } = {}) {
  const requested = (
    Array.isArray(layers) && layers.length
      ? layers
      : ["12nm", "24nm", "eez", "rdp"]
  )
    .map((l) => String(l || "").trim())
    .filter((l) => ALLOWED_LAYERS.has(l));

  if (!requested.length) {
    throw httpError(
      "Indicá al menos una capa válida (12nm, 24nm, eez, rdp).",
      400
    );
  }

  const now = Date.now();
  const ttl = cacheTtlMs();
  /** @type {Record<string, object>} */
  const byLayer = {};
  const missing = [];

  for (const id of requested) {
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    const hit = cache.get(cacheKey);
    if (hit && now - hit.at < ttl) {
      byLayer[id] = hit.data;
    } else {
      missing.push(id);
    }
  }

  if (missing.length) {
    const results = await Promise.all(
      missing.map(async (id) => {
        const spec = MARITIME_LAYER_SPECS[id];
        try {
          const data = await fetchLayerFromWfs(id, spec);
          cache.set(`${CACHE_KEY_PREFIX}${id}`, { at: Date.now(), data });
          return { id, data, ok: true };
        } catch (e) {
          logger.warning(`maritimeBoundaries ${id}: ${e.message || e}`);
          return { id, error: e, ok: false };
        }
      })
    );
    for (const r of results) {
      if (r.ok) byLayer[r.id] = r.data;
      else if (!byLayer[r.id]) {
        throw r.error;
      }
    }
  }

  // Limpiar cache viejo (incluye claves sin prefijo de versiones anteriores)
  for (const [key, entry] of cache) {
    if (!key.startsWith(CACHE_KEY_PREFIX) || now - entry.at > ttl * 2) {
      cache.delete(key);
    }
  }

  const catalog = Object.entries(MARITIME_LAYER_SPECS).map(([id, spec]) => ({
    id,
    label: spec.label,
    infoText: spec.infoText,
    color: spec.color,
    borderColor: spec.borderColor,
  }));

  return {
    layers: byLayer,
    catalog,
    source: "MarineRegions / Flanders Marine Institute (VLIZ)",
    attribution:
      "Flanders Marine Institute (VLIZ) — MarineBoundaries Geodatabase via MarineRegions.org",
    fetchedAt: new Date().toISOString(),
    cacheTtlMs: ttl,
  };
}

export function listMaritimeBoundaryCatalog() {
  return Object.entries(MARITIME_LAYER_SPECS).map(([id, spec]) => ({
    id,
    label: spec.label,
    infoText: spec.infoText,
    color: spec.color,
    borderColor: spec.borderColor,
  }));
}
