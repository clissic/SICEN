/**
 * Precomputa el polígono de Categoría B (unión de círculos 15 MN).
 * Uso (desde SICEN-front): node scripts/build-brevet-b-strip.mjs
 *
 * Cortes: ver `src/constants/data/brevetBStripCuts.js`
 * Luego se recorta al lado mar de la costa (no pinta tierra).
 * Luego se une con el Río de la Plata (mismo recorte NW que la capa RDP;
 * la capa individual RDP no se modifica).
 * Checkpoint v1: node scripts/restore-brevet-b-checkpoint.mjs v1
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import polygonClipping from "polygon-clipping";
import {
  BREVET_B_COAST_POINTS,
  BREVET_B_CIRCLE_RADIUS_NM,
  BREVET_B_EAST_TERMINUS,
  BREVET_B_EAST_BOUNDARY_BEARING,
} from "../src/constants/brevetBCoastPoints.js";
import { BREVET_B_STRIP_CUTS } from "../src/constants/data/brevetBStripCuts.js";
import {
  mergeCirclesPolygon,
  clipPolygonToSeawardOfCoast,
  straightenEastEdgeFromTerminus,
} from "../src/utils/mergeCirclesPolygon.js";
import {
  PUNTA_GORDA_LAT,
  RIO_DE_LA_PLATA_NW_CUT_LATLON,
} from "../../SICEN-back/src/constants/rioDeLaPlataClip.js";
import {
  JE_SPLIT_LINE_NORTH,
  JE_SPLIT_LINE_SOUTH,
} from "../src/constants/jeExclusiveJurisdiction.js";
import {
  RIO_URUGUAY_CENTERLINE,
  RIO_URUGUAY_NORTH_TERMINUS,
} from "../src/constants/data/rioUruguayCenterline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(
  __dirname,
  "../src/constants/data/brevetBStripPolygon.js"
);

const WFS_BASE = "https://geo.vliz.be/geoserver/MarineRegions/wfs";
const RDP_MRGID = 4325;

function closeLonLatRing(ring) {
  if (!ring?.length) return [];
  const out = ring.map(([lon, lat]) => [lon, lat]);
  const a = out[0];
  const b = out[out.length - 1];
  if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
  return out;
}

function latLonToPoly(ringLatLon) {
  return [closeLonLatRing(ringLatLon.map(([lat, lon]) => [lon, lat]))];
}

function polysToLatLon(clipped) {
  /** @type {[number, number][][]} */
  const rings = [];
  for (const poly of clipped || []) {
    const outer = poly?.[0];
    if (!Array.isArray(outer) || outer.length < 4) continue;
    const latLon = outer.slice(0, -1).map(([lon, lat]) => [
      Number(lat.toFixed(6)),
      Number(lon.toFixed(6)),
    ]);
    if (latLon.length >= 3) rings.push(latLon);
  }
  return rings;
}

function buildRdpKeepRingLonLat(cutLatLon = RIO_DE_LA_PLATA_NW_CUT_LATLON) {
  const eastLon = -54.7;
  const southLat = -36.45;
  const start = cutLatLon[0];
  const northLat = PUNTA_GORDA_LAT;
  const ring = cutLatLon.map(([lat, lon]) => [lon, lat]);
  ring.push([eastLon, northLat]);
  ring.push([eastLon, southLat]);
  ring.push([start[1] - 0.05, southLat]);
  ring.push([start[1], start[0]]);
  return ring;
}

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
      if (Number.isFinite(lat) && Number.isFinite(lon)) latLon.push([lat, lon]);
    }
    if (latLon.length >= 3) rings.push(latLon);
  }
  return rings;
}

async function fetchClippedRioDeLaPlata() {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: "MarineRegions:iho",
    cql_filter: `mrgid=${RDP_MRGID}`,
    outputFormat: "application/json",
  });
  const res = await fetch(`${WFS_BASE}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`MarineRegions RDP HTTP ${res.status}`);
  }
  const geojson = await res.json();
  const ft = geojson?.features?.[0];
  if (!ft?.geometry) throw new Error("MarineRegions RDP: sin geometría");
  const rings = geometryToOuterRingsLatLon(ft.geometry);
  const keep = buildRdpKeepRingLonLat();
  const subject = rings.map((r) => latLonToPoly(r));
  const clipped = polygonClipping.intersection(subject, [[keep]]);
  return polysToLatLon(clipped);
}

/**
 * Elige el anillo exterior mayor tras una unión (MultiPolygon → un ring).
 * @param {[number, number][][]} ringsLatLon
 */
function pickLargestRing(ringsLatLon) {
  let best = null;
  let bestArea = -1;
  for (const ring of ringsLatLon) {
    let sum = 0;
    for (let i = 0; i < ring.length; i++) {
      const [lat1, lon1] = ring[i];
      const [lat2, lon2] = ring[(i + 1) % ring.length];
      sum += lon1 * lat2 - lon2 * lat1;
    }
    const a = Math.abs(sum / 2);
    if (a > bestArea) {
      bestArea = a;
      best = ring;
    }
  }
  return best || ringsLatLon[0] || [];
}

const CUTS = BREVET_B_STRIP_CUTS;

let coastal = mergeCirclesPolygon(
  BREVET_B_COAST_POINTS,
  BREVET_B_CIRCLE_RADIUS_NM,
  72,
  CUTS
);

const before = coastal.length;
coastal = clipPolygonToSeawardOfCoast(coastal, BREVET_B_COAST_POINTS, {
  eastBoundaryBearing: BREVET_B_EAST_BOUNDARY_BEARING,
});
coastal = straightenEastEdgeFromTerminus(
  coastal,
  BREVET_B_EAST_TERMINUS,
  BREVET_B_EAST_BOUNDARY_BEARING
);

console.log(
  "coastal strip verts",
  before,
  "→",
  coastal.length,
  "(water-clip + east straighten)"
);

const rdpRings = await fetchClippedRioDeLaPlata();
console.log(
  "RDP clipped rings",
  rdpRings.length,
  "verts",
  rdpRings.map((r) => r.length).join(",")
);

/**
 * Conservar:
 * - rdpKeep: este/sur del corte NW (sin Río Uruguay / delta), incluye el frente
 *   exterior del RDP → cierra el “triángulo” frente a Piriápolis–Punta del Este.
 * - eastKeep: franja oceánica al este de Punta del Este (hasta Chuy), también
 *   al norte del paralelo de Punta Gorda.
 */
const PUNTA_DEL_ESTE_CLIP_LON = -55.15;
function buildEastOfPuntaDelEsteKeepRingLonLat() {
  return [
    [PUNTA_DEL_ESTE_CLIP_LON, -37.2],
    [-52.4, -37.2],
    [-52.4, -33.2],
    [PUNTA_DEL_ESTE_CLIP_LON, -33.2],
    [PUNTA_DEL_ESTE_CLIP_LON, -37.2],
  ];
}

const keepUnion = polygonClipping.union(
  [[buildRdpKeepRingLonLat()]],
  [[buildEastOfPuntaDelEsteKeepRingLonLat()]]
);

const fullUnion = polygonClipping.union(
  [latLonToPoly(coastal)],
  rdpRings.map((r) => latLonToPoly(r))
);

const clipped = polygonClipping.intersection(fullUnion, keepUnion);
let unionRings = polysToLatLon(clipped);

/**
 * Río Uruguay (eje OSM + buffer) desde Punta Gorda hasta el límite N operacional.
 * Se suma a Categoría B sin alterar la capa RDP individual.
 */
const RIO_URUGUAY_BUFFER_NM = 0.85;
function buildRioUruguayBufferPolygon() {
  const [nLat, nLon] = RIO_URUGUAY_NORTH_TERMINUS;
  const centers = RIO_URUGUAY_CENTERLINE.map((p) => p.slice());
  const last = centers[centers.length - 1];
  if (
    !last ||
    Math.hypot(last[0] - nLat, last[1] - nLon) > 0.01
  ) {
    centers.push([nLat, nLon]);
  }
  let poly = mergeCirclesPolygon(centers, RIO_URUGUAY_BUFFER_NM, 24);
  /* Conservar solo al sur del límite norte (lat ≤ nLat). */
  const southOfNorth = [
    [-59.5, -34.2],
    [-56.2, -34.2],
    [-56.2, nLat],
    [-59.5, nLat],
    [-59.5, -34.2],
  ];
  const inter = polygonClipping.intersection(
    [latLonToPoly(poly)],
    [[southOfNorth]]
  );
  return pickLargestRing(polysToLatLon(inter));
}

const rioUyPoly = buildRioUruguayBufferPolygon();
console.log(
  "Río Uruguay buffer verts",
  rioUyPoly.length,
  "north limit",
  RIO_URUGUAY_NORTH_TERMINUS.map((x) => +x.toFixed(5))
);

if (rioUyPoly.length >= 3) {
  const withUy = polygonClipping.union(
    unionRings.map((r) => latLonToPoly(r)),
    [latLonToPoly(rioUyPoly)]
  );
  unionRings = polysToLatLon(withUy);
}

const positions = unionRings.length === 1 ? unionRings[0] : null;

const northOverflow = unionRings
  .flat()
  .filter((p) => p[0] > PUNTA_GORDA_LAT + 0.01 && p[1] < -55.5).length;

const rdpPositions = pickLargestRing(rdpRings);

console.log(
  "Categoría B = franja∪RDP∪RíoUruguay →",
  unionRings.length,
  "ring(s); verts",
  unionRings.map((r) => r.length).join(","),
  "north",
  Math.max(...unionRings.flat().map((p) => p[0])).toFixed(4),
  "west",
  Math.min(...unionRings.flat().map((p) => p[1])).toFixed(4),
  "east",
  Math.max(...unionRings.flat().map((p) => p[1])).toFixed(4),
  "NW-overflow-verts",
  northOverflow
);
console.log("RDP clipped verts", rdpPositions.length);

/**
 * Costa uruguaya del Río de la Plata: Punta Gorda → Punta del Este
 * (registros 1–152 ≈ índices 0–151).
 */
const JE_PLATA_COAST_END = 152;
const plataCoast = BREVET_B_COAST_POINTS.slice(0, JE_PLATA_COAST_END);
const jeWestCuts = [
  {
    /* Mismo semicírculo S que Cat B en el extremo Punta Gorda */
    indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    from: 270,
    to: 90,
  },
];

/**
 * Semiplano al oeste (cross < 0) o este (cross > 0) de la línea Colonia–Punta Lara.
 * Anillo [lon, lat] cerrado para polygon-clipping.
 * @param {'west' | 'east'} side
 */
function buildJeSplitKeepRingLonLat(side) {
  const [aLat, aLon] = JE_SPLIT_LINE_NORTH;
  const [bLat, bLon] = JE_SPLIT_LINE_SOUTH;
  const dLat = bLat - aLat;
  const dLon = bLon - aLon;
  const len = Math.hypot(dLat, dLon) || 1;
  /* Extender la línea más allá de los extremos */
  const ext = 0.8;
  const aExtLat = aLat - (dLat / len) * ext;
  const aExtLon = aLon - (dLon / len) * ext;
  const bExtLat = bLat + (dLat / len) * ext;
  const bExtLon = bLon + (dLon / len) * ext;
  /* Perpendicular unitaria en (lat, lon); elegir la que apunta al oeste (lon↓) */
  let pLat = -dLon / len;
  let pLon = dLat / len;
  const midLat = (aLat + bLat) / 2;
  const midLon = (aLon + bLon) / 2;
  if (midLon + pLon > midLon) {
    pLat = -pLat;
    pLon = -pLon;
  }
  /* p ahora apunta al oeste. Para el este, invertir. */
  if (side === "east") {
    pLat = -pLat;
    pLon = -pLon;
  }
  const reach = 3.5;
  return [
    [aExtLon, aExtLat],
    [bExtLon, bExtLat],
    [bExtLon + pLon * reach, bExtLat + pLat * reach],
    [aExtLon + pLon * reach, aExtLat + pLat * reach],
    [aExtLon, aExtLat],
  ];
}

/**
 * Franja de `radiusNm` MN desde la costa UY ∩ RDP ∩ semiplano de la línea JE.
 * @param {number} radiusNm
 * @param {'west' | 'east'} side
 */
function buildJeStripFromCoast(radiusNm, side) {
  let strip = mergeCirclesPolygon(plataCoast, radiusNm, 48, jeWestCuts);
  strip = clipPolygonToSeawardOfCoast(strip, plataCoast);
  const interRdp = polygonClipping.intersection(
    [latLonToPoly(strip)],
    [latLonToPoly(rdpPositions)]
  );
  const interSide = polygonClipping.intersection(interRdp, [
    [buildJeSplitKeepRingLonLat(side)],
  ]);
  const rings = polysToLatLon(interSide);
  return pickLargestRing(rings);
}

function bboxOf(pts) {
  let a = Infinity,
    b = -Infinity,
    c = Infinity,
    d = -Infinity;
  for (const [lat, lon] of pts) {
    a = Math.min(a, lon);
    b = Math.max(b, lon);
    c = Math.min(c, lat);
    d = Math.max(d, lat);
  }
  return [a, c, b, d].map((x) => +x.toFixed(3));
}

const je2Positions = buildJeStripFromCoast(2, "west");
const je7Positions = buildJeStripFromCoast(7, "east");
console.log(
  "J.E. 2 MN (oeste línea Colonia–Punta Lara) verts",
  je2Positions.length,
  "bbox",
  bboxOf(je2Positions)
);
console.log(
  "J.E. 7 MN (este línea Colonia–Punta Lara) verts",
  je7Positions.length,
  "bbox",
  bboxOf(je7Positions)
);
console.log(
  "split line N",
  JE_SPLIT_LINE_NORTH.map((x) => +x.toFixed(6)),
  "S",
  JE_SPLIT_LINE_SOUTH.map((x) => +x.toFixed(6))
);

const cutRegs = CUTS.flatMap((c) => c.indices.map((i) => i + 1));
console.log(
  "centers",
  BREVET_B_COAST_POINTS.length,
  "cut registers",
  cutRegs.join(", ")
);

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const out = `/**
 * Polígono Categoría B:
 * - Franja oceánica 15 MN (E de PDE) ∪ Río de la Plata (recortado) ∪ Río Uruguay
 *   (eje OSM + buffer hasta 30°11′44.6″S 057°38′49.4″O).
 *
 * \`BREVET_B_COASTAL_STRIP_POSITIONS\`: franja 15 MN completa (referencia).
 * \`RIO_DE_LA_PLATA_CLIPPED_POSITIONS\`: RDP con recorte NW (capa Río de la Plata).
 * \`JE_2MN_POSITIONS\` / \`JE_7MN_POSITIONS\`: jurisdicción exclusiva (línea Colonia–Punta Lara).
 * \`BREVET_B_STRIP_POSITIONS\` / \`BREVET_B_STRIP_RINGS\`: Categoría B.
 *
 * Regenerar: node scripts/build-brevet-b-strip.mjs
 * Centerline UY: node scripts/extract-rio-uruguay-centerline.mjs
 * Restaurar checkpoint: node scripts/restore-brevet-b-checkpoint.mjs v1
 */
export const BREVET_B_COASTAL_STRIP_POSITIONS = ${JSON.stringify(coastal)};
export const RIO_DE_LA_PLATA_CLIPPED_POSITIONS = ${JSON.stringify(rdpPositions)};
export const JE_2MN_POSITIONS = ${JSON.stringify(je2Positions)};
export const JE_7MN_POSITIONS = ${JSON.stringify(je7Positions)};
export const BREVET_B_STRIP_RINGS = ${JSON.stringify(unionRings)};
export const BREVET_B_STRIP_POSITIONS = ${JSON.stringify(
  positions || pickLargestRing(unionRings)
)};
`;

fs.writeFileSync(outPath, out);
console.log("OK", outPath);
