/**
 * Panel lateral: lista de marcadores personales del usuario.
 */
import { formatCoordDms } from "../../utils/geoDms.js";

export function UserMarkersPanel({
  visible,
  markers = [],
  loading = false,
  selectedId = null,
  isMobile = false,
  besideFab = false,
  onClose,
  onNew,
  onEdit,
  onDelete,
  onSelect,
}) {
  if (!visible) return null;

  const n = markers.length;
  const statusText = loading
    ? "Cargando…"
    : n === 0
      ? "Sin marcadores guardados"
      : `${n} marcador${n === 1 ? "" : "es"}`;

  return (
    <aside
      className={[
        "centinela-glass",
        "centinela-skylight-list",
        "centinela-markers-list",
        isMobile
          ? "centinela-skylight-list--mobile"
          : "centinela-skylight-list--float",
        !isMobile && besideFab
          ? "centinela-skylight-list--float-beside-fab"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Mis marcadores"
    >
      <div className="centinela-glass__body centinela-skylight-list__body">
        <div className="centinela-skylight-list__header">
          <div className="centinela-skylight-list__heading">
            <h2 className="centinela-skylight-list__title centinela-tool-panel__title">Mis marcadores</h2>
            <p className="centinela-skylight-list__status">{statusText}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="centinela-skylight-list__close"
              aria-label="Cerrar lista de marcadores"
              onClick={onClose}
            >
              <i className="bi bi-x-lg" aria-hidden />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-primary w-100"
          onClick={onNew}
        >
          Nuevo marcador
        </button>

        {n === 0 && !loading ? (
          <p className="centinela-skylight-list__empty mb-0">
            Creá uno desde acá o con «Agregar marcador» en el mapa.
          </p>
        ) : (
          <ul className="centinela-skylight-list__items centinela-markers-list__items">
            {markers.map((m) => {
              const id = String(m._id || m.id || "");
              const selected = selectedId && id === String(selectedId);
              const latDms = formatCoordDms(m.lat, "lat");
              const lngDms = formatCoordDms(m.lng, "lng");
              return (
                <li key={id}>
                  <div
                    className={`centinela-markers-list__row${
                      selected ? " is-selected" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="centinela-markers-list__main"
                      onClick={() => onSelect?.(m)}
                    >
                      <span
                        className="centinela-marker-pin centinela-marker-pin--sm"
                        style={{ background: m.color }}
                        aria-hidden
                      >
                        <span className="material-symbols-outlined">
                          {m.icon}
                        </span>
                      </span>
                      <span className="centinela-markers-list__text">
                        <span className="centinela-markers-list__name">
                          {m.name || "Sin nombre"}
                        </span>
                        <span className="centinela-markers-list__coords">
                          {latDms} · {lngDms}
                        </span>
                      </span>
                    </button>
                    <div className="centinela-markers-list__actions">
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-label={`Editar ${m.name || "marcador"}`}
                        onClick={() => onEdit?.(m)}
                      >
                        <i className="bi bi-pencil" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-label={`Eliminar ${m.name || "marcador"}`}
                        onClick={() => onDelete?.(m)}
                      >
                        <i className="bi bi-trash" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
