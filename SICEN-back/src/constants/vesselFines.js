/** Estados de multa (misma convención que multas vehiculares). */
export const VESSEL_FINE_STATUS_VALUES = ["due", "paid", "cancelled"];

function str(v) {
  return v == null ? "" : String(v).trim();
}

/**
 * @param {object} raw
 * @param {{ fineAuthor?: string, lastModifiedBy?: string }} [opts]
 */
export function normalizeVesselFinePayload(raw, opts = {}) {
  const o = raw && typeof raw === "object" ? raw : {};
  const amount = Number(o.fine_amount);
  const extra = Number(o.fine_extra_amount);
  return {
    vesselId: str(o.vesselId ?? o.vessel_id),
    fine_date: str(o.fine_date),
    fine_time: str(o.fine_time),
    fine_article: str(o.fine_article),
    fine_amount: Number.isFinite(amount) ? amount : NaN,
    fine_extra_amount: Number.isFinite(extra) ? extra : 0,
    fine_author: str(o.fine_author) || str(opts.fineAuthor),
    fine_proves: str(o.fine_proves),
    fine_status: str(o.fine_status) || "due",
    owner_ci: str(o.owner_ci),
    owner_name: str(o.owner_name),
    owner_tel: str(o.owner_tel),
    owner_dir: str(o.owner_dir),
    last_modified_by: str(opts.lastModifiedBy) || "S/M",
  };
}

/**
 * @param {ReturnType<typeof normalizeVesselFinePayload>} p
 * @returns {string|null}
 */
export function validateVesselFinePayload(p) {
  if (!p.vesselId) return "Indique el buque asociado a la multa.";
  if (!p.fine_date) return "Indique la fecha de la multa.";
  if (!p.fine_time) return "Indique la hora de la multa.";
  if (!p.fine_article) return "Indique el artículo infringido.";
  if (!Number.isFinite(p.fine_amount) || p.fine_amount < 0) {
    return "Indique un importe de multa válido (mayor o igual a cero).";
  }
  if (p.fine_extra_amount != null && p.fine_extra_amount < 0) {
    return "El importe adicional no puede ser negativo.";
  }
  if (!p.fine_proves) return "Indique las pruebas o constancias de la multa.";
  if (!p.fine_author) return "No se pudo determinar el autor de la multa.";
  const st = str(p.fine_status).toLowerCase();
  if (st && !VESSEL_FINE_STATUS_VALUES.includes(st)) {
    return "Estado de multa no válido.";
  }
  return null;
}
