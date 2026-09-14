import {
  SKYLIGHT_EVENT_TYPE_LABELS,
  SKYLIGHT_LAYERS_BY_ID,
} from "../constants/skylightLayers.js";
import { formatCoordDms } from "../utils/geoDms.js";

export const SKYLIGHT_BEHAVIOR_TYPES = new Set([
  "fishing_activity_history",
  "standard_rendezvous",
  "dark_rendezvous",
]);

export function skylightMarkerColor(event) {
  if (event?.details?.detectionType === "dark") return "#c0392b";
  const layer = SKYLIGHT_LAYERS_BY_ID[event?.eventType];
  return layer?.color || "#7f8c8d";
}

export function skylightEventTitle(event) {
  const v0 = event?.vessels?.vessel0;
  if (v0?.name?.trim()) return v0.name.trim();
  if (v0?.mmsi) return `MMSI ${v0.mmsi}`;
  if (event?.details?.detectionType === "dark") return "Sin AIS (dark)";
  const v1 = event?.vessels?.vessel1;
  if (v1?.name?.trim()) return v1.name.trim();
  if (v1?.mmsi) return `MMSI ${v1.mmsi}`;
  return "Sin nombre";
}

export function skylightEventTypeLabel(eventType) {
  return SKYLIGHT_EVENT_TYPE_LABELS[eventType] || eventType || "Evento";
}

export function formatSkylightWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-UY", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function skylightEventSubtitle(event) {
  const parts = [];
  parts.push(skylightEventTypeLabel(event?.eventType));
  if (event?.details?.detectionType === "dark") parts.push("sin AIS");
  if (typeof event?.details?.fishingScore === "number") {
    parts.push(`pesca ${(event.details.fishingScore * 100).toFixed(0)}%`);
  }
  if (typeof event?.details?.osrScore === "number") {
    parts.push(`STS ${(event.details.osrScore * 100).toFixed(0)}%`);
  }
  if (event?.aoi?.aoiName) parts.push(event.aoi.aoiName);
  if (typeof event?.details?.entrySpeed === "number") {
    parts.push(`entrada ${event.details.entrySpeed.toFixed(1)} kn`);
  }
  if (typeof event?.details?.averageSpeed === "number") {
    parts.push(`media ${event.details.averageSpeed.toFixed(1)} kn`);
  }
  return parts.join(" · ");
}

export function skylightCoordsLabel(event) {
  if (!Number.isFinite(event?.lat) || !Number.isFinite(event?.lon)) return "—";
  return `${formatCoordDms(event.lat, "lat")} · ${formatCoordDms(event.lon, "lng")}`;
}

/** True si el evento tiene tramo inicio→fin distinto (pesca / rendezvous). */
export function skylightHasTrack(event) {
  if (!event) return false;
  if (!SKYLIGHT_BEHAVIOR_TYPES.has(event.eventType)) return false;
  if (!Number.isFinite(event.endLat) || !Number.isFinite(event.endLon)) {
    return false;
  }
  const dLat = Math.abs(event.endLat - event.lat);
  const dLon = Math.abs(event.endLon - event.lon);
  return dLat > 1e-5 || dLon > 1e-5;
}

/** MMSI normalizado (string) de vessel0/vessel1 de un evento. */
export function skylightEventMmsis(event) {
  const out = [];
  for (const key of ["vessel0", "vessel1"]) {
    const raw = event?.vessels?.[key]?.mmsi;
    if (raw == null || raw === "") continue;
    const mmsi = String(raw).trim();
    if (/^\d{5,9}$/.test(mmsi)) out.push(mmsi);
  }
  return out;
}

/**
 * Set de MMSI presentes en una lista de eventos Skylight.
 * @param {object[]} events
 * @returns {Set<string>}
 */
export function collectSkylightEventMmsis(events) {
  const set = new Set();
  if (!Array.isArray(events)) return set;
  for (const ev of events) {
    for (const mmsi of skylightEventMmsis(ev)) set.add(mmsi);
  }
  return set;
}

/**
 * Filtra eventos cuyo punto de inicio (o tramo) intersecta el viewport.
 * @param {object[]} events
 * @param {{ south: number, west: number, north: number, east: number } | null} bounds
 */
export function filterSkylightEventsInBounds(events, bounds) {
  if (!Array.isArray(events) || events.length === 0) return [];
  if (!bounds) return events;

  const { south, west, north, east } = bounds;
  const crossesAntimeridian = west > east;

  const pointIn = (lat, lon) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    if (lat < south || lat > north) return false;
    if (!crossesAntimeridian) return lon >= west && lon <= east;
    return lon >= west || lon <= east;
  };

  return events.filter((ev) => {
    if (pointIn(ev.lat, ev.lon)) return true;
    if (skylightHasTrack(ev) && pointIn(ev.endLat, ev.endLon)) return true;
    return false;
  });
}
