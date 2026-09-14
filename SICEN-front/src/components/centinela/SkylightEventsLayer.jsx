import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  CircleMarker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  SKYLIGHT_DEFAULT_LOOKBACK_HOURS,
  SKYLIGHT_EVENT_TYPE_LABELS,
} from "../../constants/skylightLayers.js";
import { skylightFetchEvents } from "../../api/client.js";
import { formatCoordDms } from "../../utils/geoDms.js";
import {
  formatSkylightWhen,
  skylightEventMmsis,
  skylightEventTitle,
  skylightHasTrack,
  skylightMarkerColor,
} from "../../utils/skylightEventHelpers.js";

const REFRESH_MS = 5 * 60_000;

const ALL_DETECTION_TYPES = [
  "sar_sentinel1",
  "eo_sentinel2",
  "eo_landsat_8_9",
  "viirs",
];

function VesselBlock({ label, vessel, onOpenDossier }) {
  if (!vessel) return null;
  const mmsi =
    vessel.mmsi != null && String(vessel.mmsi).trim()
      ? String(vessel.mmsi).trim()
      : null;
  return (
    <div className="centinela-skylight-popup__vessel">
      <div className="centinela-skylight-popup__vessel-title">{label}</div>
      <ul className="list-unstyled mb-0">
        <li>{vessel.name?.trim() || "Sin nombre"}</li>
        {mmsi ? <li>MMSI {mmsi}</li> : null}
        {vessel.imo != null && Number(vessel.imo) > 0 ? (
          <li>OMI {vessel.imo}</li>
        ) : null}
        {vessel.flag ? (
          <li>
            Bandera: {vessel.flag}
            {vessel.flagCode ? ` (${vessel.flagCode})` : ""}
          </li>
        ) : null}
        {vessel.vesselType || vessel.vesselCategory ? (
          <li>Tipo: {vessel.vesselType || vessel.vesselCategory}</li>
        ) : null}
      </ul>
      {mmsi && onOpenDossier ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary mt-1"
          onClick={() =>
            onOpenDossier({
              mmsi,
              name: vessel.name?.trim() || null,
              lat: null,
              lon: null,
            })
          }
        >
          Historial / predicción
        </button>
      ) : null}
    </div>
  );
}

/** Cuerpo de detalle de evento Skylight (ventana fija). */
export function SkylightEventDetailBody({ event, aisMatched, onOpenDossier }) {
  if (!event) return null;
  const d = event.details || {};
  return (
    <div className="centinela-skylight-popup">
      <div className="centinela-skylight-popup__name">
        {skylightEventTitle(event)}
      </div>
      {aisMatched ? (
        <div className="centinela-skylight-popup__match">Cruce AIS</div>
      ) : null}
      <ul className="centinela-skylight-popup__meta list-unstyled mb-0">
        <li>
          Tipo:{" "}
          {SKYLIGHT_EVENT_TYPE_LABELS[event.eventType] || event.eventType}
        </li>
        <li>Inicio: {formatSkylightWhen(event.startTime)}</li>
        {event.endTime && event.endTime !== event.startTime ? (
          <li>Fin: {formatSkylightWhen(event.endTime)}</li>
        ) : null}
        <li>Lat. {formatCoordDms(event.lat, "lat")}</li>
        <li>Long. {formatCoordDms(event.lon, "lng")}</li>
        {d.detectionType ? (
          <li>
            Correlación AIS:{" "}
            {d.detectionType === "dark" ? "Sin AIS (dark)" : "Correlacionado"}
          </li>
        ) : null}
        {typeof d.score === "number" ? (
          <li>Confianza: {(d.score * 100).toFixed(0)}%</li>
        ) : null}
        {typeof d.fishingScore === "number" ? (
          <li>Score pesca: {(d.fishingScore * 100).toFixed(0)}%</li>
        ) : null}
        {typeof d.osrScore === "number" ? (
          <li>Score STS: {(d.osrScore * 100).toFixed(0)}%</li>
        ) : null}
        {event.aoi?.aoiName ? <li>AOI: {event.aoi.aoiName}</li> : null}
        {typeof d.entrySpeed === "number" ? (
          <li>Vel. entrada: {d.entrySpeed.toFixed(1)} kn</li>
        ) : null}
        {typeof d.entryHeading === "number" ? (
          <li>Rumbo entrada: {Math.round(d.entryHeading)}°</li>
        ) : null}
        {typeof d.averageSpeed === "number" ? (
          <li>Vel. media: {d.averageSpeed.toFixed(1)} kn</li>
        ) : null}
        {typeof d.distance === "number" ? (
          <li>Distancia: {d.distance.toFixed(1)} km</li>
        ) : null}
        {typeof d.durationSec === "number" ? (
          <li>
            Duración:{" "}
            {d.durationSec >= 3600
              ? `${(d.durationSec / 3600).toFixed(1)} h`
              : `${Math.round(d.durationSec / 60)} min`}
          </li>
        ) : null}
        {typeof d.estimatedLength === "number" ? (
          <li>Eslora est.: {d.estimatedLength.toFixed(0)} m</li>
        ) : null}
        {typeof d.estimatedSpeedKts === "number" ? (
          <li>Vel. est.: {d.estimatedSpeedKts.toFixed(1)} kn</li>
        ) : null}
        {typeof d.distanceToCoastM === "number" ? (
          <li>
            Dist. a costa:{" "}
            {d.distanceToCoastM >= 1000
              ? `${(d.distanceToCoastM / 1000).toFixed(1)} km`
              : `${d.distanceToCoastM} m`}
          </li>
        ) : null}
      </ul>
      <VesselBlock
        label="Buque"
        vessel={event.vessels?.vessel0}
        onOpenDossier={onOpenDossier}
      />
      <VesselBlock
        label="Segundo buque"
        vessel={event.vessels?.vessel1}
        onOpenDossier={onOpenDossier}
      />
    </div>
  );
}

function readBounds(map) {
  if (!map) return null;
  const b = map.getBounds();
  return {
    south: b.getSouth(),
    west: b.getWest(),
    north: b.getNorth(),
    east: b.getEast(),
  };
}

/**
 * Capa Skylight: markers + tramos pesca/rendezvous + reporta eventos/bounds.
 */
export function SkylightEventsLayer({
  eventTypes,
  darkOnly,
  enabled,
  aoiIds = [],
  selectedEventId = null,
  matchedAisMmsis = null,
  selectedMmsi = null,
  onStatusChange,
  onEventsChange,
  onBoundsChange,
  onSelectEvent,
  onOpenVesselDossier,
  onOpenDetail,
}) {
  const map = useMap();
  const [events, setEvents] = useState([]);
  const abortRef = useRef(null);
  const onStatusRef = useRef(onStatusChange);
  const onEventsRef = useRef(onEventsChange);
  const onBoundsRef = useRef(onBoundsChange);
  const onOpenDetailRef = useRef(onOpenDetail);
  const onOpenDossierRef = useRef(onOpenVesselDossier);
  const openedForIdRef = useRef(null);
  onStatusRef.current = onStatusChange;
  onEventsRef.current = onEventsChange;
  onBoundsRef.current = onBoundsChange;
  onOpenDetailRef.current = onOpenDetail;
  onOpenDossierRef.current = onOpenVesselDossier;

  const matchedAis =
    matchedAisMmsis instanceof Set
      ? matchedAisMmsis
      : new Set(matchedAisMmsis || []);

  const typesKey = useMemo(
    () => [...(eventTypes || [])].sort().join("|"),
    [eventTypes]
  );
  const aoiKey = useMemo(
    () => [...(aoiIds || [])].sort().join("|"),
    [aoiIds]
  );

  useMapEvents({
    moveend() {
      onBoundsRef.current?.(readBounds(map));
    },
    zoomend() {
      onBoundsRef.current?.(readBounds(map));
    },
  });

  useEffect(() => {
    onBoundsRef.current?.(readBounds(map));
  }, [map, enabled]);

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      onEventsRef.current?.([]);
      onStatusRef.current?.({
        loading: false,
        error: null,
        eventCount: 0,
        configured: true,
      });
      return undefined;
    }

    if (!eventTypes?.length && !darkOnly) {
      setEvents([]);
      onEventsRef.current?.([]);
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
        const types =
          eventTypes?.length > 0
            ? eventTypes
            : darkOnly
              ? ALL_DETECTION_TYPES
              : [];

        const data = await skylightFetchEvents(
          {
            eventTypes: types,
            darkOnly: Boolean(darkOnly),
            lookbackHours: SKYLIGHT_DEFAULT_LOOKBACK_HOURS,
            limit: 300,
            aoiIds: aoiIds || [],
          },
          { signal: ac.signal }
        );

        if (cancelled) return;
        const list = Array.isArray(data?.events) ? data.events : [];
        setEvents(list);
        onEventsRef.current?.(list);
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
          "No se pudieron cargar los eventos de Skylight.";
        setEvents([]);
        onEventsRef.current?.([]);
        onStatusRef.current?.({
          loading: false,
          error: msg,
          eventCount: 0,
          configured: e?.status !== 503,
        });
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [enabled, typesKey, darkOnly, aoiKey]);

  useEffect(() => {
    if (!selectedEventId || !enabled) {
      openedForIdRef.current = null;
      return;
    }
    const ev = events.find((e) => e.eventId === selectedEventId);
    if (!ev || !Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) return;

    if (openedForIdRef.current === selectedEventId) return;
    openedForIdRef.current = selectedEventId;

    map.panTo([ev.lat, ev.lon], { animate: true });

    const eventMmsis = skylightEventMmsis(ev);
    const aisMatched = eventMmsis.some((m) => {
      const set =
        matchedAisMmsis instanceof Set
          ? matchedAisMmsis
          : new Set(matchedAisMmsis || []);
      return set.has(m);
    });
    onOpenDetailRef.current?.({
      id: `skylight:${ev.eventId}`,
      title: skylightEventTitle(ev),
      body: (
        <SkylightEventDetailBody
          event={ev}
          aisMatched={aisMatched}
          onOpenDossier={(payload) =>
            onOpenDossierRef.current?.({
              ...payload,
              lat: payload.lat ?? ev.lat,
              lon: payload.lon ?? ev.lon,
            })
          }
        />
      ),
    });
  }, [selectedEventId, events, enabled, map, matchedAisMmsis]);

  if (!enabled) return null;

  return (
    <>
      {events.map((ev) => {
        if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) return null;
        const color = skylightMarkerColor(ev);
        const selected = selectedEventId === ev.eventId;
        const eventMmsis = skylightEventMmsis(ev);
        const aisMatched = eventMmsis.some((m) => matchedAis.has(m));
        const mmsiSelected =
          selectedMmsi != null &&
          eventMmsis.some((m) => String(selectedMmsi) === m);
        const hasTrack = skylightHasTrack(ev);
        const radius = selected || mmsiSelected ? 10 : hasTrack ? 8 : 7;
        const stroke = aisMatched || mmsiSelected ? "#8e44ad" : "#fff";

        return (
          <Fragment key={ev.eventId}>
            {hasTrack ? (
              <Polyline
                positions={[
                  [ev.lat, ev.lon],
                  [ev.endLat, ev.endLon],
                ]}
                pathOptions={{
                  color,
                  weight: selected || mmsiSelected ? 4 : 2.5,
                  opacity: selected || mmsiSelected ? 0.95 : 0.7,
                  dashArray: String(ev.eventType).includes("rendezvous")
                    ? "6 6"
                    : undefined,
                }}
              />
            ) : null}
            <CircleMarker
              center={[ev.lat, ev.lon]}
              radius={radius}
              pathOptions={{
                color: stroke,
                weight: selected || mmsiSelected || aisMatched ? 2.5 : 1.5,
                fillColor: color,
                fillOpacity: selected || mmsiSelected ? 1 : 0.9,
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
            {hasTrack ? (
              <CircleMarker
                center={[ev.endLat, ev.endLon]}
                radius={selected || mmsiSelected ? 6 : 4}
                pathOptions={{
                  color: stroke,
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
