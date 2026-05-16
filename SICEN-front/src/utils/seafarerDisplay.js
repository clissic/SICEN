import { formatDateForTableDisplay } from "./dateDdMmYyyy.js";

/** Valor para `<input type="date" />` (YYYY-MM-DD) o cadena vacía. */
export function seafarerDateToInputValue(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string" && v.includes("T")) {
    return v.slice(0, 10);
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

export function displaySeafarerDate(v) {
  if (v == null || v === "") return "—";
  let raw = v;
  if (typeof v === "string" && v.includes("T")) {
    raw = v.slice(0, 10);
  } else if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    raw = `${y}-${m}-${d}`;
  }
  const s = formatDateForTableDisplay(String(raw));
  return s || "—";
}

export function displaySeafarerText(v) {
  const t = String(v ?? "").trim();
  return t || "—";
}

export function displaySeafarerGeneralStatus(gs) {
  if (!gs || typeof gs !== "object") return "—";
  if (gs.deceased) return "Fallecido";
  if (gs.disqualified) return "Inhabilitado";
  if (gs.active) return "Activo";
  return "Inactivo";
}
