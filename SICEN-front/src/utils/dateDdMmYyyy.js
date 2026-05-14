/** Patrón estricto dd/mm/aaaa (día y mes con 2 dígitos). */
const RE_DD_MM_YYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const RE_ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * @param {string} s
 * @returns {Date|null} fecha local medianoche o null si no es válida
 */
export function parseDdMmYyyy(s) {
  const t = String(s ?? "").trim();
  const m = RE_DD_MM_YYYY.exec(t);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

/**
 * Fecha en formato de `input type="date"` (aaaa-mm-dd).
 * @param {string} s
 * @returns {Date|null}
 */
export function parseIsoDateString(s) {
  const t = String(s ?? "").trim();
  const m = RE_ISO_DATE.exec(t);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** Valor para `input type="date"` (ISO local). Vacío si no se puede interpretar. */
export function toHtmlDateInputValue(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (parseIsoDateString(t)) return t;
  const fromLegacy = parseDdMmYyyy(t);
  if (!fromLegacy) return "";
  return `${fromLegacy.getFullYear()}-${pad2(fromLegacy.getMonth() + 1)}-${pad2(fromLegacy.getDate())}`;
}

/** Muestra dd/mm/aaaa en tablas; cadena vacía si no hay dato; texto crudo si no es reconocible. */
export function formatDateForTableDisplay(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  const dt = parseIsoDateString(t) ?? parseDdMmYyyy(t);
  if (!dt) return t;
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** Medianoche local del calendario (sin hora). */
function startOfLocalDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * @param {string} rawVencimiento — ISO `aaaa-mm-dd` o `dd/mm/aaaa`
 * @returns {'expired'|'soon'|'ok'|null} `null` si no hay fecha válida
 */
export function certificateExpiryUrgency(rawVencimiento) {
  const t = String(rawVencimiento ?? "").trim();
  if (!t) return null;
  const expiry = parseIsoDateString(t) ?? parseDdMmYyyy(t);
  if (!expiry) return null;
  const today = startOfLocalDay(new Date());
  const expDay = startOfLocalDay(expiry);
  if (!today || !expDay) return null;
  const msPerDay = 86400000;
  const diffDays = Math.round((expDay - today) / msPerDay);
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "ok";
}