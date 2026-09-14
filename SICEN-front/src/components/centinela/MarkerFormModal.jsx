import { useEffect, useId, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import {
  MAP_MARKER_COLORS,
  MAP_MARKER_DEFAULT_COLOR,
  MAP_MARKER_DEFAULT_ICON,
  MAP_MARKER_ICON_GROUPS,
} from "../../constants/centinelaMarkerIcons.js";
import {
  decimalToDmsInputParts,
  dmsMaxDigitCount,
  formatDmsDigitsInput,
  parseDmsDigits,
} from "../../utils/geoDms.js";

function HemiToggle({ options, value, onChange, ariaLabel }) {
  return (
    <div
      className="centinela-goto-panel__hemi"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            className={`centinela-goto-panel__hemi-btn${
              active ? " is-active" : ""
            }`}
            aria-pressed={active}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function initialFromMarker(initial) {
  const latParts = decimalToDmsInputParts(
    Number.isFinite(initial?.lat) ? initial.lat : NaN,
    "lat"
  );
  const lngParts = decimalToDmsInputParts(
    Number.isFinite(initial?.lng) ? initial.lng : NaN,
    "lng"
  );
  return {
    name: initial?.name || "",
    latDigits: latParts.digits,
    lngDigits: lngParts.digits,
    latHemi: latParts.hemi,
    lngHemi: lngParts.hemi,
    icon: initial?.icon || MAP_MARKER_DEFAULT_ICON,
    color: initial?.color || MAP_MARKER_DEFAULT_COLOR,
  };
}

/**
 * Modal alta/edición de marcador personal (DMS + ícono + color).
 */
export function MarkerFormModal({
  mode = "create",
  initial = null,
  saving = false,
  onSave,
  onClose,
}) {
  const formId = useId();
  const [state, setState] = useState(() => initialFromMarker(initial));
  const [err, setErr] = useState(null);
  const [iconsOpen, setIconsOpen] = useState(false);

  useEffect(() => {
    setState(initialFromMarker(initial));
    setErr(null);
    setIconsOpen(false);
  }, [initial, mode]);

  function setDigit(kind, raw) {
    const max = dmsMaxDigitCount(kind);
    const next = String(raw || "")
      .replace(/\D/g, "")
      .slice(0, max);
    setState((s) =>
      kind === "lat" ? { ...s, latDigits: next } : { ...s, lngDigits: next }
    );
    if (err) setErr(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const lat = parseDmsDigits(state.latDigits, "lat", state.latHemi);
    const lng = parseDmsDigits(state.lngDigits, "lng", state.lngHemi);
    const name = String(state.name || "").trim();
    if (!name) {
      setErr("Ingresá un nombre para el marcador.");
      return;
    }
    if (lat == null || lng == null) {
      setErr(
        "Completá latitud y longitud (grados, minutos y segundos válidos)."
      );
      return;
    }
    setErr(null);
    try {
      await onSave?.({
        name,
        lat,
        lng,
        icon: state.icon,
        color: state.color,
      });
    } catch (ex) {
      setErr(ex?.message || "No se pudo guardar el marcador.");
    }
  }

  return (
    <div className="centinela-marker-modal" role="presentation">
      <button
        type="button"
        className="centinela-marker-modal__backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <form
        className="centinela-tool-panel centinela-goto-panel centinela-marker-modal__panel"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Editar marcador" : "Nuevo marcador"}
      >
        <div className="centinela-goto-panel__head centinela-marker-modal__head">
          <strong className="centinela-tool-panel__title">
            {mode === "edit" ? "Editar marcador" : "Nuevo marcador"}
          </strong>
          <button
            type="button"
            className="centinela-goto-panel__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <ErrorAlert
          message={err}
          className="alert alert-danger py-2 small mb-0"
        />

        <label className="centinela-goto-panel__field">
          <span className="centinela-goto-panel__label">Nombre</span>
          <input
            type="text"
            className="form-control form-control-sm centinela-goto-panel__input"
            value={state.name}
            maxLength={80}
            disabled={saving}
            onChange={(e) => {
              setState((s) => ({ ...s, name: e.target.value }));
              if (err) setErr(null);
            }}
            placeholder="Ej. Boya sospechosa"
            autoComplete="off"
          />
        </label>

        <label className="centinela-goto-panel__field">
          <span className="centinela-goto-panel__label">Latitud</span>
          <input
            type="text"
            inputMode="numeric"
            className="form-control form-control-sm centinela-goto-panel__input"
            value={formatDmsDigitsInput(state.latDigits, "lat")}
            onChange={(e) => setDigit("lat", e.target.value)}
            placeholder="00° 00′ 00.0″"
            disabled={saving}
            autoComplete="off"
            spellCheck={false}
          />
          <HemiToggle
            options={["N", "S"]}
            value={state.latHemi}
            onChange={(hemi) => setState((s) => ({ ...s, latHemi: hemi }))}
            ariaLabel="Hemisferio de latitud"
          />
        </label>

        <label className="centinela-goto-panel__field">
          <span className="centinela-goto-panel__label">Longitud</span>
          <input
            type="text"
            inputMode="numeric"
            className="form-control form-control-sm centinela-goto-panel__input"
            value={formatDmsDigitsInput(state.lngDigits, "lng")}
            onChange={(e) => setDigit("lng", e.target.value)}
            placeholder="000° 00′ 00.0″"
            disabled={saving}
            autoComplete="off"
            spellCheck={false}
          />
          <HemiToggle
            options={["E", "O"]}
            value={state.lngHemi}
            onChange={(hemi) => setState((s) => ({ ...s, lngHemi: hemi }))}
            ariaLabel="Hemisferio de longitud"
          />
        </label>

        <div className="centinela-marker-modal__preview" aria-hidden>
          <span
            className="centinela-marker-pin"
            style={{ background: state.color }}
          >
            <span className="material-symbols-outlined">{state.icon}</span>
          </span>
        </div>

        <div className="centinela-marker-modal__colors" role="group" aria-label="Color">
          {MAP_MARKER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`centinela-marker-modal__swatch${
                state.color === c ? " is-active" : ""
              }`}
              style={{ background: c }}
              aria-pressed={state.color === c}
              aria-label={`Color ${c}`}
              disabled={saving}
              onClick={() => setState((s) => ({ ...s, color: c }))}
            />
          ))}
        </div>

        <div className="centinela-marker-modal__accordion">
          <button
            type="button"
            className="centinela-marker-modal__accordion-btn"
            aria-expanded={iconsOpen}
            aria-controls={`${formId}-icons`}
            disabled={saving}
            onClick={() => setIconsOpen((o) => !o)}
          >
            <span>Ícono</span>
            <i
              className={`bi ${iconsOpen ? "bi-chevron-up" : "bi-chevron-down"}`}
              aria-hidden
            />
          </button>
          {iconsOpen ? (
            <div
              id={`${formId}-icons`}
              className="centinela-marker-modal__icon-groups"
            >
              {MAP_MARKER_ICON_GROUPS.map((group) => (
                <div key={group.id} className="centinela-marker-modal__icon-group">
                  <div className="centinela-marker-modal__icon-group-label">
                    {group.label}
                  </div>
                  <div className="centinela-marker-modal__icon-grid">
                    {group.icons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`centinela-marker-modal__icon-btn${
                          state.icon === icon ? " is-active" : ""
                        }`}
                        aria-pressed={state.icon === icon}
                        aria-label={icon}
                        disabled={saving}
                        onClick={() => setState((s) => ({ ...s, icon }))}
                      >
                        <span className="material-symbols-outlined">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="centinela-goto-panel__actions centinela-marker-modal__actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
