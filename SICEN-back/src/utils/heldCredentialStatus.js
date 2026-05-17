/** Estados que el usuario puede elegir en formularios (no incluye VENCIDO). */
export const SEAFARER_HELD_CREDENTIAL_USER_STATUS_VALUES = [
  "ACTIVO",
  "SUSPENDIDO",
  "REVOCADO",
];

const USER_STATUS_SET = new Set(SEAFARER_HELD_CREDENTIAL_USER_STATUS_VALUES);

function startOfLocalCalendarDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Vencido si la fecha de vencimiento es anterior al día de hoy (misma regla que el front).
 * @param {Date|string|null|undefined} expirationDate
 */
export function isHeldCredentialExpired(expirationDate) {
  if (expirationDate == null || expirationDate === "") return false;
  const expDay = startOfLocalCalendarDay(expirationDate);
  if (!expDay) return false;
  const today = startOfLocalCalendarDay(new Date());
  if (!today) return false;
  return expDay < today;
}

/**
 * Normaliza estado enviado por el cliente y aplica VENCIDO si corresponde por fecha.
 * @param {string} rawStatus
 * @param {Date|string|null|undefined} expirationDate
 */
export function resolveHeldCredentialStatus(rawStatus, expirationDate) {
  let st = String(rawStatus ?? "")
    .trim()
    .toUpperCase();
  if (!USER_STATUS_SET.has(st)) st = "ACTIVO";
  if (st === "ACTIVO" && isHeldCredentialExpired(expirationDate)) {
    return "VENCIDO";
  }
  return st;
}

/**
 * Actualiza títulos y licencias en un documento Mongoose según fechas de vencimiento.
 * @param {import("mongoose").Document} doc
 * @returns {boolean} true si hubo cambios
 */
export function syncHeldCredentialsExpiryOnDoc(doc) {
  let changed = false;

  const syncSub = (sub) => {
    const exp = sub.expirationDate;
    const current = String(sub.status ?? "ACTIVO").toUpperCase();
    if (current === "ACTIVO" && isHeldCredentialExpired(exp)) {
      sub.set("status", "VENCIDO");
      changed = true;
    } else if (current === "VENCIDO" && !isHeldCredentialExpired(exp)) {
      sub.set("status", "ACTIVO");
      changed = true;
    }
  };

  if (Array.isArray(doc.titles)) {
    for (const sub of doc.titles) syncSub(sub);
  }
  if (Array.isArray(doc.heldLicenses)) {
    for (const sub of doc.heldLicenses) syncSub(sub);
  }

  if (changed) {
    doc.markModified("titles");
    doc.markModified("heldLicenses");
  }
  return changed;
}
