import { useEffect, useId, useState } from "react";

/**
 * Normaliza texto de búsqueda (minúsculas, sin espacios de más).
 */
export function normalizeVesselSearchQuery(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Puntúa un buque AIS frente a una query (nombre / MMSI / OMI).
 * Mayor = mejor. 0 = no matchea.
 */
export function scoreVesselSearchMatch(vessel, query) {
  const q = normalizeVesselSearchQuery(query);
  if (!q) return 0;

  const name = String(vessel?.name || "")
    .trim()
    .toLowerCase();
  const mmsi = String(vessel?.mmsi || "").trim();
  const imoRaw = vessel?.imo;
  const imo =
    imoRaw != null && Number(imoRaw) > 0 ? String(imoRaw).trim() : "";
  const qDigits = q.replace(/\D/g, "");
  const qIsNumeric = qDigits.length > 0 && /^\d[\d\s]*$/.test(q);

  if (qIsNumeric && mmsi && mmsi === qDigits) return 100;
  if (qIsNumeric && imo && imo === qDigits) return 95;
  if (name && name === q) return 90;
  if (name && name.startsWith(q)) return 80;
  if (name && name.includes(q)) return 70;
  if (qDigits.length >= 3 && mmsi && mmsi.includes(qDigits)) return 60;
  if (qDigits.length >= 3 && imo && imo.includes(qDigits)) return 55;
  if (!qIsNumeric && mmsi && mmsi.includes(q.replace(/\s/g, ""))) return 40;
  if (!qIsNumeric && imo && imo.includes(q.replace(/\s/g, ""))) return 35;
  return 0;
}

/**
 * Mejor match en una lista de buques AIS.
 * @returns {object|null}
 */
export function findBestVesselMatch(vessels, query) {
  let best = null;
  let bestScore = 0;
  for (const v of vessels || []) {
    const score = scoreVesselSearchMatch(v, query);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * Input fijo (esquina superior derecha) + botón search.
 * Busca buques AIS por nombre, MMSI u OMI.
 */
export function CentinelaVesselSearch({
  vessels = [],
  aisLayerOn = false,
  onSelectVessel,
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState(null);

  useEffect(() => {
    if (!hint) return undefined;
    const t = window.setTimeout(() => setHint(null), 3200);
    return () => window.clearTimeout(t);
  }, [hint]);

  function handleSubmit(e) {
    e.preventDefault();
    const q = String(query || "").trim();
    if (!q) {
      setHint("Escribí un nombre, MMSI u OMI.");
      return;
    }
    if (!aisLayerOn) {
      setHint("Activá la capa AIS para buscar buques.");
      return;
    }
    if (!vessels?.length) {
      setHint("No hay buques AIS cargados todavía.");
      return;
    }
    const match = findBestVesselMatch(vessels, q);
    if (!match) {
      setHint("No se encontró ningún buque con ese dato.");
      return;
    }
    if (!Number.isFinite(Number(match.lat)) || !Number.isFinite(Number(match.lon))) {
      setHint("El buque no tiene posición válida.");
      return;
    }
    setHint(null);
    onSelectVessel?.(match);
  }

  return (
    <form
      className="centinela-vessel-search"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Buscar buque"
    >
      <label className="visually-hidden" htmlFor={inputId}>
        Buscar buque por nombre, MMSI u OMI
      </label>
      <input
        id={inputId}
        type="search"
        className="centinela-vessel-search__input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (hint) setHint(null);
        }}
        placeholder="Nombre, MMSI u OMI"
        autoComplete="off"
        enterKeyHint="search"
      />
      <button
        type="submit"
        className="centinela-vessel-search__btn"
        aria-label="Buscar"
      >
        <i className="bi bi-search" aria-hidden />
      </button>
      {hint ? (
        <p className="centinela-vessel-search__hint" role="status" aria-live="polite">
          {hint}
        </p>
      ) : null}
    </form>
  );
}
