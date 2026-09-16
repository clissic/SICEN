/** Paleta de trazos para historial de varios buques a la vez. */
export const VESSEL_TRACK_COLORS = [
  "#0b6bcb",
  "#c0392b",
  "#1e8449",
  "#8e44ad",
  "#d35400",
  "#16a085",
  "#2980b9",
  "#c71585",
];

/** Elige el primer color libre de la paleta. */
export function pickVesselTrackColor(usedColors = []) {
  const used = new Set(
    (usedColors || []).map((c) => String(c || "").toLowerCase())
  );
  const free = VESSEL_TRACK_COLORS.find(
    (c) => !used.has(String(c).toLowerCase())
  );
  if (free) return free;
  return VESSEL_TRACK_COLORS[
    (usedColors?.length || 0) % VESSEL_TRACK_COLORS.length
  ];
}

/** Etiqueta UI: nombre → OMI → MMSI. */
export function vesselDisplayLabel({ name, imo, mmsi } = {}) {
  const n = String(name || "").trim();
  if (n) return n;
  if (imo != null && Number(imo) > 0) return `OMI ${imo}`;
  const m = String(mmsi || "").trim();
  if (m) return `MMSI ${m}`;
  return "Buque";
}
