/**
 * Búsqueda de buques por nombre (parcial, sin mayúsculas ni tildes), MMSI, OMI o indicativo.
 * Misma escala de puntaje que el buscador del front (CentinelaVesselSearch).
 */

export function normalizeVesselSearchQuery(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function compact(value) {
  return normalizeVesselSearchQuery(value).replace(/\s/g, "");
}

/** @returns {number} 0 = no matchea; mayor = mejor. */
export function scoreVesselMatch(vessel, query) {
  const q = normalizeVesselSearchQuery(query);
  if (!q) return 0;
  const name = normalizeVesselSearchQuery(vessel?.name);
  const callsign = compact(vessel?.callsign);
  const mmsi = String(vessel?.mmsi ?? "").trim();
  const imo =
    vessel?.imo != null && Number(vessel.imo) > 0 ? String(vessel.imo).trim() : "";
  const qDigits = q.replace(/\D/g, "");
  const qCompact = q.replace(/\s/g, "");
  const qIsNumeric = qDigits.length > 0 && /^\d[\d\s]*$/.test(q);

  if (qIsNumeric && mmsi && mmsi === qDigits) return 100;
  if (qIsNumeric && imo && imo === qDigits) return 95;
  if (name && name === q) return 90;
  if (callsign && callsign === qCompact) return 88;
  if (name && name.startsWith(q)) return 80;
  if (name && name.includes(q)) return 70;
  if (name && qCompact.length >= 3 && name.replace(/\s/g, "").includes(qCompact)) return 65;
  const tokens = q.split(" ").filter(Boolean);
  const words = name ? name.split(" ") : [];
  if (name && tokens.length > 1 && tokens.every((t) => words.some((w) => w.startsWith(t)))) {
    return 62; // todas las palabras de la query son inicio de alguna palabra del nombre
  }
  if (qDigits.length >= 3 && qIsNumeric && mmsi && mmsi.includes(qDigits)) return 60;
  if (qDigits.length >= 3 && qIsNumeric && imo && imo.includes(qDigits)) return 55;
  if (callsign && qCompact.length >= 2 && callsign.includes(qCompact)) return 50;
  return 0;
}

/**
 * @param {object[]} vessels
 * @param {string} query
 * @param {{limit?: number}} [opts]
 * @returns {object[]} buques ordenados por puntaje y recencia
 */
export function searchVessels(vessels, query, { limit = 20 } = {}) {
  const q = normalizeVesselSearchQuery(query);
  if (!q) return [];
  const hits = [];
  for (const v of vessels || []) {
    const score = scoreVesselMatch(v, q);
    if (score > 0) hits.push({ v, score });
  }
  hits.sort(
    (a, b) => b.score - a.score || (Number(b.v.updatedAt) || 0) - (Number(a.v.updatedAt) || 0)
  );
  const max = Math.max(1, Math.min(Number(limit) || 20, 100));
  return hits.slice(0, max).map(({ v, score }) => ({ ...v, searchScore: score }));
}
