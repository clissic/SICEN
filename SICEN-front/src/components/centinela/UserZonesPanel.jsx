/**
 * Panel lateral: lista de zonas personales del usuario.
 */
import { useState } from "react";
import { formatCoordDms } from "../../utils/geoDms.js";

export function UserZonesPanel({
  visible,
  zones = [],
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
  const [expandedId, setExpandedId] = useState(null);

  if (!visible) return null;

  const n = zones.length;
  const statusText = loading
    ? "Cargando…"
    : n === 0
      ? "Sin zonas guardadas"
      : `${n} zona${n === 1 ? "" : "s"}`;

  return (
    <aside
      className={[
        "centinela-glass",
        "centinela-skylight-list",
        "centinela-markers-list",
        "centinela-zones-user-list",
        isMobile
          ? "centinela-skylight-list--mobile"
          : "centinela-skylight-list--float",
        !isMobile && besideFab
          ? "centinela-skylight-list--float-beside-fab"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Mis zonas"
    >
      <div className="centinela-glass__body centinela-skylight-list__body">
        <div className="centinela-skylight-list__header">
          <div className="centinela-skylight-list__heading">
            <h2 className="centinela-skylight-list__title centinela-tool-panel__title">
              Mis zonas
            </h2>
            <p className="centinela-skylight-list__status">{statusText}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="centinela-skylight-list__close"
              aria-label="Cerrar lista de zonas"
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
          Nueva zona
        </button>

        {n === 0 && !loading ? (
          <p className="centinela-skylight-list__empty mb-0">
            Creá una zona con al menos 3 puntos (manual o en el mapa).
          </p>
        ) : (
          <ul className="centinela-skylight-list__items centinela-markers-list__items">
            {zones.map((z) => {
              const id = String(z._id || z.id || "");
              const selected = selectedId && id === String(selectedId);
              const expanded = expandedId === id;
              const pts = Array.isArray(z.positions) ? z.positions : [];
              const hidden = Boolean(z.hidden);
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
                      onClick={() => onSelect?.(z)}
                    >
                      <span
                        className="centinela-zone-swatch"
                        style={{ background: z.color || "#0d9488" }}
                        aria-hidden
                      />
                      <span className="centinela-markers-list__text">
                        <span className="centinela-markers-list__name">
                          {z.name || "Sin nombre"}
                        </span>
                        <span className="centinela-markers-list__coords">
                          {pts.length} punto{pts.length === 1 ? "" : "s"}
                          {hidden ? " · oculta" : ""}
                        </span>
                      </span>
                    </button>
                    <div className="centinela-markers-list__actions">
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-expanded={expanded}
                        aria-label={
                          expanded
                            ? "Ocultar coordenadas"
                            : "Ver coordenadas"
                        }
                        onClick={() =>
                          setExpandedId((cur) => (cur === id ? null : id))
                        }
                      >
                        <i
                          className={`bi ${
                            expanded ? "bi-chevron-up" : "bi-chevron-down"
                          }`}
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-label={
                          hidden
                            ? `Mostrar ${z.name || "zona"}`
                            : `Ocultar ${z.name || "zona"}`
                        }
                        onClick={() => onToggleHidden?.(z)}
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
                        aria-label={`Editar ${z.name || "zona"}`}
                        onClick={() => onEdit?.(z)}
                      >
                        <i className="bi bi-pencil" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="centinela-markers-list__icon-btn"
                        aria-label={`Eliminar ${z.name || "zona"}`}
                        onClick={() => onDelete?.(z)}
                      >
                        <i className="bi bi-trash" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {expanded ? (
                    <ol className="centinela-zones-user-list__verts">
                      {pts.map((p, i) => {
                        const lat = Number(p?.[0]);
                        const lng = Number(p?.[1]);
                        return (
                          <li key={`${id}-v-${i}`}>
                            <span className="centinela-zones-user-list__vert-idx">
                              {i + 1}.
                            </span>{" "}
                            {Number.isFinite(lat)
                              ? formatCoordDms(lat, "lat")
                              : "—"}{" "}
                            ·{" "}
                            {Number.isFinite(lng)
                              ? formatCoordDms(lng, "lng")
                              : "—"}
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
