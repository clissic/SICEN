import {
  SKYLIGHT_ZONE_AOI_OVERRIDES,
} from "../constants/skylightLayers.js";

function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza nombres para emparejar zona local ↔ AOI Skylight. */
export function normalizeSkylightName(name) {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/["'«»]/g, " ")
    .replace(/\b(zona|de|del|la|las|los|el|y|aoi|area|área)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenSet(normalized) {
  return new Set(normalized.split(" ").filter((t) => t.length >= 2));
}

function scoreNameMatch(zoneName, aoiName) {
  const a = normalizeSkylightName(zoneName);
  const b = normalizeSkylightName(aoiName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = new Set([...ta, ...tb]).size;
  return inter / union;
}

/**
 * Empareja zonas locales con AOIs Skylight (overrides manuales + nombre).
 * @param {{ id: string, name: string }[]} zones
 * @param {{ aoiId: string, name: string|null, positions?: number[][] }[]} aois
 * @returns {{
 *   matches: { zoneId: string, zoneName: string, aoiId: string, aoiName: string|null, score: number, source: 'override'|'name' }[],
 *   byZoneId: Record<string, string>,
 *   unmatchedZones: string[],
 *   unmatchedAois: string[],
 * }}
 */
export function matchZonesToSkylightAois(zones, aois) {
  const matches = [];
  const usedAoi = new Set();
  const byZoneId = {};

  for (const zone of zones || []) {
    const override = SKYLIGHT_ZONE_AOI_OVERRIDES[zone.id];
    if (override) {
      const aoi = (aois || []).find((a) => a.aoiId === override);
      matches.push({
        zoneId: zone.id,
        zoneName: zone.name,
        aoiId: override,
        aoiName: aoi?.name ?? null,
        score: 1,
        source: "override",
      });
      byZoneId[zone.id] = override;
      usedAoi.add(override);
    }
  }

  for (const zone of zones || []) {
    if (byZoneId[zone.id]) continue;
    let best = null;
    for (const aoi of aois || []) {
      if (!aoi?.aoiId || usedAoi.has(aoi.aoiId) || !aoi.name) continue;
      const score = scoreNameMatch(zone.name, aoi.name);
      if (score < 0.45) continue;
      if (!best || score > best.score) {
        best = { aoi, score };
      }
    }
    if (best) {
      matches.push({
        zoneId: zone.id,
        zoneName: zone.name,
        aoiId: best.aoi.aoiId,
        aoiName: best.aoi.name,
        score: best.score,
        source: "name",
      });
      byZoneId[zone.id] = best.aoi.aoiId;
      usedAoi.add(best.aoi.aoiId);
    }
  }

  return {
    matches,
    byZoneId,
    unmatchedZones: (zones || [])
      .filter((z) => !byZoneId[z.id])
      .map((z) => z.id),
    unmatchedAois: (aois || [])
      .filter((a) => a.aoiId && !usedAoi.has(a.aoiId))
      .map((a) => a.aoiId),
  };
}

/**
 * Construye polígonos de zonas sincronizadas (estilo Skylight) a partir de matches.
 */
export function buildSyncedZonePolygons(zones, aois, byZoneId) {
  const aoiById = Object.fromEntries(
    (aois || []).filter((a) => a.aoiId).map((a) => [a.aoiId, a])
  );
  const out = [];
  for (const zone of zones || []) {
    const aoiId = byZoneId?.[zone.id];
    if (!aoiId) continue;
    const aoi = aoiById[aoiId];
    const positions =
      Array.isArray(aoi?.positions) && aoi.positions.length >= 3
        ? aoi.positions
        : zone.positions;
    if (!Array.isArray(positions) || positions.length < 3) continue;
    out.push({
      id: `skylight-sync-${zone.id}`,
      zoneId: zone.id,
      aoiId,
      name: `${zone.name} · Skylight`,
      infoText: aoi?.name
        ? `AOI emparejada: ${aoi.name}`
        : "AOI Skylight sincronizada con la zona local.",
      color: "rgba(13, 148, 136, 0.22)",
      borderColor: "#0d9488",
      fillOpacity: 0.22,
      positions,
    });
  }
  return out;
}
