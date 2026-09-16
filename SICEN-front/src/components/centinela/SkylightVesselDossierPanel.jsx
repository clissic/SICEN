import { useEffect, useId, useState } from "react";
import {
  formatSkylightWhen,
  skylightEventTitle,
  skylightEventTypeLabel,
} from "../../utils/skylightEventHelpers.js";
import { formatCoordDms } from "../../utils/geoDms.js";

function IdentityBlock({ identity }) {
  if (!identity?.sources?.length) {
    return (
      <p className="centinela-skylight-list__empty">
        Sin historial de identidad en Skylight.
      </p>
    );
  }

  return (
    <div className="centinela-vessel-dossier__sources">
      {identity.sources.map((src) => {
        const entries = (src.entries || []).slice(0, 4);
        return (
          <div
            key={src.source || "src"}
            className="centinela-vessel-dossier__source"
          >
            <div className="centinela-vessel-dossier__source-title">
              Fuente: {src.source || "—"}
            </div>
            <ul className="list-unstyled mb-0">
              {entries.map((e) => (
                <li key={e.id || `${e.vesselName}-${e.effectiveFrom}`}>
                  <strong>{e.vesselName?.trim() || "Sin nombre"}</strong>
                  {e.isMostRecent ? (
                    <span className="centinela-vessel-dossier__badge">
                      actual
                    </span>
                  ) : null}
                  <div className="centinela-vessel-dossier__muted">
                    {[
                      e.flag,
                      e.vesselType,
                      e.imo ? `OMI ${e.imo}` : null,
                      e.callSign ? `Indicativo ${e.callSign}` : null,
                      e.lengthMeters != null
                        ? `${e.lengthMeters.toFixed(0)} m`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin metadatos"}
                  </div>
                  <div className="centinela-vessel-dossier__muted">
                    {formatSkylightWhen(e.effectiveFrom)}
                    {e.effectiveTo
                      ? ` → ${formatSkylightWhen(e.effectiveTo)}`
                      : " → vigente"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Extremos del tramo a partir de `positions` [[lat, lon], ...]. */
function trackEndpoints(track) {
  const positions = Array.isArray(track?.positions) ? track.positions : [];
  if (positions.length === 0) return { start: null, end: null };
  const first = positions[0];
  const last = positions[positions.length - 1];
  const startLat = Number(first?.[0]);
  const startLon = Number(first?.[1]);
  const endLat = Number(last?.[0]);
  const endLon = Number(last?.[1]);
  return {
    start:
      Number.isFinite(startLat) && Number.isFinite(startLon)
        ? { lat: startLat, lon: startLon }
        : null,
    end:
      Number.isFinite(endLat) && Number.isFinite(endLon)
        ? { lat: endLat, lon: endLon }
        : null,
  };
}

function TrackAccordion({ tracks, mmsi, onGoToTrack }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [mmsi]);

  const count = tracks.length;

  return (
    <section className="centinela-vessel-dossier__section centinela-vessel-dossier__accordion">
      <h3 className="centinela-vessel-dossier__section-title">
        <button
          type="button"
          className={[
            "centinela-vessel-dossier__acc-btn",
            open ? "is-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            Track ({count} tramo{count === 1 ? "" : "s"})
          </span>
          <i
            className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}
            aria-hidden
          />
        </button>
      </h3>

      {open ? (
        <div id={panelId} className="centinela-vessel-dossier__acc-panel">
          {count === 0 ? (
            <p className="centinela-skylight-list__empty">
              Sin subpaths AIS en el horizonte.
            </p>
          ) : (
            <ul className="centinela-vessel-dossier__track-list list-unstyled mb-0">
              {tracks.map((t) => {
                const { start, end } = trackEndpoints(t);
                const focus = end || start;
                const samePoint =
                  start &&
                  end &&
                  start.lat === end.lat &&
                  start.lon === end.lon;
                return (
                  <li
                    key={t.subpathId}
                    className="centinela-vessel-dossier__track-row"
                  >
                    <div className="centinela-vessel-dossier__track-body">
                      <div>
                        {formatSkylightWhen(t.startTime)}
                        {t.endTime && t.endTime !== t.startTime
                          ? ` → ${formatSkylightWhen(t.endTime)}`
                          : ""}
                        {t.activityClassification
                          ? ` · ${t.activityClassification}`
                          : ""}
                        {typeof t.meanSog === "number"
                          ? ` · ${t.meanSog.toFixed(1)} kn`
                          : ""}
                        {typeof t.numPositions === "number"
                          ? ` · ${t.numPositions} pos.`
                          : ""}
                      </div>
                      {start || end ? (
                        <div className="centinela-vessel-dossier__muted">
                          {samePoint || !start || !end ? (
                            <>
                              Lat.{" "}
                              {formatCoordDms((end || start).lat, "lat")} ·
                              Long.{" "}
                              {formatCoordDms((end || start).lon, "lng")}
                            </>
                          ) : (
                            <>
                              <div>
                                Inicio: Lat.{" "}
                                {formatCoordDms(start.lat, "lat")} · Long.{" "}
                                {formatCoordDms(start.lon, "lng")}
                              </div>
                              <div>
                                Fin: Lat. {formatCoordDms(end.lat, "lat")} ·
                                Long. {formatCoordDms(end.lon, "lng")}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="centinela-vessel-dossier__muted">
                          Sin posiciones en el tramo.
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="centinela-vessel-dossier__goto-btn"
                      disabled={!focus}
                      data-sicen-popover="Ir al tramo"
                      data-sicen-popover-placement="left"
                      aria-label="Ir a la posición del tramo"
                      onClick={() => onGoToTrack?.(t)}
                    >
                      <i className="bi bi-crosshair" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

const STS_EVENT_TYPES = new Set([
  "standard_rendezvous",
  "dark_rendezvous",
  "fiu_sts",
]);

function vesselMatchesFocus(vessel, mmsi, imo) {
  if (!vessel) return false;
  const focusMmsi = String(mmsi || "").trim();
  if (focusMmsi && String(vessel.mmsi || "").trim() === focusMmsi) return true;
  const focusImo =
    imo != null && Number(imo) > 0 ? Math.trunc(Number(imo)) : null;
  if (
    focusImo != null &&
    vessel.imo != null &&
    Number(vessel.imo) > 0 &&
    Math.trunc(Number(vessel.imo)) === focusImo
  ) {
    return true;
  }
  return false;
}

/** Contraparte del buque del dossier (no asumir siempre vessel1). */
function stsCounterpartLabel(ev, focusMmsi, focusImo) {
  const v0 = ev?.vessels?.vessel0;
  const v1 = ev?.vessels?.vessel1;
  const other = vesselMatchesFocus(v0, focusMmsi, focusImo)
    ? v1
    : vesselMatchesFocus(v1, focusMmsi, focusImo)
      ? v0
      : v1 || v0;
  if (!other) return null;
  const name = other.name?.trim() || other.displayName?.trim();
  if (name) return name;
  if (other.mmsi) return `MMSI ${other.mmsi}`;
  if (other.imo != null && Number(other.imo) > 0) return `OMI ${other.imo}`;
  return null;
}

function stsEventTypeLabel(ev) {
  if (ev?.eventType === "fiu_sts" || ev?.source === "fiu-lac-iuu") {
    const act = ev?.details?.activityType?.trim();
    return act ? `STS FIU · ${act}` : "STS (FIU / Windward)";
  }
  return skylightEventTypeLabel(ev?.eventType);
}

function StsEventsAccordion({
  events,
  mmsi,
  imo = null,
  onSelectEvent,
  onGoToEvent,
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [mmsi]);

  const count = events.length;

  return (
    <section className="centinela-vessel-dossier__section centinela-vessel-dossier__accordion">
      <h3 className="centinela-vessel-dossier__section-title">
        <button
          type="button"
          className={[
            "centinela-vessel-dossier__acc-btn",
            open ? "is-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            Eventos STS ({count})
          </span>
          <i
            className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}
            aria-hidden
          />
        </button>
      </h3>

      {open ? (
        <div id={panelId} className="centinela-vessel-dossier__acc-panel">
          {count === 0 ? (
            <p className="centinela-skylight-list__empty">
              Sin eventos STS (Skylight o FIU) en el horizonte.
            </p>
          ) : (
            <ul className="centinela-vessel-dossier__track-list list-unstyled mb-0">
              {events.map((ev) => {
                const hasStart =
                  Number.isFinite(ev.lat) && Number.isFinite(ev.lon);
                const hasEnd =
                  Number.isFinite(ev.endLat) && Number.isFinite(ev.endLon);
                const samePoint =
                  hasStart &&
                  hasEnd &&
                  ev.lat === ev.endLat &&
                  ev.lon === ev.endLon;
                const other = stsCounterpartLabel(ev, mmsi, imo);
                return (
                  <li
                    key={ev.eventId}
                    className="centinela-vessel-dossier__track-row"
                  >
                    <button
                      type="button"
                      className="centinela-vessel-dossier__track-body centinela-vessel-dossier__track-body--btn"
                      onClick={() => onSelectEvent?.(ev)}
                    >
                      <div className="centinela-vessel-dossier__event-title">
                        {stsEventTypeLabel(ev)}
                        {other ? ` · con ${other}` : ""}
                      </div>
                      <div>
                        {formatSkylightWhen(ev.startTime)}
                        {ev.endTime && ev.endTime !== ev.startTime
                          ? ` → ${formatSkylightWhen(ev.endTime)}`
                          : ""}
                        {typeof ev.details?.osrScore === "number"
                          ? ` · score ${(ev.details.osrScore * 100).toFixed(0)}%`
                          : ""}
                        {typeof ev.details?.durationHours === "number"
                          ? ` · ${ev.details.durationHours.toFixed(1)} h`
                          : ""}
                      </div>
                      {hasStart || hasEnd ? (
                        <div className="centinela-vessel-dossier__muted">
                          {samePoint || !hasStart || !hasEnd ? (
                            <>
                              Lat.{" "}
                              {formatCoordDms(
                                hasEnd ? ev.endLat : ev.lat,
                                "lat"
                              )}{" "}
                              · Long.{" "}
                              {formatCoordDms(
                                hasEnd ? ev.endLon : ev.lon,
                                "lng"
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                Inicio: Lat. {formatCoordDms(ev.lat, "lat")} ·
                                Long. {formatCoordDms(ev.lon, "lng")}
                              </div>
                              <div>
                                Fin: Lat. {formatCoordDms(ev.endLat, "lat")} ·
                                Long. {formatCoordDms(ev.endLon, "lng")}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="centinela-vessel-dossier__muted">
                          Sin posición.
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      className="centinela-vessel-dossier__goto-btn"
                      disabled={!hasStart && !hasEnd}
                      data-sicen-popover="Ir al evento STS"
                      data-sicen-popover-placement="left"
                      aria-label="Ir a la posición del evento STS"
                      onClick={() => onGoToEvent?.(ev)}
                    >
                      <i className="bi bi-crosshair" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function SkylightEventsAccordion({
  events,
  mmsi,
  onSelectEvent,
  onGoToEvent,
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [mmsi]);

  const count = events.length;

  return (
    <section className="centinela-vessel-dossier__section centinela-vessel-dossier__accordion">
      <h3 className="centinela-vessel-dossier__section-title">
        <button
          type="button"
          className={[
            "centinela-vessel-dossier__acc-btn",
            open ? "is-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            Eventos Skylight ({count})
          </span>
          <i
            className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}
            aria-hidden
          />
        </button>
      </h3>

      {open ? (
        <div id={panelId} className="centinela-vessel-dossier__acc-panel">
          {count === 0 ? (
            <p className="centinela-skylight-list__empty">
              Ningún otro evento vinculado a este MMSI.
            </p>
          ) : (
            <ul className="centinela-vessel-dossier__track-list list-unstyled mb-0">
              {events.map((ev) => {
                const hasStart =
                  Number.isFinite(ev.lat) && Number.isFinite(ev.lon);
                const hasEnd =
                  Number.isFinite(ev.endLat) && Number.isFinite(ev.endLon);
                const samePoint =
                  hasStart &&
                  hasEnd &&
                  ev.lat === ev.endLat &&
                  ev.lon === ev.endLon;
                return (
                  <li
                    key={ev.eventId}
                    className="centinela-vessel-dossier__track-row"
                  >
                    <button
                      type="button"
                      className="centinela-vessel-dossier__track-body centinela-vessel-dossier__track-body--btn"
                      onClick={() => onSelectEvent?.(ev.eventId)}
                    >
                      <div className="centinela-vessel-dossier__event-title">
                        {skylightEventTitle(ev)}
                      </div>
                      <div>
                        {skylightEventTypeLabel(ev.eventType)} ·{" "}
                        {formatSkylightWhen(ev.startTime)}
                        {ev.endTime && ev.endTime !== ev.startTime
                          ? ` → ${formatSkylightWhen(ev.endTime)}`
                          : ""}
                      </div>
                      {hasStart || hasEnd ? (
                        <div className="centinela-vessel-dossier__muted">
                          {samePoint || !hasStart || !hasEnd ? (
                            <>
                              Lat.{" "}
                              {formatCoordDms(
                                hasEnd ? ev.endLat : ev.lat,
                                "lat"
                              )}{" "}
                              · Long.{" "}
                              {formatCoordDms(
                                hasEnd ? ev.endLon : ev.lon,
                                "lng"
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                Inicio: Lat. {formatCoordDms(ev.lat, "lat")} ·
                                Long. {formatCoordDms(ev.lon, "lng")}
                              </div>
                              <div>
                                Fin: Lat. {formatCoordDms(ev.endLat, "lat")} ·
                                Long. {formatCoordDms(ev.endLon, "lng")}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="centinela-vessel-dossier__muted">
                          Sin posición.
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      className="centinela-vessel-dossier__goto-btn"
                      disabled={!hasStart && !hasEnd}
                      data-sicen-popover="Ir al evento"
                      data-sicen-popover-placement="left"
                      aria-label="Ir a la posición del evento Skylight"
                      onClick={() => onGoToEvent?.(ev)}
                    >
                      <i className="bi bi-crosshair" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Panel glass: historial / track / predicción / eventos del buque seleccionado.
 * Misma cáscara visual que Eventos Skylight (cerrar → FAB para reabrir).
 */
export function SkylightVesselDossierPanel({
  visible,
  mmsi,
  name,
  loading,
  error,
  dossier,
  aisLinked,
  accentColor = null,
  onClose,
  onSelectRelatedEvent,
  onGoToTrack,
  onGoToEvent,
  isMobile,
  besideFab = false,
}) {
  if (!visible || !mmsi) return null;

  const title = name?.trim() || dossier?.name?.trim() || `MMSI ${mmsi}`;
  const tracks = dossier?.tracks || [];
  const pred = dossier?.prediction;
  const related = dossier?.relatedEvents || [];
  const stsEvents = Array.isArray(dossier?.stsEvents)
    ? dossier.stsEvents
    : related.filter((e) => STS_EVENT_TYPES.has(e.eventType));
  const otherRelated = related.filter(
    (e) => !STS_EVENT_TYPES.has(e.eventType)
  );
  const warnings = dossier?.warnings || [];
  const focusImo =
    (() => {
      for (const src of dossier?.identity?.sources || []) {
        for (const e of src.entries || []) {
          if (e?.imo != null && Number(e.imo) > 0) {
            return Math.trunc(Number(e.imo));
          }
        }
      }
      const gfwImo = dossier?.gfwInsights?.identity?.imo;
      if (gfwImo != null && Number(gfwImo) > 0) {
        return Math.trunc(Number(gfwImo));
      }
      return null;
    })();

  return (
    <aside
      className={[
        "centinela-glass",
        "centinela-skylight-list",
        "centinela-vessel-dossier",
        accentColor ? "has-accent" : "",
        isMobile
          ? "centinela-skylight-list--mobile"
          : "centinela-skylight-list--float",
        !isMobile && besideFab
          ? "centinela-skylight-list--float-beside-fab"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        accentColor
          ? { "--dossier-color": accentColor, borderColor: accentColor }
          : undefined
      }
      aria-label="Historial y predicción del buque"
    >
      <div className="centinela-glass__body centinela-skylight-list__body">
        <div className="centinela-skylight-list__header">
          <div className="centinela-skylight-list__heading">
            <h2 className="centinela-skylight-list__title">{title}</h2>
            <p className="centinela-skylight-list__status">
              MMSI {mmsi}
              {aisLinked ? " · cruce AIS" : ""}
              {loading ? " · cargando…" : ""}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="centinela-skylight-list__close"
              onClick={onClose}
              aria-label="Ocultar menú de historial"
            >
              <i className="bi bi-arrow-right" aria-hidden />
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="centinela-vessel-dossier__error">{error}</p>
        ) : null}

        {loading && !dossier ? (
          <p className="centinela-skylight-list__empty">
            Consultando Skylight…
          </p>
        ) : null}

        {dossier ? (
          <div className="centinela-skylight-list__items centinela-vessel-dossier__scroll">
            <section className="centinela-vessel-dossier__section">
              <h3 className="centinela-vessel-dossier__section-title">
                Identidad
              </h3>
              <IdentityBlock identity={dossier.identity} />
            </section>

            <section className="centinela-vessel-dossier__section">
              <h3 className="centinela-vessel-dossier__section-title">
                Riesgo GFW
              </h3>
              {dossier.gfwInsights?.identity?.found ||
              dossier.gfwInsights?.insights ? (
                <ul className="centinela-vessel-dossier__list list-unstyled mb-0">
                  {dossier.gfwInsights.identity?.name ? (
                    <li>
                      Nombre GFW: {dossier.gfwInsights.identity.name}
                      {dossier.gfwInsights.identity.imo
                        ? ` · OMI ${dossier.gfwInsights.identity.imo}`
                        : ""}
                    </li>
                  ) : null}
                  {dossier.gfwInsights.identity?.flag ? (
                    <li>Bandera: {dossier.gfwInsights.identity.flag}</li>
                  ) : null}
                  {dossier.gfwInsights.insights?.gap
                    ?.periodSelectedCounters ? (
                    <li>
                      Gaps AIS (12 meses):{" "}
                      {dossier.gfwInsights.insights.gap.periodSelectedCounters
                        .eventsGapOff ??
                        dossier.gfwInsights.insights.gap.periodSelectedCounters
                          .events ??
                        0}
                    </li>
                  ) : (
                    <li className="centinela-vessel-dossier__muted">
                      Sin indicadores de gap en el período.
                    </li>
                  )}
                </ul>
              ) : (
                <p className="centinela-skylight-list__empty">
                  Sin insights GFW para este MMSI (o token sin permiso).
                </p>
              )}
            </section>

            <TrackAccordion
              tracks={tracks}
              mmsi={mmsi}
              onGoToTrack={onGoToTrack}
            />

            <StsEventsAccordion
              events={stsEvents}
              mmsi={mmsi}
              imo={focusImo}
              onSelectEvent={onSelectRelatedEvent}
              onGoToEvent={onGoToEvent}
            />

            <SkylightEventsAccordion
              events={otherRelated}
              mmsi={mmsi}
              onSelectEvent={onSelectRelatedEvent}
              onGoToEvent={onGoToEvent}
            />

            <section className="centinela-vessel-dossier__section">
              <h3 className="centinela-vessel-dossier__section-title">
                Predicción
              </h3>
              {pred?.lat != null && pred?.lon != null ? (
                <ul className="centinela-vessel-dossier__list list-unstyled mb-0">
                  <li>
                    Lat. {formatCoordDms(pred.lat, "lat")} · Long.{" "}
                    {formatCoordDms(pred.lon, "lng")}
                  </li>
                  {pred.origin?.sentAt ? (
                    <li>Desde {formatSkylightWhen(pred.origin.sentAt)}</li>
                  ) : null}
                </ul>
              ) : (
                <p className="centinela-skylight-list__empty">
                  Sin predicción disponible.
                </p>
              )}
            </section>

            {warnings.length > 0 ? (
              <p className="centinela-vessel-dossier__warn">
                {warnings.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
