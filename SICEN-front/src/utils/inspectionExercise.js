/**
 * Ejercicio anual activo de Inspecciones (Estado Rector de Puertos).
 *
 * Los datos del módulo de Inspecciones se acotan por año natural ("ejercicio").
 * Este helper guarda el año elegido por el usuario en localStorage para que
 * todas las páginas del módulo (menú, ingreso, modificar, eliminar,
 * estadísticas) puedan leerlo y suscribirse a sus cambios sin pasarlo por
 * props ni por contexto global.
 */

const STORAGE_KEY = "sicen_inspection_active_year";
const CHANGE_EVENT = "sicen:inspection-active-year-change";

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** Año natural actual (en la zona horaria del navegador). */
export function currentExerciseYear() {
  return new Date().getFullYear();
}

/**
 * Devuelve el año activo guardado o `null` si nunca se seleccionó.
 * Los consumidores que necesiten un fallback deben hacer
 * `getActiveInspectionYear() ?? currentExerciseYear()`.
 */
export function getActiveInspectionYear() {
  if (typeof window === "undefined") return null;
  try {
    return safeNumber(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Persiste el año activo (o lo limpia si se pasa `null`/`undefined`/`""`).
 * Emite el evento `sicen:inspection-active-year-change` para que cualquier
 * componente suscrito vía `subscribeActiveInspectionYear` se entere.
 */
export function setActiveInspectionYear(year) {
  if (typeof window === "undefined") return;
  try {
    if (year == null || year === "") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const n = safeNumber(year);
      if (n == null) return;
      localStorage.setItem(STORAGE_KEY, String(n));
    }
  } catch {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, { detail: getActiveInspectionYear() })
  );
}

/**
 * Suscribe un callback a los cambios del año activo. Devuelve una función para
 * desuscribirse.
 *
 * @param {(year: number | null) => void} callback
 * @returns {() => void}
 */
export function subscribeActiveInspectionYear(callback) {
  if (typeof window === "undefined" || typeof callback !== "function") {
    return () => {};
  }
  const onCustom = (e) => callback(safeNumber(e?.detail) ?? null);
  const onStorage = (e) => {
    if (e.key !== STORAGE_KEY) return;
    callback(safeNumber(e.newValue) ?? null);
  };
  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
