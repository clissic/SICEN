/** Rangos de arqueo bruto (TRB) para estadísticas del menú de buques. */
export const VESSEL_TONNAGE_BUCKET_DEFS = [
  { key: "lt150", label: "Menos de 150 TRB" },
  { key: "r150_299", label: "Entre 150 y 299 TRB" },
  { key: "r300_499", label: "Entre 300 y 499 TRB" },
  { key: "r500_3000", label: "Entre 500 y 3000 TRB" },
  { key: "r3000_10000", label: "Entre 3000 y 10000 TRB" },
  { key: "r10000_50000", label: "Entre 10000 y 50000 TRB" },
];

/**
 * Clasifica `generalInfo.grossTonnage` en un rango TRB.
 * @param {unknown} grossTonnage
 * @returns {"lt150"|"r150_299"|"r300_499"|"r500_3000"|"r3000_10000"|"r10000_50000"|"over_range"|null}
 *   `null` si no hay tonelaje válido; `over_range` si supera 50 000 TRB.
 */
export function classifyVesselGrossTonnage(grossTonnage) {
  const gt = parseGrossTonnageNumber(grossTonnage);
  if (!Number.isFinite(gt) || gt < 0) return null;
  if (gt < 150) return "lt150";
  if (gt <= 299) return "r150_299";
  if (gt <= 499) return "r300_499";
  if (gt <= 3000) return "r500_3000";
  if (gt <= 10000) return "r3000_10000";
  if (gt <= 50000) return "r10000_50000";
  return "over_range";
}

/**
 * @param {Map<string, number>} counts
 * @returns {{ label: string, count: number }[]}
 */
export function tonnageCountsToRows(counts) {
  return VESSEL_TONNAGE_BUCKET_DEFS.map((def) => ({
    label: def.label,
    count: counts.get(def.key) || 0,
  }));
}

/** Rangos TRB para buques deportivos (menú de estadísticas). */
export const SPORT_VESSEL_TONNAGE_BUCKET_DEFS = [
  { key: "r0_0599", label: "De 0 a 0,599 TRB" },
  { key: "r0600_15", label: "De 0,600 a 1,5 TRB" },
  { key: "r15_6", label: "De 1,5 a 6 TRB" },
  { key: "r6_25", label: "De 6 a 25 TRB" },
  { key: "gt25", label: "Mayores a 25 TRB" },
];

function parseGrossTonnageNumber(grossTonnage) {
  return typeof grossTonnage === "number"
    ? grossTonnage
    : Number(String(grossTonnage ?? "").trim().replace(",", "."));
}

/**
 * Clasifica arqueo bruto de un buque deportivo.
 * @param {unknown} grossTonnage
 * @returns {"r0_0599"|"r0600_15"|"r15_6"|"r6_25"|"gt25"|null}
 */
export function classifySportVesselGrossTonnage(grossTonnage) {
  const gt = parseGrossTonnageNumber(grossTonnage);
  if (!Number.isFinite(gt) || gt < 0) return null;
  if (gt < 0.6) return "r0_0599";
  if (gt <= 1.5) return "r0600_15";
  if (gt <= 6) return "r15_6";
  if (gt <= 25) return "r6_25";
  return "gt25";
}

/**
 * @param {Map<string, number>} counts
 * @returns {{ label: string, count: number }[]}
 */
export function sportTonnageCountsToRows(counts) {
  return SPORT_VESSEL_TONNAGE_BUCKET_DEFS.map((def) => ({
    label: def.label,
    count: counts.get(def.key) || 0,
  }));
}
