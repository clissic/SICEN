import { useEffect, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import { hcSimJob, hcSimStart, hcSimStatus } from "../../api/client.js";
import {
  decimalToDmsInputParts,
  dmsMaxDigitCount,
  formatDmsDigitsInput,
  parseDmsDigits,
} from "../../utils/geoDms.js";
import { CentinelaToolPanelHead } from "./CentinelaToolPanelHead.jsx";

const DEFAULT_OILS = [
  { id: "diesel", label: "Diesel / gasoil" },
  { id: "ifo180", label: "Fuel oil intermedio (IFO 180)" },
  { id: "crude_light", label: "Crudo genérico liviano" },
  { id: "crude_heavy", label: "Crudo genérico pesado" },
];

const QUANTITY_ITEMS = [
  { key: "surface", label: "Superficie" },
  { key: "evaporated", label: "Evaporado" },
  { key: "submerged", label: "Sumergido" },
  { key: "stranded", label: "Varado" },
  { key: "dispersed", label: "Disperso" },
  { key: "released", label: "Liberado" },
];

function HemiToggle({ options, value, onChange, ariaLabel }) {
  return (
    <div className="centinela-goto-panel__hemi" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`centinela-goto-panel__hemi-btn${value === opt ? " is-active" : ""}`}
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function formatKg(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} t`;
  return `${n.toFixed(0)} kg`;
}

function userFacingSimError(raw) {
  const msg = String(raw || "");
  if (/HC_SIM_ENABLED|deshabilitado|SICEN-sim|8091|timeout|no disponible/i.test(msg)) {
    return "El simulador no está disponible en este momento. Revisá la Ayuda o consultá a sistemas.";
  }
  return msg || "No se pudo simular el derrame.";
}

function HcTimelineControls({
  nSteps,
  timeIndex,
  tLabel,
  playing,
  onTimeIndexChange,
  onPlayingChange,
  onStop,
}) {
  if (nSteps <= 1) return null;
  return (
    <div className="centinela-hc-panel__timeline">
      <label className="centinela-hc-panel__field centinela-hc-panel__field--grow">
        <span>
          Tiempo · {tLabel} ({timeIndex + 1}/{nSteps})
        </span>
        <input
          type="range"
          min={0}
          max={nSteps - 1}
          value={timeIndex}
          onChange={(e) => {
            onPlayingChange?.(false);
            onTimeIndexChange?.(Number(e.target.value));
          }}
        />
      </label>
      <div className="centinela-hc-panel__media" role="group" aria-label="Reproducción">
        <button
          type="button"
          className="centinela-hc-panel__media-btn"
          onClick={() => {
            if (timeIndex >= nSteps - 1) onTimeIndexChange?.(0);
            onPlayingChange?.(true);
          }}
          disabled={playing}
          aria-label="Reproducir"
        >
          <i className="bi bi-play-circle-fill" aria-hidden />
        </button>
        <button
          type="button"
          className="centinela-hc-panel__media-btn"
          onClick={() => onPlayingChange?.(false)}
          disabled={!playing}
          aria-label="Pausar"
        >
          <i className="bi bi-pause-circle-fill" aria-hidden />
        </button>
        <button
          type="button"
          className="centinela-hc-panel__media-btn centinela-hc-panel__media-btn--stop"
          onClick={() => {
            onPlayingChange?.(false);
            onStop?.();
          }}
          aria-label="Detener y limpiar"
        >
          <i className="bi bi-stop-circle-fill" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Panel operativo de simulación de derrame HC.
 * Tras simular se puede achicar a barra de tiempo + play/pause/stop.
 */
export function HcSpillPanel({
  pickLatLng = null,
  pickActive = false,
  onPickRequest,
  onResult,
  onClear,
  onClose,
  result = null,
  timeIndex = 0,
  onTimeIndexChange,
  playing = false,
  onPlayingChange,
  minimized = false,
  onToggleMinimized,
}) {
  const [oils, setOils] = useState(DEFAULT_OILS);
  const [configEnabled, setConfigEnabled] = useState(null);
  const [oilTypeId, setOilTypeId] = useState("diesel");
  const [volumeM3, setVolumeM3] = useState("10");
  const [horizonHours, setHorizonHours] = useState(12);
  const [latDigits, setLatDigits] = useState("");
  const [lngDigits, setLngDigits] = useState("");
  const [latHemi, setLatHemi] = useState("S");
  const [lngHemi, setLngHemi] = useState("O");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hcSimStatus()
      .then((r) => {
        if (cancelled) return;
        setConfigEnabled(Boolean(r?.enabled));
        if (Array.isArray(r?.oils) && r.oils.length) setOils(r.oils);
      })
      .catch(() => {
        if (!cancelled) setConfigEnabled(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!result) setCompact(false);
  }, [result]);

  useEffect(() => {
    if (!pickLatLng) return;
    const latP = decimalToDmsInputParts(pickLatLng.lat, "lat");
    const lngP = decimalToDmsInputParts(pickLatLng.lng, "lng");
    setLatDigits(latP.digits);
    setLngDigits(lngP.digits);
    setLatHemi(latP.hemi);
    setLngHemi(lngP.hemi);
  }, [pickLatLng]);

  function setDigit(kind, raw) {
    const max = dmsMaxDigitCount(kind);
    const next = String(raw || "").replace(/\D/g, "").slice(0, max);
    if (kind === "lat") setLatDigits(next);
    else setLngDigits(next);
    if (err) setErr(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (configEnabled === false) {
      setErr(userFacingSimError("HC_SIM_ENABLED"));
      return;
    }
    const lat = parseDmsDigits(latDigits, "lat", latHemi);
    const lng = parseDmsDigits(lngDigits, "lng", lngHemi);
    const vol = Number(String(volumeM3).replace(",", "."));
    if (lat == null || lng == null) {
      setErr("Completá latitud y longitud en DMS.");
      return;
    }
    if (!Number.isFinite(vol) || vol <= 0) {
      setErr("Indicá un volumen válido en m³.");
      return;
    }
    setErr(null);
    setBusy(true);
    onPlayingChange?.(false);
    try {
      const start = await hcSimStart({
        lat,
        lon: lng,
        volumeM3: vol,
        oilTypeId,
        horizonHours,
        releaseDurationHours: 0,
        numParticles: 1500,
        startTime: new Date().toISOString(),
      });
      const jobId = start?.jobId;
      if (!jobId) throw new Error(start?.msg || "Sin jobId");
      let done = null;
      for (let i = 0; i < 90; i += 1) {
        await new Promise((r) => setTimeout(r, 1000));
        const job = await hcSimJob(jobId);
        if (job.status === "done") {
          done = job.result;
          break;
        }
        if (job.status === "error") {
          throw new Error(job.error || "Simulación fallida");
        }
      }
      if (!done) throw new Error("timeout");
      onResult?.(done);
      onPlayingChange?.(true);
      setCompact(true);
    } catch (ex) {
      setErr(userFacingSimError(ex?.message));
    } finally {
      setBusy(false);
    }
  }

  function resetAll() {
    onClear?.();
    setCompact(false);
    setErr(null);
    onPlayingChange?.(false);
    setOilTypeId("diesel");
    setVolumeM3("10");
    setHorizonHours(12);
    setLatDigits("");
    setLngDigits("");
    setLatHemi("S");
    setLngHemi("O");
  }

  const budget = result?.budget;
  const nSteps = result?.timesteps?.length || 0;
  const tLabel = result?.timesteps?.[timeIndex]?.t
    ? new Date(result.timesteps[timeIndex].t).toLocaleString("es-UY", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "—";

  const canSimulate = configEnabled !== false && !busy;
  const showCompact = Boolean(result && compact);

  if (showCompact) {
    return (
      <div
        className={[
          "centinela-tool-panel",
          "centinela-hc-panel",
          "centinela-hc-panel--compact",
          minimized ? "is-minimized" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="region"
        aria-label="Reproducción de simulación HC"
      >
        <CentinelaToolPanelHead
          className="centinela-hc-panel__head centinela-hc-panel__head--compact"
          title="Derrame HC"
          minimized={minimized}
          onToggleMinimized={onToggleMinimized}
          onClose={onClose}
          closeLabel="Cerrar simulación HC"
        >
          <button
            type="button"
            className="centinela-hc-panel__icon-btn"
            onClick={() => setCompact(false)}
            aria-label="Ampliar panel"
          >
            <i className="bi bi-arrows-angle-expand" aria-hidden />
          </button>
        </CentinelaToolPanelHead>
        <HcTimelineControls
          nSteps={nSteps}
          timeIndex={timeIndex}
          tLabel={tLabel}
          playing={playing}
          onTimeIndexChange={onTimeIndexChange}
          onPlayingChange={onPlayingChange}
          onStop={resetAll}
        />
      </div>
    );
  }

  return (
    <form
      className={[
        "centinela-tool-panel",
        "centinela-hc-panel",
        minimized ? "is-minimized" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onSubmit={handleSubmit}
      role="dialog"
      aria-label="Simular derrame de hidrocarburo"
    >
      <CentinelaToolPanelHead
        className="centinela-hc-panel__head centinela-hc-panel__head--row"
        title="Simular derrame HC"
        minimized={minimized}
        onToggleMinimized={onToggleMinimized}
        onClose={onClose}
        closeLabel="Cerrar simulación HC"
      >
        {result ? (
          <button
            type="button"
            className="centinela-hc-panel__icon-btn"
            onClick={() => setCompact(true)}
            aria-label="Achicar panel"
          >
            <i className="bi bi-arrows-angle-contract" aria-hidden />
          </button>
        ) : null}
      </CentinelaToolPanelHead>

      <ErrorAlert message={err} className="alert alert-danger py-2 small mb-0" />

      <div className="centinela-hc-panel__coords">
        <div className="centinela-hc-panel__grid">
          <label className="centinela-goto-panel__field">
            <span className="centinela-goto-panel__label">Latitud</span>
            <input
              inputMode="numeric"
              className="form-control form-control-sm centinela-goto-panel__input"
              value={formatDmsDigitsInput(latDigits, "lat")}
              onChange={(e) => setDigit("lat", e.target.value)}
              placeholder="00° 00′ 00.0″"
              disabled={busy}
            />
            <HemiToggle
              options={["N", "S"]}
              value={latHemi}
              onChange={setLatHemi}
              ariaLabel="Hemisferio latitud"
            />
          </label>
          <label className="centinela-goto-panel__field">
            <span className="centinela-goto-panel__label">Longitud</span>
            <input
              inputMode="numeric"
              className="form-control form-control-sm centinela-goto-panel__input"
              value={formatDmsDigitsInput(lngDigits, "lng")}
              onChange={(e) => setDigit("lng", e.target.value)}
              placeholder="000° 00′ 00.0″"
              disabled={busy}
            />
            <HemiToggle
              options={["E", "O"]}
              value={lngHemi}
              onChange={setLngHemi}
              ariaLabel="Hemisferio longitud"
            />
          </label>
        </div>
        <button
          type="button"
          className={[
            "centinela-hc-panel__pick",
            pickActive ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onPickRequest?.()}
          disabled={busy}
          aria-pressed={pickActive}
          aria-label="Seleccionar en mapa"
        >
          <i className="bi bi-cursor" aria-hidden />
          <span className="centinela-hc-panel__pick-label">Seleccionar en mapa</span>
        </button>
      </div>

      <div className="centinela-hc-panel__row centinela-hc-panel__row--params">
        <label className="centinela-hc-panel__field">
          <span>Tipo de HC</span>
          <select
            className="form-select form-select-sm"
            value={oilTypeId}
            onChange={(e) => setOilTypeId(e.target.value)}
            disabled={busy}
          >
            {oils.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="centinela-hc-panel__field">
          <span>Volumen (m³)</span>
          <input
            className="form-control form-control-sm"
            value={volumeM3}
            onChange={(e) => setVolumeM3(e.target.value)}
            disabled={busy}
            inputMode="decimal"
          />
        </label>
        <label className="centinela-hc-panel__field">
          <span>Horizonte</span>
          <select
            className="form-select form-select-sm"
            value={horizonHours}
            onChange={(e) => setHorizonHours(Number(e.target.value))}
            disabled={busy}
          >
            <option value={6}>6 h</option>
            <option value={12}>12 h</option>
            <option value={24}>24 h</option>
          </select>
        </label>
        <button
          type="submit"
          className="centinela-hc-panel__run"
          disabled={!canSimulate}
          aria-label={busy ? "Simulando…" : "Simular"}
          data-sicen-popover={busy ? "Simulando…" : "Simular"}
          data-sicen-popover-placement="top"
        >
          <i
            className={busy ? "bi bi-hourglass-split" : "bi bi-droplet-half"}
            aria-hidden
          />
          <span className="centinela-hc-panel__run-label">
            {busy ? "…" : "Simular"}
          </span>
        </button>
      </div>

      {budget ? (
        <div className="centinela-hc-panel__budget" aria-label="Cantidades">
          <div className="centinela-hc-panel__budget-title">Cantidades</div>
          <div className="centinela-hc-panel__budget-grid">
            {QUANTITY_ITEMS.map((item) => (
              <div key={item.key} className="centinela-hc-panel__budget-item">
                <span className="centinela-hc-panel__budget-label">{item.label}</span>
                <strong className="centinela-hc-panel__budget-value">
                  {formatKg(budget[item.key])}
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <HcTimelineControls
        nSteps={nSteps}
        timeIndex={timeIndex}
        tLabel={tLabel}
        playing={playing}
        onTimeIndexChange={onTimeIndexChange}
        onPlayingChange={onPlayingChange}
        onStop={resetAll}
      />
    </form>
  );
}
