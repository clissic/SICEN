/**
 * Círculos geodésicos + unión (polygon-clipping) → polígono Leaflet [lat, lon].
 */
import polygonClipping from "polygon-clipping";

export const NAUTICAL_MILE_METERS = 1852;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/** Destino a `distanceM` m con rumbo `bearing` desde [lat, lon]. */
export function destinationPoint([lat, lon], bearing, distanceM) {
  const R = 6371000;
  const δ = distanceM / R;
  const θ = toRad(bearing);
  const φ1 = toRad(lat);
  const λ1 = toRad(lon);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
      Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
  return [toDeg(φ2), ((toDeg(λ2) + 540) % 360) - 180];
}

/**
 * Anillo de círculo completo en formato polygon-clipping: [[lon, lat], ...] cerrado.
 */
export function circleRingLonLat(centerLatLon, radiusM, steps = 64) {
  const ring = [];
  for (let i = 0; i < steps; i++) {
    const bearing = (i / steps) * 360;
    const [lat, lon] = destinationPoint(centerLatLon, bearing, radiusM);
    ring.push([lon, lat]);
  }
  ring.push(ring[0]);
  return ring;
}

/** Polígono Leaflet [lat, lon] de un círculo de `radiusNm` millas náuticas. */
export function circlePolygonLatLon(centerLatLon, radiusNm, steps = 72) {
  const ring = circleRingLonLat(
    centerLatLon,
    radiusNm * NAUTICAL_MILE_METERS,
    steps
  );
  return ring.slice(0, -1).map(([lon, lat]) => [
    Number(lat.toFixed(6)),
    Number(lon.toFixed(6)),
  ]);
}

/**
 * Sector/semicírculo: arco de `bearingStart` a `bearingEnd` (sentido horario
 * náutico creciente) y cierre por la cuerda (diámetro si el barrido es 180°).
 * polygon-clipping: [[lon, lat], ...] cerrado.
 */
export function sectorRingLonLat(
  centerLatLon,
  radiusM,
  bearingStart,
  bearingEnd,
  steps = 36
) {
  let sweep = (bearingEnd - bearingStart + 360) % 360;
  if (sweep === 0) sweep = 360;
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (bearingStart + (sweep * i) / steps) % 360;
    const [lat, lon] = destinationPoint(centerLatLon, bearing, radiusM);
    ring.push([lon, lat]);
  }
  ring.push(ring[0]);
  return ring;
}

/**
 * Une círculos de `radiusNm` MN centrados en `centers` ([lat, lon]).
 *
 * `cuts`: lista de `{ indices: number[], from, to }` — índices 0-based a los que
 * se les quita el arco from→to (sentido creciente) y se conserva el complementario.
 * Ej.: `{ indices: [0], from: 270, to: 90 }` ⇒ se conserva 90°→270° (semicírculo S).
 */
export function mergeCirclesPolygon(centers, radiusNm, steps = 64, cuts = []) {
  if (!centers?.length) return [];
  const radiusM = radiusNm * NAUTICAL_MILE_METERS;

  const cutByIndex = new Map();
  for (const cut of cuts) {
    for (const i of cut.indices || []) {
      cutByIndex.set(i, { from: cut.from, to: cut.to });
    }
  }

  const polys = centers.map((c, i) => {
    const cut = cutByIndex.get(i);
    if (cut) {
      const keepStart = cut.to;
      const keepEnd = cut.from;
      const sectorSteps = Math.max(24, Math.round(steps / 2));
      return [
        [sectorRingLonLat(c, radiusM, keepStart, keepEnd, sectorSteps)],
      ];
    }
    return [[circleRingLonLat(c, radiusM, steps)]];
  });

  let united = polys[0];
  for (let i = 1; i < polys.length; i++) {
    united = polygonClipping.union(united, polys[i]);
  }

  if (!united?.length) return [];

  let best = united[0];
  let bestArea = ringAreaAbs(best[0]);
  for (let i = 1; i < united.length; i++) {
    const a = ringAreaAbs(united[i][0]);
    if (a > bestArea) {
      bestArea = a;
      best = united[i];
    }
  }

  const outer = best[0];
  return outer.slice(0, -1).map(([lon, lat]) => [
    Number(lat.toFixed(6)),
    Number(lon.toFixed(6)),
  ]);
}

/**
 * Anillo [lon, lat] del lado mar (estribor al recorrer la costa 1→N).
 * Cierra lejos costa afuera para usar como máscara de agua.
 */
export function buildSeawardClipRingLonLat(coastLatLon, offshoreDeg = 1.25) {
  if (!coastLatLon?.length) return [];
  const ring = coastLatLon.map(([lat, lon]) => [lon, lat]);
  const first = coastLatLon[0];
  const last = coastLatLon[coastLatLon.length - 1];
  const lons = coastLatLon.map((p) => p[1]);
  const lats = coastLatLon.map((p) => p[0]);
  const minLon = Math.min(...lons) - offshoreDeg;
  const maxLon = Math.max(...lons) + offshoreDeg;
  const southLat = Math.min(...lats) - offshoreDeg * 1.6;

  /* Chuy → este → sur → oeste → vuelta al km 0 por el agua. */
  ring.push([last[1] + offshoreDeg, last[0]]);
  ring.push([maxLon, southLat]);
  ring.push([minLon, southLat]);
  ring.push([first[1] - offshoreDeg * 0.35, first[0] + 0.05]);
  ring.push([first[1], first[0]]);
  return ring;
}

/**
 * Intersecta el polígono de franja con el lado mar de la costa
 * (saca lo que cae sobre tierra uruguaya hacia el interior).
 */
export function clipPolygonToSeawardOfCoast(positions, coastLatLon) {
  if (!positions?.length || !coastLatLon?.length) return positions || [];

  const waterRing = buildSeawardClipRingLonLat(coastLatLon);
  const subject = [
    [
      [
        ...positions.map(([lat, lon]) => [lon, lat]),
        [positions[0][1], positions[0][0]],
      ],
    ],
  ];
  const clip = [[waterRing]];
  const clipped = polygonClipping.intersection(subject, clip);
  if (!clipped?.length) return [];

  let best = clipped[0];
  let bestArea = ringAreaAbs(best[0]);
  for (let i = 1; i < clipped.length; i++) {
    const a = ringAreaAbs(clipped[i][0]);
    if (a > bestArea) {
      bestArea = a;
      best = clipped[i];
    }
  }

  const outer = best[0];
  return outer.slice(0, -1).map(([lon, lat]) => [
    Number(lat.toFixed(6)),
    Number(lon.toFixed(6)),
  ]);
}

/** Área abs. aproximada (shoelace) en grados² — solo para elegir el anillo mayor. */
function ringAreaAbs(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum / 2);
}
