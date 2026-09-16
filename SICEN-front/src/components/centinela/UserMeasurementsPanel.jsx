/**
 * Panel lateral: lista de mediciones personales del usuario.
 */
import { formatMeasureDistanceParts } from "../../utils/geoMeasure.js";

export function UserMeasurementsPanel({
  visible,
  measurements = [],
  loading = false,
  selectedId = null,
  isMobile = false,
  besideFab = false,
  onClose,
  onNew,
  onEdit,
  onDelete,
  onToggleHidden,
  onSelect,
}) {
  if (!visible) return null;

  const n = measurements.length;
  const statusText = loading
    ? "Cargando…"
    : n === 0
      ? "Sin mediciones guardadas"
      : `${n} medición${n === 1 ? "" : "es"}`;

  return (
    <aside
      className={[
        "centinela-glass",
        "centinela-skylight-list",
        "centinela-markers-list",
        "centinela-measurements-list",
        isMobile
          ? "centinela-skylight-list--mobile"
          : "centinela-skylight-list--float",
        !isMobile && besideFab
          ? "centinela-skylight-list--float-beside-fab"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Mis mediciones"
    >
      <div className="centinela-glass__body centinela-skylight-list__body">
        <div className="centinela-skylight-list__header">
          <div className="centinela-skylight-list__heading">
            <h2 className="centinela-skylight-list__title centinela-tool-panel__title">
              Mis mediciones
            </h2>
            <p className="centinela-skylight-list__status">{statusText}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="centinela-skylight-list__close"
              aria-label="Ocultar menú de mediciones"
              onClick={onClose}
            >
              <i className="bi bi-arrow-right" aria-hidden />
            </button>
          ) : null}
        </div>

        {onNew ? (
          <button
            type="button"
            className="btn btn-sm btn-primary w-100"
            onClick={onNew}
          >
            Nueva medición
          </button>
        ) : null}

        {n === 0 && !loading ? (
          <p className="centinela-skylight-list__empty mb-0">
            Medí en el mapa y usá Guardar en el panel inferior.
          </p>
        ) : (
          <ul className="centinela-skylight-list__items centinela-markers-list__items">
            {measurements.map((m) => {
              const id = String(m._id || m.id || "");
              const selected = selectedId && id === String(selectedId);
              const hidden = Boolean(m.hidden);
              const parts = formatMeasureDistanceParts(
                m.totalMeters || 0,
                m.unit === "km" ? "km" : "nm"
              );
              const pts = Array.isArray(m.points) ? m.points.length : 0;
              const circles = Array.isArray(m.circles) ? m.circles.length : 0;
              return (
                <li key={id}>
                  <div
                    className={`centinela-markers-list__row${
                      selected ? " is-selected" : ""
                    }${hidden ? " is-hidden-item" : ""}`}
                  >
                    <button
                      type="button"
                      className="centinela-markers-list__main"
                      onClick={() => onSelect?.(m)}
                    >
                      <span
                        className="centinela-measurement-swatch"
                        aria-hidden
                      >
                        <i className="bi bi-rulers" />
                      </span>
                      <span className="centinela-markers-list__text">
                        <span className="centinela-markers-list__name">
                          {m.name || "Sin nombre"}
                        </span>
                        <span className="centinela-markers-list__coords">
                          {parts.value} {parts.unitLabel}
                          {pts > 0 ? ` · ${pts} pts` : ""}
                          {circles > 0
                            ? ` · ${circles} radio${circles === 1 ? "" : "s"}`
                            : ""}
                          {hidden ? " · oculta" : ""}
                        </span>
                      </span>
                    </button>
                    <div className="centinela-markers-list__actions">
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-label={
                          hidden
                            ? `Mostrar ${m.name || "medición"}`
                            : `Ocultar ${m.name || "medición"}`
                        }
                        onClick={() => onToggleHidden?.(m)}
                      >
                        <i
                          className={`bi ${
                            hidden ? "bi-eye-slash" : "bi-eye"
                          }`}
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-label={`Editar ${m.name || "medición"}`}
                        onClick={() => onEdit?.(m)}
                      >
                        <i className="bi bi-pencil" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-label={`Eliminar ${m.name || "medición"}`}
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
