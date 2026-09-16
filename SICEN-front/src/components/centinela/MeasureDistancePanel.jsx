import { formatMeasureDistanceParts } from "../../utils/geoMeasure.js";
import { CentinelaToolPanelHead } from "./CentinelaToolPanelHead.jsx";

/**
 * Menú inferior: medición de distancias y radios.
 */
export function MeasureDistancePanel({
  unit,
  onUnitChange,
  mode,
  onModeChange,
  totalMeters,
  pinned = false,
  name = "",
  onNameChange,
  onSave,
  saving = false,
  saveDisabled = false,
  editing = false,
  minimized = false,
  onToggleMinimized,
  onReset,
  onUndo,
  onPin,
  onClose,
}) {
  const totalParts = formatMeasureDistanceParts(totalMeters, unit);

  return (
    <div
      className={[
        "centinela-tool-panel",
        "centinela-measure-panel",
        minimized ? "is-minimized" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="region"
      aria-label="Medir distancia"
    >
      <CentinelaToolPanelHead
        className="centinela-measure-panel__head"
        title="Medir distancia"
        minimized={minimized}
        onToggleMinimized={onToggleMinimized}
        onClose={onClose}
        closeLabel="Cerrar medición"
      />

      <div className="centinela-measure-panel__save-row">
        <label className="centinela-measure-panel__name">
          <span className="centinela-measure-panel__label">Nombre</span>
          <input
            type="text"
            className="form-control form-control-sm"
            value={name}
            maxLength={80}
            placeholder="Ej. Tránsito a boya"
            onChange={(e) => onNameChange?.(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-sm btn-primary centinela-tool-save-actions__btn centinela-measure-panel__save-btn"
          disabled={saving || saveDisabled || !String(name || "").trim()}
          onClick={onSave}
          aria-label={
            saving ? "Guardando…" : editing ? "Actualizar" : "Guardar"
          }
          data-sicen-popover={
            saving ? "Guardando…" : editing ? "Actualizar" : "Guardar"
          }
          data-sicen-popover-placement="top"
        >
          <i
            className={saving ? "bi bi-hourglass-split" : "bi bi-floppy"}
            aria-hidden
          />
        </button>
      </div>

      <div className="centinela-measure-panel__meta">
        <div className="centinela-measure-panel__field">
          <span className="centinela-measure-panel__label">Herramienta</span>
          <div
            className="centinela-measure-panel__toggles"
            role="group"
            aria-label="Herramienta de medición"
          >
            <button
              type="button"
              className={[
                "centinela-measure-panel__icon-btn",
                mode === "distance" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={mode === "distance"}
              aria-label="Distancia"
              data-sicen-popover="Distancia"
              data-sicen-popover-placement="top"
              disabled={pinned}
              onClick={() => onModeChange("distance")}
            >
              <i className="bi bi-rulers" aria-hidden />
            </button>
            <button
              type="button"
              className={[
                "centinela-measure-panel__icon-btn",
                mode === "radius" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={mode === "radius"}
              aria-label="Radio"
              data-sicen-popover="Radio"
              data-sicen-popover-placement="top"
              disabled={pinned}
              onClick={() => onModeChange("radius")}
            >
              <i className="bi bi-radar" aria-hidden />
            </button>
          </div>
        </div>

        <div className="centinela-measure-panel__field">
          <span className="centinela-measure-panel__label">Unidad</span>
          <div
            className="centinela-measure-panel__toggles"
            role="group"
            aria-label="Unidad de medida"
          >
            <button
              type="button"
              className={[
                "centinela-measure-panel__unit-btn",
                unit === "nm" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={unit === "nm"}
              aria-label="Millas náuticas"
              onClick={() => onUnitChange("nm")}
            >
              MN
            </button>
            <button
              type="button"
              className={[
                "centinela-measure-panel__unit-btn",
                unit === "km" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={unit === "km"}
              aria-label="Kilómetros"
              onClick={() => onUnitChange("km")}
            >
              KM
            </button>
          </div>
        </div>

        <div className="centinela-measure-panel__field centinela-measure-panel__field--total">
          <span className="centinela-measure-panel__label">Total</span>
          <strong
            className={[
              "centinela-measure-panel__total",
              totalParts.stackUnit ? "is-stacked" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={`${totalParts.value} ${totalParts.unitLabel}`}
          >
            <span className="centinela-measure-panel__total-value">
              {totalParts.value}
            </span>
            <span className="centinela-measure-panel__total-unit">
              {totalParts.unitLabel}
            </span>
          </strong>
        </div>

        <div className="centinela-measure-panel__actions">
          <button
            type="button"
            className="centinela-measure-panel__action"
            onClick={onUndo}
            disabled={pinned}
            aria-label="Deshacer"
            data-sicen-popover="Deshacer"
            data-sicen-popover-placement="top"
          >
            <i className="bi bi-arrow-counterclockwise" aria-hidden />
            <span className="centinela-measure-panel__action-label">Deshacer</span>
          </button>
          <button
            type="button"
            className="centinela-measure-panel__action"
            onClick={onReset}
            aria-label="Reiniciar"
            data-sicen-popover="Reiniciar"
            data-sicen-popover-placement="top"
          >
            <i className="bi bi-arrow-repeat" aria-hidden />
            <span className="centinela-measure-panel__action-label">Reiniciar</span>
          </button>
          <button
            type="button"
            className={[
              "centinela-measure-panel__action",
              pinned ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={onPin}
            aria-pressed={pinned}
            aria-label={pinned ? "Soltar" : "Fijar"}
            data-sicen-popover={pinned ? "Soltar" : "Fijar"}
            data-sicen-popover-placement="top"
          >
            <i
              className={pinned ? "bi bi-pin-angle-fill" : "bi bi-pin-angle"}
              aria-hidden
            />
            <span className="centinela-measure-panel__action-label">
              {pinned ? "Soltar" : "Fijar"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
