import { BREVET_B_COAST_POINTS } from "../constants/brevetBCoastPoints.js";
import { buildSeawardClipRingLonLat } from "./mergeCirclesPolygon.js";

/**
 * Anillo de agua [lon, lat] para el Río de la Plata / Atlántico cercano
 * (lado mar de la costa uruguaya).
 */
export function getPlataWaterRingLonLat() {
  return buildSeawardClipRingLonLat(BREVET_B_COAST_POINTS, 4.5);
}

/**
 * Polígono aproximado de tierra argentina (BA / costa) que cae dentro del
 * anillo seaward uruguayo y no debe mostrar corrientes.
 * Coordenadas [lon, lat].
 */
export function getArgentinaLandRingLonLat() {
  return [
    [-58.95, -33.55],
    [-58.55, -33.75],
    [-58.45, -34.05],
    [-58.35, -34.35],
    [-58.2, -34.55],
    [-57.95, -34.75],
    [-57.55, -35.05],
    [-57.15, -35.45],
    [-56.85, -36.05],
    [-56.65, -36.85],
    [-56.55, -38.2],
    [-62.2, -38.2],
    [-62.2, -33.55],
    [-58.95, -33.55],
  ];
}

function pathRing(ctx, map, ringLonLat) {
  if (!ringLonLat?.length) return;
  for (let i = 0; i < ringLonLat.length; i += 1) {
    const [lon, lat] = ringLonLat[i];
    const p = map.latLngToContainerPoint([lat, lon]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

/**
 * Recorta el canvas ambiental: solo queda contenido sobre agua.
 * destination-in (anillo Plata) + destination-out (tierra AR aproximada).
 * Si el backing store está en device pixels (width ≠ size.x), fuerza
 * transform a espacio CSS para alinear con latLngToContainerPoint.
 */
export function applyCurrentsWaterMask(map, canvas) {
  if (!map || !canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = map.getSize();
  const water = getPlataWaterRingLonLat();
  const landAr = getArgentinaLandRingLonLat();

  ctx.save();
  ctx.globalAlpha = 1;

  if (size.x > 0 && Math.abs(canvas.width - size.x) > 1) {
    const dpr = canvas.width / size.x;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  pathRing(ctx, map, water);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  pathRing(ctx, map, landAr);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

/** Ray casting [lon,lat] ring. */
function pointInRingLonLat(lon, lat, ring) {
  if (!ring?.length) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** ¿El punto está en agua (máscara de corrientes)? */
export function isCurrentsWaterPoint(lat, lon) {
  const water = getPlataWaterRingLonLat();
  const landAr = getArgentinaLandRingLonLat();
  if (!pointInRingLonLat(lon, lat, water)) return false;
  if (pointInRingLonLat(lon, lat, landAr)) return false;
  return true;
}
