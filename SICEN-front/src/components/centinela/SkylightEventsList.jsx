import {
  formatSkylightWhen,
  skylightCoordsLabel,
  skylightEventSubtitle,
  skylightEventTitle,
  skylightMarkerColor,
} from "../../utils/skylightEventHelpers.js";

/**
 * Lista lateral de eventos Skylight visibles en el viewport.
 */
export function SkylightEventsList({
  visible,
  events,
  selectedEventId,
  loading,
  totalLoaded,
  onSelect,
  onClose,
  isMobile,
  besideFab = false,
}) {
  if (!visible) return null;

  const n = events.length;
  const statusText = loading
    ? "Actualizando…"
    : n === 0
      ? "Ningún evento en esta vista"
      : `${n} en vista${
          totalLoaded != null && totalLoaded > n
            ? ` · ${totalLoaded} cargados`
            : ""
        }`;

  return (
    <aside
      className={[
        "centinela-glass",
        "centinela-skylight-list",
        isMobile
          ? "centinela-skylight-list--mobile"
          : "centinela-skylight-list--float",
        !isMobile && besideFab
          ? "centinela-skylight-list--float-beside-fab"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Eventos Skylight en la vista"
    >
      <div className="centinela-glass__body centinela-skylight-list__body">
        <div className="centinela-skylight-list__header">
          <div className="centinela-skylight-list__heading">
            <h2 className="centinela-skylight-list__title">Eventos Skylight</h2>
            <p className="centinela-skylight-list__status">{statusText}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="centinela-skylight-list__close"
              onClick={onClose}
              aria-label="Ocultar lista de eventos"
            >
              <i className="bi bi-x-lg" aria-hidden />
            </button>
          ) : null}
        </div>

        {n === 0 && !loading ? (
          <p className="centinela-skylight-list__empty">
            Acercá o desplazá el mapa, o activá más capas Skylight.
          </p>
        ) : (
          <ul className="centinela-skylight-list__items list-unstyled mb-0">
            {events.map((ev) => {
              const selected = selectedEventId === ev.eventId;
              const color = skylightMarkerColor(ev);
              return (
                <li key={ev.eventId}>
                  <button
                    type="button"
                    className={[
                      "centinela-skylight-list__item",
                      selected ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onSelect?.(ev.eventId)}
                    aria-pressed={selected}
                  >
                    <span
                      className="centinela-skylight-list__swatch"
                      style={{ background: color }}
                      aria-hidden
                    />
                    <span className="centinela-skylight-list__item-body">
                      <span className="centinela-skylight-list__item-title">
                        {skylightEventTitle(ev)}
                      </span>
                      <span className="centinela-skylight-list__item-meta">
                        {skylightEventSubtitle(ev)}
                      </span>
                      <span className="centinela-skylight-list__item-meta">
                        {formatSkylightWhen(ev.startTime)}
                      </span>
                      <span className="centinela-skylight-list__item-coords">
                        {skylightCoordsLabel(ev)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
