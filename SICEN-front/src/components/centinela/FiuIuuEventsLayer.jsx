import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  CircleMarker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  FIU_IUU_DASHBOARD_URL,
  FIU_IUU_DISCLAIMER,
  FIU_IUU_LAYER_COLORS,
  FIU_IUU_LAYER_LABELS,
  FIU_IUU_METHODOLOGY_URL,
} from "../../constants/fiuIuuLayers.js";
import { fiuIuuFetchEvents } from "../../api/client.js";
import { formatCoordDms } from "../../utils/geoDms.js";

const REFRESH_MS = 5 * 60_000;
const BOUNDS_DEBOUNCE_MS = 800;

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function VesselBlock({ label, vessel }) {
  if (!vessel) return null;
  return (
    <div className="centinela-skylight-popup__vessel">
      <div className="centinela-skylight-popup__vessel-title">{label}</div>
      <ul className="list-unstyled mb-0">
        <li>{vessel.name?.trim() || "Sin nombre"}</li>
        {vessel.mmsi ? <li>MMSI {vessel.mmsi}</li> : null}
        {vessel.imo != null && vessel.imo > 0 ? (
          <li>OMI {vessel.imo}</li>
        ) : null}
        {vessel.callSign ? <li>Indicativo: {vessel.callSign}</li> : null}
        {vessel.flag ? <li>Bandera: {vessel.flag}</li> : null}
        {vessel.class ? <li>Clase: {vessel.class}</li> : null}
        {vessel.iuuRisk ? <li>Riesgo IUU: {vessel.iuuRisk}</li> : null}
        {vessel.forcedLabor === true ? (
          <li>Trabajo forzoso: probable</li>
        ) : vessel.forcedLabor === false ? (
          <li>Trabajo forzoso: improbable</li>
        ) : null}
        {typeof vessel.length === "number" ? (
          <li>Eslora: {vessel.length} m</li>
        ) : null}
      </ul>
    </div>
  );
}

export function fiuIuuEventTitle(event) {
  const label = FIU_IUU_LAYER_LABELS[event?.layerType] || "IUU LAC";
  const name = event?.vessel?.name?.trim();
  return name ? `${label}: ${name}` : label;
}

export function FiuIuuEventDetailBody({ event }) {
  if (!event) return null;
  return (
    <div className="centinela-skylight-popup">
      <div className="centinela-skylight-popup__name">
        {fiuIuuEventTitle(event)}
      </div>
      <ul className="centinela-skylight-popup__meta list-unstyled mb-0">
        <li>
          Tipo: {FIU_IUU_LAYER_LABELS[event.layerType] || event.layerType}
        </li>
        {event.activityType ? <li>Actividad: {event.activityType}</li> : null}
        <li>Inicio: {formatWhen(event.startTime)}</li>
        {event.endTime && event.endTime !== event.startTime ? (
          <li>Fin: {formatWhen(event.endTime)}</li>
        ) : null}
        {typeof event.durationHours === "number" ? (
          <li>Duración: {event.durationHours.toFixed(1)} h</li>
        ) : null}
        {event.inProgress ? <li>Estado: en curso</li> : null}
        <li>Lat. {formatCoordDms(event.lat, "lat")}</li>
        <li>Long. {formatCoordDms(event.lon, "lng")}</li>
        {event.startLocationName ? (
          <li>Lugar inicio: {event.startLocationName}</li>
        ) : null}
        {event.endLocationName ? (
          <li>Lugar fin: {event.endLocationName}</li>
        ) : null}
      </ul>
      <VesselBlock label="Buque" vessel={event.vessel} />
      <VesselBlock label="Segundo buque" vessel={event.secondVessel} />
      <p className="centinela-skylight-popup__vendor small text-muted mb-0 mt-2">
        {FIU_IUU_DISCLAIMER}{" "}
        <a
          href={FIU_IUU_METHODOLOGY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Metodología
        </a>
        {" · "}
        <a
          href={FIU_IUU_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Dashboard FIU
        </a>
      </p>
    </div>
  );
}

function readBbox(map) {
  if (!map) return null;
  const b = map.getBounds();
  const south = b.getSouth();
  const west = b.getWest();
  const north = b.getNorth();
  const east = b.getEast();
  if (
    ![south, west, north, east].every(Number.isFinite) ||
    south >= north ||
    west >= east
  ) {
    return null;
  }
  return [south, west, north, east];
}

function hasTrack(ev) {
  return (
    Number.isFinite(ev?.endLat) &&
    Number.isFinite(ev?.endLon) &&
    (ev.endLat !== ev.lat || ev.endLon !== ev.lon)
  );
}

/**
 * Capa IUU LAC (FIU): markers + tramos start→end + detalle fijo.
 */
export function FiuIuuEventsLayer({
  layerTypes,
  enabled,
  selectedEventId = null,
  onStatusChange,
  onSelectEvent,
  onOpenDetail,
}) {
  const map = useMap();
  const [events, setEvents] = useState([]);
  const [bboxTick, setBboxTick] = useState(0);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const openedForIdRef = useRef(null);
  const onStatusRef = useRef(onStatusChange);
  const onOpenDetailRef = useRef(onOpenDetail);
  onStatusRef.current = onStatusChange;
  onOpenDetailRef.current = onOpenDetail;

  const typesKey = useMemo(
    () => [...(layerTypes || [])].sort().join("|"),
    [layerTypes]
  );

  useMapEvents({
    moveend() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setBboxTick((n) => n + 1);
      }, BOUNDS_DEBOUNCE_MS);
    },
    zoomend() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setBboxTick((n) => n + 1);
      }, BOUNDS_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      onStatusRef.current?.({
        loading: false,
        error: null,
        eventCount: 0,
        configured: true,
      });
      return undefined;
    }

    if (!layerTypes?.length) {
      setEvents([]);
      onStatusRef.current?.({
        loading: false,
        error: null,
        eventCount: 0,
        configured: true,
      });
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      onStatusRef.current?.({
        loading: true,
        error: null,
        eventCount: 0,
        configured: true,
      });

      try {
        const bbox = readBbox(map);
        const data = await fiuIuuFetchEvents(
          {
            layerTypes,
            bbox: bbox || undefined,
            limit: 400,
          },
          { signal: ac.signal }
        );

        if (cancelled) return;
        const list = Array.isArray(data?.events) ? data.events : [];
        setEvents(list);
        onStatusRef.current?.({
          loading: false,
          error: null,
          eventCount: list.length,
          configured: true,
          total: data?.total ?? list.length,
          fetchedAt: data?.fetchedAt ?? null,
        });
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        const msg =
          e?.message ||
          e?.msg ||
          "No se pudieron cargar los eventos IUU LAC (FIU).";
        setEvents([]);
        onStatusRef.current?.({
          loading: false,
          error: msg,
          eventCount: 0,
          configured: true,
        });
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [enabled, typesKey, map, bboxTick]);

  useEffect(() => {
    if (!selectedEventId || !enabled) {
      openedForIdRef.current = null;
      return;
    }
    const ev = events.find((e) => e.eventId === selectedEventId);
    if (!ev || !Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) return;

    // Solo abrir al elegir un evento; no reabrir tras refresh/pan del mapa.
    if (openedForIdRef.current === selectedEventId) return;
    openedForIdRef.current = selectedEventId;

    map.panTo([ev.lat, ev.lon], { animate: true });
    onOpenDetailRef.current?.({
      id: `fiuIuu:${ev.eventId}`,
      title: fiuIuuEventTitle(ev),
      body: <FiuIuuEventDetailBody event={ev} />,
    });
  }, [selectedEventId, events, enabled, map]);

  if (!enabled) return null;

  return (
    <>
      {events.map((ev) => {
        if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) return null;
        const color =
          FIU_IUU_LAYER_COLORS[ev.layerType] || "#34495e";
        const selected = selectedEventId === ev.eventId;
        const track = hasTrack(ev);
        const radius = selected ? 10 : track ? 8 : 7;

        return (
          <Fragment key={ev.eventId}>
            {track ? (
              <Polyline
                positions={[
                  [ev.lat, ev.lon],
                  [ev.endLat, ev.endLon],
                ]}
                pathOptions={{
                  color,
                  weight: selected ? 4 : 2.5,
                  opacity: selected ? 0.95 : 0.7,
                  dashArray: ev.layerType === "sts" ? "6 6" : undefined,
                }}
              />
            ) : null}
            <CircleMarker
              center={[ev.lat, ev.lon]}
              radius={radius}
              pathOptions={{
                color: "#fff",
                weight: selected ? 2.5 : 1.5,
                fillColor: color,
                fillOpacity: selected ? 1 : 0.9,
              }}
              eventHandlers={{
                click: (e) => {
                  if (e?.originalEvent) {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    L.DomEvent.preventDefault(e.originalEvent);
                  }
                  onSelectEvent?.(ev.eventId);
                },
              }}
            />
            {track ? (
              <CircleMarker
                center={[ev.endLat, ev.endLon]}
                radius={selected ? 6 : 4}
                pathOptions={{
                  color: "#fff",
                  weight: 1,
                  fillColor: color,
                  fillOpacity: 0.75,
                }}
                interactive={false}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
