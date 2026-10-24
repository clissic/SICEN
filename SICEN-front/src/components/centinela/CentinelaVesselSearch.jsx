import { useEffect, useId, useRef, useState } from "react";
import { FIU_IUU_LAYER_LABELS } from "../../constants/fiuIuuLayers.js";
import { skylightEventTypeLabel } from "../../utils/skylightEventHelpers.js";

const MAX_HITS = 12;

const GFW_TYPE_LABELS = {
  fishing: "Pesca aparente (GFW)",
  encounter: "Encounter STS (GFW)",
  gap: "Gap AIS (GFW)",
};

/**
 * Normaliza texto de búsqueda (minúsculas, sin tildes, sin espacios de más).
 */
export function normalizeVesselSearchQuery(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function compact(value) {
  return normalizeVesselSearchQuery(value).replace(/\s/g, "");
}

/**
 * Puntúa una identidad (nombre / MMSI / OMI / indicativo / matrícula).
 * Mayor = mejor. 0 = no matchea.
 */
export function scoreIdentityMatch(identity, query) {
  const q = normalizeVesselSearchQuery(query);
  if (!q) return 0;

  const name = normalizeVesselSearchQuery(identity?.name);
  const callsign = compact(identity?.callsign);
  const registry = compact(identity?.registry);
  const mmsi = String(identity?.mmsi || "").trim();
  const imoRaw = identity?.imo;
  const imo =
    imoRaw != null && Number(imoRaw) > 0 ? String(imoRaw).trim() : "";
  const qDigits = q.replace(/\D/g, "");
  const qCompact = q.replace(/\s/g, "");
  const qIsNumeric = qDigits.length > 0 && /^\d[\d\s]*$/.test(q);

  if (qIsNumeric && mmsi && mmsi === qDigits) return 100;
  if (qIsNumeric && imo && imo === qDigits) return 95;
  if (name && name === q) return 90;
  if (callsign && callsign === qCompact) return 88;
  if (registry && registry === qCompact) return 85;
  if (name && name.startsWith(q)) return 80;
  if (name && name.includes(q)) return 70;
  const tokens = q.split(" ").filter(Boolean);
  const words = name ? name.split(" ") : [];
  if (name && qCompact.length >= 3 && name.replace(/\s/g, "").includes(qCompact)) return 65;
  if (name && tokens.length > 1 && tokens.every((t) => words.some((w) => w.startsWith(t)))) {
    return 62;
  }
  if (qDigits.length >= 3 && mmsi && mmsi.includes(qDigits)) return 60;
  if (qDigits.length >= 3 && imo && imo.includes(qDigits)) return 55;
  if (callsign && qCompact.length >= 2 && callsign.includes(qCompact)) return 50;
  if (registry && qCompact.length >= 2 && registry.includes(qCompact)) return 45;
  if (!qIsNumeric && mmsi && mmsi.includes(qCompact)) return 40;
  if (!qIsNumeric && imo && imo.includes(qCompact)) return 35;
  return 0;
}

/**
 * Puntúa un buque AIS frente a una query (nombre / MMSI / OMI / indicativo).
 * Mayor = mejor. 0 = no matchea.
 */
export function scoreVesselSearchMatch(vessel, query) {
  return scoreIdentityMatch(
    {
      name: vessel?.name,
      mmsi: vessel?.mmsi,
      imo: vessel?.imo,
      callsign: vessel?.callsign,
    },
    query
  );
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

function formatSearchWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function eventSubtitle(sourceLabel, whenIso, role) {
  return [sourceLabel, role === "second" ? "Segundo buque" : "", formatSearchWhen(whenIso)]
    .filter(Boolean)
    .join(" · ");
}

function recencyOf(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function pushHit(hits, query, hit) {
  const score = scoreIdentityMatch(hit.identity, query);
  if (score <= 0) return;
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  hits.push({ ...hit, lat, lon, score });
}

function pushEventVessels(hits, query, { event, vessels, kind, sourceLabel }) {
  vessels.forEach((entry, index) => {
    const vessel = entry?.vessel;
    if (!vessel) return;
    const role = entry.role || (index === 0 ? "primary" : "second");
    const name = String(vessel.name || "").trim();
    const mmsi = vessel.mmsi != null ? String(vessel.mmsi).trim() : "";
    pushHit(hits, query, {
      id: `${kind}:${event.eventId}:${role}:${mmsi || name || index}`,
      kind,
      title: name || (mmsi ? `MMSI ${mmsi}` : "Sin nombre"),
      subtitle: eventSubtitle(sourceLabel, event.startTime, role),
      lat: event.lat,
      lon: event.lon,
      recency: recencyOf(event.startTime),
      identity: {
        name: vessel.name,
        mmsi: vessel.mmsi,
        imo: vessel.imo,
        callsign: vessel.callsign || vessel.callSign,
      },
      event,
    });
  });
}

/** Hit de búsqueda para un buque AIS (store local o backend). */
export function aisVesselToSearchHit(vessel, query) {
  const hits = [];
  pushHit(hits, normalizeVesselSearchQuery(query), {
    id: `ais:${vessel?.mmsi}`,
    kind: "ais",
    title: String(vessel?.name || "").trim() || `MMSI ${vessel?.mmsi}`,
    subtitle: "Posición AIS",
    lat: vessel?.lat,
    lon: vessel?.lon,
    recency: Number(vessel?.updatedAt) || 0,
    identity: {
      name: vessel?.name,
      mmsi: vessel?.mmsi,
      imo: vessel?.imo,
      callsign: vessel?.callsign,
    },
    vessel,
  });
  return hits[0] || null;
}

/**
 * Une hits locales con buques AIS devueltos por el backend (sin duplicar MMSI).
 * Los datos del backend reemplazan a los locales (más frescos / completos).
 */
export function mergeRemoteAisHits(localHits, remoteVessels, query) {
  const byId = new Map((localHits || []).map((h) => [h.id, h]));
  for (const v of remoteVessels || []) {
    const hit = aisVesselToSearchHit(v, query);
    if (hit) byId.set(hit.id, hit);
  }
  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score || b.recency - a.recency)
    .slice(0, MAX_HITS);
}

/**
 * Coincidencias en todo lo que el mapa ya tiene cargado.
 * @returns {object[]}
 */
export function collectVesselSearchHits({
  query,
  aisVessels = [],
  skylightEvents = [],
  fiuEvents = [],
  gfwEvents = [],
  trackingItems = [],
} = {}) {
  const q = normalizeVesselSearchQuery(query);
  if (!q) return [];
  const hits = [];

  for (const vessel of aisVessels || []) {
    const hit = aisVesselToSearchHit(vessel, q);
    if (hit) hits.push(hit);
  }

  for (const event of skylightEvents || []) {
    pushEventVessels(hits, q, {
      event,
      kind: "skylight",
      sourceLabel: skylightEventTypeLabel(event?.eventType),
      vessels: [
        { vessel: event?.vessels?.vessel0, role: "primary" },
        { vessel: event?.vessels?.vessel1, role: "second" },
      ],
    });
  }

  for (const event of fiuEvents || []) {
    pushEventVessels(hits, q, {
      event,
      kind: "fiu",
      sourceLabel: FIU_IUU_LAYER_LABELS[event?.layerType] || "IUU LAC",
      vessels: [
        { vessel: event?.vessel, role: "primary" },
        { vessel: event?.secondVessel, role: "second" },
      ],
    });
  }

  for (const event of gfwEvents || []) {
    pushEventVessels(hits, q, {
      event,
      kind: "gfw",
      sourceLabel: GFW_TYPE_LABELS[event?.eventType] || "GFW",
      vessels: [
        { vessel: event?.vessel, role: "primary" },
        { vessel: event?.secondVessel, role: "second" },
      ],
    });
  }

  for (const item of trackingItems || []) {
    const lp = item?.lastPosition || item?.tracking?.lastPosition;
    pushHit(hits, q, {
      id: `sicen:${item?.movementId}`,
      kind: "sicen",
      title: String(item?.vesselName || "").trim() || "Posicionamiento SICEN",
      subtitle: "Posicionamiento SICEN",
      lat: lp?.latitude,
      lon: lp?.longitude,
      recency: recencyOf(lp?.positionTimestamp || lp?.receivedAt),
      identity: {
        name: item?.vesselName,
        registry: item?.vesselReg,
      },
      item,
    });
  }

  hits.sort((a, b) => b.score - a.score || b.recency - a.recency);
  return hits.slice(0, MAX_HITS);
}

/**
 * Input fijo (esquina superior derecha) + botón search.
 * Busca en AIS, eventos de inteligencia y posicionamiento SICEN cargados.
 */
export function CentinelaVesselSearch({
  vessels = [],
  skylightEvents = [],
  fiuEvents = [],
  gfwEvents = [],
  trackingItems = [],
  onSelectHit,
  searchRemoteAis = null,
}) {
  const inputId = useId();
  const listId = useId();
  const formRef = useRef(null);
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState(null);
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!hint) return undefined;
    const t = window.setTimeout(() => setHint(null), 3200);
    return () => window.clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    if (!results.length) return undefined;
    function onPointerDown(e) {
      if (formRef.current && !formRef.current.contains(e.target)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [results.length]);

  function corpusIsEmpty() {
    return (
      !vessels?.length &&
      !skylightEvents?.length &&
      !fiuEvents?.length &&
      !gfwEvents?.length &&
      !trackingItems?.length
    );
  }

  function choose(hit) {
    if (!hit) return;
    setHint(null);
    setResults([]);
    onSelectHit?.(hit);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (searching) return;
    const q = String(query || "").trim();
    if (!q) {
      setResults([]);
      setHint("Escribí un nombre, MMSI, OMI, indicativo o matrícula.");
      return;
    }
    if (results.length) {
      choose(results[activeIndex] || results[0]);
      return;
    }
    /* AIS: buscar también en el store del backend (no depende de que la capa esté activa). */
    let remoteVessels = [];
    if (searchRemoteAis) {
      setSearching(true);
      try {
        const res = await searchRemoteAis(q);
        remoteVessels = Array.isArray(res?.vessels) ? res.vessels : [];
      } catch {
        remoteVessels = [];
      } finally {
        setSearching(false);
      }
    }
    if (corpusIsEmpty() && !remoteVessels.length) {
      setHint("No hay datos cargados en el mapa para buscar.");
      return;
    }
    const localHits = collectVesselSearchHits({
      query: q,
      aisVessels: vessels,
      skylightEvents,
      fiuEvents,
      gfwEvents,
      trackingItems,
    });
    const hits = mergeRemoteAisHits(localHits, remoteVessels, q);
    if (!hits.length) {
      setResults([]);
      setHint("No se encontró ningún buque con ese dato.");
      return;
    }
    const onlyTitle = normalizeVesselSearchQuery(hits[0].title);
    const sameVesselAndSource = hits.every(
      (hit) =>
        hit.kind === hits[0].kind &&
        normalizeVesselSearchQuery(hit.title) === onlyTitle
    );
    if (hits.length === 1 || sameVesselAndSource) {
      choose(hits[0]);
      return;
    }
    setHint(null);
    setActiveIndex(0);
    setResults(hits);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setResults([]);
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    }
  }

  return (
    <form
      ref={formRef}
      className={[
        "centinela-vessel-search",
        results.length ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onSubmit={handleSubmit}
      role="search"
      aria-label="Buscar en el mapa"
    >
      <label className="visually-hidden" htmlFor={inputId}>
        Buscar por nombre, MMSI, OMI, indicativo o matrícula
      </label>
      <input
        id={inputId}
        type="search"
        className="centinela-vessel-search__input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (hint) setHint(null);
          if (results.length) setResults([]);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Nombre, MMSI, OMI…"
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={results.length ? listId : undefined}
        aria-activedescendant={
          results.length ? `${listId}-opt-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
      />
      <button
        type="submit"
        className="centinela-vessel-search__btn"
        aria-label="Buscar"
        disabled={searching}
      >
        <i className="bi bi-search" aria-hidden />
      </button>
      {results.length ? (
        <ul id={listId} className="centinela-vessel-search__results" role="listbox">
          {results.map((hit, index) => (
            <li key={hit.id} role="presentation">
              <button
                id={`${listId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={[
                  "centinela-vessel-search__option",
                  index === activeIndex ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(hit)}
              >
                <span className="centinela-vessel-search__option-title">
                  {hit.title}
                </span>
                <span className="centinela-vessel-search__option-meta">
                  {hit.subtitle}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {hint && !results.length ? (
        <p className="centinela-vessel-search__hint" role="status" aria-live="polite">
          {hint}
        </p>
      ) : null}
    </form>
  );
}
