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
  onClose,
  onSelectRelatedEvent,
  isMobile,
  besideFab = false,
}) {
  if (!visible || !mmsi) return null;

  const title = name?.trim() || dossier?.name?.trim() || `MMSI ${mmsi}`;
  const tracks = dossier?.tracks || [];
  const pred = dossier?.prediction;
  const related = dossier?.relatedEvents || [];
  const warnings = dossier?.warnings || [];

  return (
    <aside
      className={[
        "centinela-glass",
        "centinela-skylight-list",
        "centinela-vessel-dossier",
        isMobile
          ? "centinela-skylight-list--mobile"
          : "centinela-skylight-list--float",
        !isMobile && besideFab
          ? "centinela-skylight-list--float-beside-fab"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
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
              aria-label="Ocultar historial y predicción"
            >
              <i className="bi bi-x-lg" aria-hidden />
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
                  <li className="centinela-vessel-dossier__muted">
                    Powered by Global Fishing Watch · uso no comercial
                  </li>
                </ul>
              ) : (
                <p className="centinela-skylight-list__empty">
                  Sin insights GFW para este MMSI (o token sin permiso).
                </p>
              )}
            </section>

            <section className="centinela-vessel-dossier__section">
              <h3 className="centinela-vessel-dossier__section-title">
                Track ({tracks.length} tramo
                {tracks.length === 1 ? "" : "s"})
              </h3>
              {tracks.length === 0 ? (
                <p className="centinela-skylight-list__empty">
                  Sin subpaths AIS en el horizonte.
                </p>
              ) : (
                <ul className="centinela-vessel-dossier__list list-unstyled mb-0">
                  {tracks.slice(0, 6).map((t) => (
                    <li key={t.subpathId}>
                      {formatSkylightWhen(t.startTime)}
                      {t.activityClassification
                        ? ` · ${t.activityClassification}`
                        : ""}
                      {typeof t.meanSog === "number"
                        ? ` · ${t.meanSog.toFixed(1)} kn`
                        : ""}
                    </li>
                  ))}
                </ul>
              )}
            </section>

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

            <section className="centinela-vessel-dossier__section">
              <h3 className="centinela-vessel-dossier__section-title">
                Eventos Skylight ({related.length})
              </h3>
              {related.length === 0 ? (
                <p className="centinela-skylight-list__empty">
                  Ningún evento vinculado a este MMSI.
                </p>
              ) : (
                <ul className="centinela-vessel-dossier__events list-unstyled mb-0">
                  {related.slice(0, 12).map((ev) => (
                    <li key={ev.eventId}>
                      <button
                        type="button"
                        className="centinela-vessel-dossier__event-btn"
                        onClick={() => onSelectRelatedEvent?.(ev.eventId)}
                      >
                        <span className="centinela-vessel-dossier__event-title">
                          {skylightEventTitle(ev)}
                        </span>
                        <span className="centinela-vessel-dossier__muted">
                          {skylightEventTypeLabel(ev.eventType)} ·{" "}
                          {formatSkylightWhen(ev.startTime)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
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
