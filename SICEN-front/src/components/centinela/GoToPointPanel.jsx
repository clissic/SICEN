import { useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import {
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

/**
 * Flotante: ir a un punto por Lat/Long en DMS (entrada por dígitos + hemi).
 */
export function GoToPointPanel({ onGo, onClose }) {
  const [latDigits, setLatDigits] = useState("");
  const [lngDigits, setLngDigits] = useState("");
  const [latHemi, setLatHemi] = useState("S");
  const [lngHemi, setLngHemi] = useState("O");
  const [err, setErr] = useState(null);

  function handleDigitChange(kind, raw) {
    const max = dmsMaxDigitCount(kind);
    const next = String(raw || "")
      .replace(/\D/g, "")
      .slice(0, max);
    if (kind === "lat") setLatDigits(next);
    else setLngDigits(next);
    if (err) setErr(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const lat = parseDmsDigits(latDigits, "lat", latHemi);
    const lng = parseDmsDigits(lngDigits, "lng", lngHemi);
    if (lat == null || lng == null) {
      setErr(
        "Completá latitud y longitud (grados, minutos y segundos). Minutos y segundos deben ser menores a 60; lat ≤ 90° y long ≤ 180°."
      );
      return;
    }
    setErr(null);
    onGo?.({ lat, lng });
  }

  return (
    <form
      className="centinela-tool-panel centinela-goto-panel"
      onSubmit={handleSubmit}
      role="dialog"
      aria-label="Ir a un punto"
    >
      <div className="centinela-goto-panel__head">
        <strong className="centinela-tool-panel__title">Ir a un punto</strong>
        {onClose ? (
          <button
            type="button"
            className="centinela-goto-panel__close"
            aria-label="Cerrar Ir a un punto"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        ) : null}
      </div>

      <ErrorAlert message={err} className="alert alert-danger py-2 small mb-0" />

      <div className="centinela-hc-panel__coords">
        <div className="centinela-hc-panel__grid">
          <label className="centinela-goto-panel__field">
            <span className="centinela-goto-panel__label">Latitud</span>
            <input
              type="text"
              inputMode="numeric"
              className="form-control form-control-sm centinela-goto-panel__input"
              value={formatDmsDigitsInput(latDigits, "lat")}
              onChange={(e) => handleDigitChange("lat", e.target.value)}
              placeholder="00° 00′ 00.0″"
              autoComplete="off"
              spellCheck={false}
              aria-label="Latitud en grados, minutos y segundos"
            />
            <HemiToggle
              options={["N", "S"]}
              value={latHemi}
              onChange={setLatHemi}
              ariaLabel="Hemisferio de latitud"
            />
          </label>

          <label className="centinela-goto-panel__field">
            <span className="centinela-goto-panel__label">Longitud</span>
            <input
              type="text"
              inputMode="numeric"
              className="form-control form-control-sm centinela-goto-panel__input"
              value={formatDmsDigitsInput(lngDigits, "lng")}
              onChange={(e) => handleDigitChange("lng", e.target.value)}
              placeholder="000° 00′ 00.0″"
              autoComplete="off"
              spellCheck={false}
              aria-label="Longitud en grados, minutos y segundos"
            />
            <HemiToggle
              options={["E", "O"]}
              value={lngHemi}
              onChange={setLngHemi}
              ariaLabel="Hemisferio de longitud"
            />
          </label>
        </div>
        <button
          type="submit"
          className="centinela-hc-panel__pick"
          aria-label="Ir al punto"
          data-sicen-popover="Ir al punto"
          data-sicen-popover-placement="left"
        >
          <i className="bi bi-geo-alt" aria-hidden />
          <span className="centinela-hc-panel__pick-label">Ir al punto</span>
        </button>
      </div>
    </form>
  );
}
