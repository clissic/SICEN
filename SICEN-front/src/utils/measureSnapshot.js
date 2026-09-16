import {
  formatMeasureDistance,
  formatSegmentLabel,
  initialBearingDeg,
  labelRotationCssDeg,
  midpointLatLng,
  destinationLatLng,
  distanceMeters,
} from "../utils/geoMeasure.js";

export function segmentNet(a, b, deductRadiusM = 0) {
  const raw = distanceMeters(a.lat, a.lng, b.lat, b.lng);
  const bearing = initialBearingDeg(a.lat, a.lng, b.lat, b.lng);
  const meters = Math.max(0, raw - (deductRadiusM || 0));
  let lineStart = a;
  let mid;
  if (deductRadiusM > 0 && raw > deductRadiusM) {
    lineStart = destinationLatLng(a.lat, a.lng, bearing, deductRadiusM);
    mid = midpointLatLng(lineStart.lat, lineStart.lng, b.lat, b.lng);
  } else if (deductRadiusM > 0) {
    lineStart = null;
    mid = midpointLatLng(a.lat, a.lng, b.lat, b.lng);
  } else {
    mid = midpointLatLng(a.lat, a.lng, b.lat, b.lng);
  }
  return { raw, meters, bearing, mid, lineStart };
}

export function measureLabelIcon(L, text, bearingDeg) {
  const rot = labelRotationCssDeg(bearingDeg);
  return L.divIcon({
    className: "centinela-measure-label",
    html: `<span class="centinela-measure-label__text" style="transform:translate(-50%,-50%) rotate(${rot}deg) translateY(-0.7rem)">${text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Nombre de medición: debajo de la línea, alineado al rumbo del tramo. */
export function measureNameLabelIcon(L, text, bearingDeg = 90) {
  const safe = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const rot = labelRotationCssDeg(bearingDeg);
  return L.divIcon({
    className: "centinela-feature-name-label",
    html: `<span class="centinela-feature-name-label__text" style="transform:translate(-50%,-50%) rotate(${rot}deg) translateY(0.75rem)">${safe}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const LINE_STYLE = {
  color: "#f59e0b",
  weight: 2.5,
  opacity: 0.95,
  dashArray: "7 7",
  lineCap: "round",
  lineJoin: "round",
  interactive: false,
};

const CIRCLE_STYLE = {
  color: "#f59e0b",
  weight: 2,
  opacity: 0.9,
  dashArray: "7 7",
  fillColor: "#f59e0b",
  fillOpacity: 0.06,
  interactive: false,
};

const VERTEX_STYLE = {
  radius: 5,
  color: "#ffffff",
  weight: 2,
  fillColor: "#f59e0b",
  fillOpacity: 1,
  opacity: 1,
  interactive: false,
};

/**
 * Pinta una medición guardada (solo lectura) en un layerGroup Leaflet.
 */
export function paintSavedMeasurement(L, group, measurement, { showName = false } = {}) {
  if (!group || !measurement) return;
  const pts = Array.isArray(measurement.points) ? measurement.points : [];
  const deducts = Array.isArray(measurement.deducts) ? measurement.deducts : [];
  const circles = Array.isArray(measurement.circles) ? measurement.circles : [];
  const u = measurement.unit === "km" ? "km" : "nm";

  for (const c of circles) {
    if (!c?.center || !c?.edge || !(c.radiusM > 0)) continue;
    L.circle(c.center, { ...CIRCLE_STYLE, radius: c.radiusM }).addTo(group);
    L.polyline([c.center, c.edge], LINE_STYLE).addTo(group);
    const bearing = initialBearingDeg(
      c.center.lat,
      c.center.lng,
      c.edge.lat,
      c.edge.lng
    );
    const mid = midpointLatLng(
      c.center.lat,
      c.center.lng,
      c.edge.lat,
      c.edge.lng
    );
    L.marker(mid, {
      icon: measureLabelIcon(L, formatMeasureDistance(c.radiusM, u), bearing),
      interactive: false,
      keyboard: false,
    }).addTo(group);
    L.circleMarker(c.center, VERTEX_STYLE).addTo(group);
    L.circleMarker(c.edge, VERTEX_STYLE).addTo(group);
  }

  for (let i = 0; i < pts.length; i += 1) {
    L.circleMarker(pts[i], VERTEX_STYLE).addTo(group);
    if (i === 0) continue;
    const { meters, bearing, mid, lineStart } = segmentNet(
      pts[i - 1],
      pts[i],
      deducts[i - 1] || 0
    );
    if (lineStart) {
      L.polyline([lineStart, pts[i]], LINE_STYLE).addTo(group);
    }
    if (meters > 0 || !(deducts[i - 1] > 0)) {
      L.marker(mid, {
        icon: measureLabelIcon(
          L,
          formatSegmentLabel(meters, bearing, u),
          bearing
        ),
        interactive: false,
        keyboard: false,
      }).addTo(group);
    }
  }

  if (showName && measurement.name) {
    const place = measurementNamePlacement(pts, circles);
    if (place) {
      L.marker([place.lat, place.lng], {
        icon: measureNameLabelIcon(L, measurement.name, place.bearing),
        interactive: false,
        keyboard: false,
        zIndexOffset: 200,
      }).addTo(group);
    }
  }
}

function measurementNamePlacement(pts, circles) {
  if (pts.length >= 2) {
    const mid = Math.floor((pts.length - 1) / 2);
    const a = pts[mid];
    const b = pts[mid + 1];
    const pos = midpointLatLng(a.lat, a.lng, b.lat, b.lng);
    return {
      lat: pos.lat,
      lng: pos.lng,
      bearing: initialBearingDeg(a.lat, a.lng, b.lat, b.lng),
    };
  }
  if (circles.length > 0) {
    const c = circles[0];
    const pos = midpointLatLng(
      c.center.lat,
      c.center.lng,
      c.edge.lat,
      c.edge.lng
    );
    return {
      lat: pos.lat,
      lng: pos.lng,
      bearing: initialBearingDeg(
        c.center.lat,
        c.center.lng,
        c.edge.lat,
        c.edge.lng
      ),
    };
  }
  if (pts.length === 1) {
    return { lat: pts[0].lat, lng: pts[0].lng, bearing: 90 };
  }
  return null;
}

export function canSaveMeasurementSnapshot(snap) {
  const pts = snap?.points?.length || 0;
  const circles = snap?.circles?.length || 0;
  return pts >= 2 || circles >= 1;
}

export function normalizeMeasurementSnapshot(snap) {
  const points = (snap?.points || [])
    .map((p) => ({
      lat: Number(p.lat),
      lng: Number(p.lng ?? p.lon),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const circles = (snap?.circles || [])
    .map((c) => ({
      center: {
        lat: Number(c?.center?.lat),
        lng: Number(c?.center?.lng ?? c?.center?.lon),
      },
      edge: {
        lat: Number(c?.edge?.lat),
        lng: Number(c?.edge?.lng ?? c?.edge?.lon),
      },
      radiusM: Number(c?.radiusM),
      centerIdx: Number.isFinite(Number(c?.centerIdx))
        ? Number(c.centerIdx)
        : -1,
    }))
    .filter(
      (c) =>
        Number.isFinite(c.center.lat) &&
        Number.isFinite(c.center.lng) &&
        Number.isFinite(c.edge.lat) &&
        Number.isFinite(c.edge.lng) &&
        c.radiusM > 0
    );
  const segmentCount = Math.max(0, points.length - 1);
  const deducts = Array.from({ length: segmentCount }, (_, i) => {
    const v = Number(snap?.deducts?.[i]);
    return Number.isFinite(v) ? v : 0;
  });
  const deductSource = Array.from({ length: segmentCount }, (_, i) => {
    const v = Number(snap?.deductSource?.[i]);
    return Number.isFinite(v) ? Math.trunc(v) : -1;
  });
  return {
    points,
    circles,
    deducts,
    deductSource,
    unit: snap?.unit === "km" ? "km" : "nm",
  };
}
