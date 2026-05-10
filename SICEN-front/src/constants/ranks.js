export const RANK_OPTIONS = Object.freeze([
  "Almirante",
  "Contraalmirante",
  "Capitán de Navío",
  "Capitán de Fragata",
  "Capitán de Corbeta",
  "Teniente de Navío",
  "Alférez de Navío",
  "Alférez de Fragata",
  "Guardia Marina",
  "Sub Oficial de Cargo",
  "Sub Oficial de Primera",
  "Sub Oficial de Segunda",
  "Cabo de Primera",
  "Cabo de Segunda",
  "Marinero de Primera",
  "Personal Civil",
]);

/** Oficiales (primeras 9 jerarquías de `RANK_OPTIONS`). */
export const OFFICER_RANKS = new Set(RANK_OPTIONS.slice(0, 9));

/** Personal subalterno: jerarquías posteriores a oficiales, excluido Personal Civil. */
export const SUBALTERN_RANKS = new Set(RANK_OPTIONS.slice(9, -1));

export const CIVIL_RANK_LABEL = "Personal Civil";

/**
 * Totales por categoría según el grado (`rank`) de cada usuario.
 * `other`: grados no reconocidos en la lista oficial (datos históricos o typos).
 */
export function summarizeUsersByRank(users) {
  const out = {
    total: 0,
    officers: 0,
    subaltern: 0,
    civil: 0,
    other: 0,
  };
  if (!Array.isArray(users)) return out;
  out.total = users.length;
  for (const u of users) {
    const r = (u?.rank ?? "").trim();
    if (OFFICER_RANKS.has(r)) out.officers++;
    else if (SUBALTERN_RANKS.has(r)) out.subaltern++;
    else if (r === CIVIL_RANK_LABEL) out.civil++;
    else out.other++;
  }
  return out;
}

/**
 * Conteos por cada jerarquía oficial (`RANK_OPTIONS`), en orden, más una categoría
 * al final para grados no listados (mismo criterio que `summarizeUsersByRank` → `other`).
 * Solo incluye jerarquías con al menos un usuario (y "Otro…" si corresponde).
 * @returns {{ labels: string[], counts: number[] }}
 */
export function summarizeUsersByHierarchy(users) {
  const byRank = new Map();
  for (const label of RANK_OPTIONS) {
    byRank.set(label, 0);
  }
  let other = 0;
  if (!Array.isArray(users)) {
    return { labels: [], counts: [] };
  }
  for (const u of users) {
    const r = (u?.rank ?? "").trim();
    if (byRank.has(r)) {
      byRank.set(r, byRank.get(r) + 1);
    } else {
      other++;
    }
  }
  const labels = [];
  const counts = [];
  for (const label of RANK_OPTIONS) {
    const c = byRank.get(label);
    if (c > 0) {
      labels.push(label);
      counts.push(c);
    }
  }
  if (other > 0) {
    labels.push("Otro / sin clasificar");
    counts.push(other);
  }
  return { labels, counts };
}

