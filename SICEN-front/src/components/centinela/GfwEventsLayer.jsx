import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, useMap, useMapEvents } from "react-leaflet";
import {
  GFW_DISCLAIMER,
  GFW_TERMS_URL,
  INTEL_ITEMS_BY_ID,
} from "../../constants/centinelaIntelLayers.js";
import { gfwFetchEvents } from "../../api/client.js";
import { formatCoordDms } from "../../utils/geoDms.js";
import { stopLeafletMapClick } from "../../utils/stopLeafletMapClick.js";

const REFRESH_MS = 5 * 60_000;
const BOUNDS_DEBOUNCE_MS = 800;

const TYPE_META = {
  fishing: { label: "Pesca aparente (GFW)", color: "#5dade2" },
  encounter: { label: "Encounter STS (GFW)", color: "#af7ac5" },
  gap: { label: "Gap AIS (GFW)", color: "#922b21" },
};

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function gfwEventTitle(event) {
  const label = TYPE_META[event?.eventType]?.label || "GFW";
  const name = event?.vessel?.name?.trim();
  return name ? `${label}: ${name}` : label;
}

export function GfwEventDetailBody({ event }) {
  if (!event) return null;
  const meta = TYPE_META[event.eventType] || { label: event.eventType };
  return (
    <div className="centinela-skylight-popup">
      <div className="centinela-skylight-popup__name">{gfwEventTitle(event)}</div>
      <ul className="centinela-skylight-popup__meta list-unstyled mb-0">
        <li>Tipo: {meta.label}</li>
        {event.encounterType ? <li>Encuentro: {event.encounterType}</li> : null}
        <li>Inicio: {formatWhen(event.startTime)}</li>
        {event.endTime && event.endTime !== event.startTime ? (
          <li>Fin: {formatWhen(event.endTime)}</li>
        ) : null}
        <li>Lat. {formatCoordDms(event.lat, "lat")}</li>
        <li>Long. {formatCoordDms(event.lon, "lng")}</li>
        {event.vessel?.name ? <li>Buque: {event.vessel.name}</li> : null}
        {event.vessel?.mmsi ? <li>MMSI {event.vessel.mmsi}</li> : null}
        {event.vessel?.flag ? <li>Bandera: {event.vessel.flag}</li> : null}
        {event.secondVessel?.name ? (
          <li>Segundo: {event.secondVessel.name}</li>
        ) : null}
      </ul>
      <p className="centinela-skylight-popup__vendor small text-muted mb-0 mt-2">
        {GFW_DISCLAIMER}{" "}
        <a href={GFW_TERMS_URL} target="_blank" rel="noopener noreferrer">
          Términos GFW
        </a>
      </p>
    </div>
  );
}

/**
 * Capa de eventos GFW (pesca / encounters / gaps) por bbox del viewport.
 */
export function GfwEventsLayer({
  enabled,
  eventTypes = [],
  selectedEventId = null,
  onStatusChange,
  onSelectEvent,
  onOpenDetail,
}) {
  const map = useMap();
  const [events, setEvents] = useState([]);
  const [boundsVersion, setBoundsVersion] = useState(0);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const typesKey = useMemo(
    () => [...eventTypes].filter(Boolean).sort().join(","),
    [eventTypes]
  );

  useMapEvents({
    moveend() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setBoundsVersion((n) => n + 1);
      }, BOUNDS_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    if (!enabled || !typesKey) {
      setEvents([]);
      onStatusChange?.({
        loading: false,
        error: null,
        eventCount: 0,
        configured: true,
      });
      return undefined;
    }

    const ac = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ac;

    let cancelled = false;
    async function load() {
      onStatusChange?.({
        loading: true,
        error: null,
        eventCount: events.length,
        configured: true,
      });
      try {
        const b = map.getBounds();
        const bbox = [
          b.getSouth(),
          b.getWest(),
          b.getNorth(),
          b.getEast(),
        ];
        const data = await gfwFetchEvents(
          {
            eventTypes: typesKey.split(","),
            bbox,
            lookbackDays: 14,
            limit: 250,
          },
          { signal: ac.signal }
        );
        if (cancelled) return;
        const list = Array.isArray(data?.events) ? data.events : [];
        setEvents(list);
        onStatusChange?.({
          loading: false,
          error: null,
          eventCount: list.length,
          configured: true,
        });
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        onStatusChange?.({
          loading: false,
          error: e?.message || "Error GFW",
          eventCount: 0,
          configured: true,
        });
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      ac.abort();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- events.length solo status inicial
  }, [enabled, typesKey, boundsVersion, map, onStatusChange]);

  if (!enabled || !typesKey) return null;

  return (
    <>
      {events.map((ev) => {
        if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) return null;
        const color = TYPE_META[ev.eventType]?.color || "#5dade2";
        const selected = selectedEventId && selectedEventId === ev.eventId;
        return (
          <CircleMarker
            key={ev.eventId}
            center={[ev.lat, ev.lon]}
            radius={selected ? 9 : 6}
            bubblingMouseEvents={false}
            pathOptions={{
              color: selected ? "#111" : "#fff",
              weight: selected ? 2 : 1,
              fillColor: color,
              fillOpacity: 0.85,
            }}
            eventHandlers={{
              click: (e) => {
                stopLeafletMapClick(e);
                const oe = e.originalEvent;
                onSelectEvent?.(ev.eventId);
                onOpenDetail?.({
                  id: `gfw:${ev.eventId}`,
                  title: gfwEventTitle(ev),
                  anchor:
                    Number.isFinite(oe?.clientX) &&
                    Number.isFinite(oe?.clientY)
                      ? { x: oe.clientX, y: oe.clientY }
                      : null,
                  body: <GfwEventDetailBody event={ev} />,
                });
              },
            }}
          />
        );
      })}
    </>
  );
}

/** Color de swatch para un ítem intel GFW (UI). */
export function gfwIntelSwatchColor(intelId) {
  const item = INTEL_ITEMS_BY_ID[intelId];
  return item?.color || "#5dade2";
}
