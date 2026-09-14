import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import { sarSimJob, sarSimStart, sarSimStatus } from "../../api/client.js";
import {
  decimalToDmsInputParts,
  dmsMaxDigitCount,
  formatDmsDigitsInput,
  parseDmsDigits,
} from "../../utils/geoDms.js";

const DEFAULT_OBJECTS = [
  {
    id: "piw_unknown",
    label: "Persona en agua (estado desconocido)",
    startsSubmerged: false,
  },
  {
    id: "piw_pfd",
    label: "Persona con chaleco (consciente)",
    startsSubmerged: false,
  },
  {
    id: "piw_deceased_surface",
    label: "Persona fallecida (flotando)",
    startsSubmerged: false,
  },
  {
    id: "piw_deceased_submerged",
    label: "Persona fallecida (hundida → reaparece)",
    startsSubmerged: true,
  },
  { id: "kayak", label: "Kayak / embarcación chica", startsSubmerged: false },
  {
    id: "liferaft",
    label: "Balsa salvavidas (valores medios)",
    startsSubmerged: false,
  },
  { id: "small_boat", label: "Bote / lancha", startsSubmerged: false },
  {
    id: "fishing_vessel",
    label: "Buque pesquero / mayor",
    startsSubmerged: false,
  },
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

function userFacingSarError(raw) {
  const msg = String(raw || "");
  if (/SAR_SIM_ENABLED|deshabilitado|SICEN-sim|8091|timeout|no disponible/i.test(msg)) {
    return "El simulador SAR no está disponible en este momento. Revisá el Manual o consultá a sistemas.";
  }
  return msg || "No se pudo simular la deriva.";
}

function toLocalInputValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(localStr) {
  if (!localStr) return new Date().toISOString();
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function SarTimelineControls({
  nSteps,
  timeIndex,
  tLabel,
  playing,
  phaseLabel,
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
          {phaseLabel ? ` · ${phaseLabel}` : ""}
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
 * Panel operativo de simulación de deriva SAR.
 */
export function SarDriftPanel({
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
}) {
  const [objects, setObjects] = useState(DEFAULT_OBJECTS);
  const [configEnabled, setConfigEnabled] = useState(null);
  const [objectTypeId, setObjectTypeId] = useState("piw_unknown");
  const [horizonHours, setHorizonHours] = useState(12);
  const [uncertaintyM, setUncertaintyM] = useState("500");
  const [eventLocal, setEventLocal] = useState(() => toLocalInputValue());
  const [latDigits, setLatDigits] = useState("");
  const [lngDigits, setLngDigits] = useState("");
  const [latHemi, setLatHemi] = useState("S");
  const [lngHemi, setLngHemi] = useState("O");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sarSimStatus()
      .then((r) => {
        if (cancelled) return;
        setConfigEnabled(Boolean(r?.enabled));
        if (Array.isArray(r?.objects) && r.objects.length) setObjects(r.objects);
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

  const selectedObj = useMemo(
    () => objects.find((o) => o.id === objectTypeId) || null,
    [objects, objectTypeId]
  );

  function setDigit(kind, raw) {
    const max = dmsMaxDigitCount(kind);
    const next = String(raw || "").replace(/\D/g, "").slice(0, max);
    if (kind === "lat") setLatDigits(next);
    else setLngDigits(next);
    if (err) setErr(null);
  }

  function resetAll() {
    onClear?.();
    setCompact(false);
    setErr(null);
    onPlayingChange?.(false);
    setObjectTypeId("piw_unknown");
    setHorizonHours(12);
    setUncertaintyM("500");
    setEventLocal(toLocalInputValue());
    setLatDigits("");
    setLngDigits("");
    setLatHemi("S");
    setLngHemi("O");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (configEnabled === false) {
      setErr(userFacingSarError("SAR_SIM_ENABLED"));
      return;
    }
    const lat = parseDmsDigits(latDigits, "lat", latHemi);
    const lng = parseDmsDigits(lngDigits, "lng", lngHemi);
    const unc = Number(String(uncertaintyM).replace(",", "."));
    if (lat == null || lng == null) {
      setErr("Completá latitud y longitud en DMS.");
      return;
    }
    if (!Number.isFinite(unc) || unc < 0) {
      setErr("Indicá un radio de incertidumbre válido en metros.");
      return;
    }
    setErr(null);
    setBusy(true);
    onPlayingChange?.(false);
    try {
      const start = await sarSimStart({
        lat,
        lon: lng,
        objectTypeId,
        horizonHours,
        uncertaintyRadiusM: unc,
        numParticles: 1500,
        startTime: localInputToIso(eventLocal),
      });
      const jobId = start?.jobId;
      if (!jobId) throw new Error(start?.msg || "Sin jobId");
      let done = null;
      for (let i = 0; i < 120; i += 1) {
        await new Promise((r) => setTimeout(r, 1000));
        const job = await sarSimJob(jobId);
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
      setErr(userFacingSarError(ex?.message));
    } finally {
      setBusy(false);
    }
  }

  const nSteps = result?.timesteps?.length || 0;
  const step = result?.timesteps?.[timeIndex];
  const tLabel = step?.t
    ? new Date(step.t).toLocaleString("es-UY", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "—";
  const phaseLabel =
    step?.phase === "submerged"
      ? "Sumergido"
      : step?.phase === "mixed"
        ? "Reapareciendo"
        : step?.phase === "surface"
          ? "En superficie"
          : "";

  const canSimulate = configEnabled !== false && !busy;
  const showCompact = Boolean(result && compact);

  if (showCompact) {
    return (
      <div
        className="centinela-tool-panel centinela-hc-panel centinela-hc-panel--compact"
        role="region"
        aria-label="Reproducción de deriva SAR"
      >
        <div className="centinela-hc-panel__head centinela-hc-panel__head--compact">
          <strong className="centinela-tool-panel__title">Deriva SAR</strong>
          <div className="centinela-hc-panel__head-actions">
            <button
              type="button"
              className="centinela-hc-panel__icon-btn"
              onClick={() => setCompact(false)}
              aria-label="Ampliar panel"
            >
              <i className="bi bi-arrows-angle-expand" aria-hidden />
            </button>
            {onClose ? (
              <button
                type="button"
                className="centinela-goto-panel__close"
                onClick={onClose}
                aria-label="Cerrar simulación SAR"
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <SarTimelineControls
          nSteps={nSteps}
          timeIndex={timeIndex}
          tLabel={tLabel}
          playing={playing}
          phaseLabel={phaseLabel}
          onTimeIndexChange={onTimeIndexChange}
          onPlayingChange={onPlayingChange}
          onStop={resetAll}
        />
      </div>
    );
  }

  return (
    <form
      className="centinela-tool-panel centinela-hc-panel"
      onSubmit={handleSubmit}
      role="dialog"
      aria-label="Simular deriva SAR"
    >
      <div className="centinela-hc-panel__head centinela-hc-panel__head--row">
        <strong className="centinela-tool-panel__title">Simular deriva SAR</strong>
        <div className="centinela-hc-panel__head-actions">
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
          {onClose ? (
            <button
              type="button"
              className="centinela-goto-panel__close"
              onClick={onClose}
              aria-label="Cerrar simulación SAR"
            >
              <i className="bi bi-x-lg" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <p className="centinela-hc-panel__disclaimer mb-0">
        Apoyo a la búsqueda: área probable, no ubicación certe.
      </p>

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

      <div className="centinela-hc-panel__row">
        <label className="centinela-hc-panel__field centinela-hc-panel__field--grow">
          <span>Hora del evento</span>
          <input
            type="datetime-local"
            className="form-control form-control-sm"
            value={eventLocal}
            onChange={(e) => setEventLocal(e.target.value)}
            disabled={busy}
          />
        </label>
      </div>

      <div className="centinela-hc-panel__row centinela-hc-panel__row--params">
        <label className="centinela-hc-panel__field">
          <span>Objeto</span>
          <select
            className="form-select form-select-sm"
            value={objectTypeId}
            onChange={(e) => setObjectTypeId(e.target.value)}
            disabled={busy}
          >
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="centinela-hc-panel__field">
          <span>Incertidumbre (m)</span>
          <input
            className="form-control form-control-sm"
            value={uncertaintyM}
            onChange={(e) => setUncertaintyM(e.target.value)}
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
            <option value={48}>48 h</option>
          </select>
        </label>
        <button
          type="submit"
          className="centinela-hc-panel__run"
          disabled={!canSimulate}
          aria-label={busy ? "Simulando…" : "Simular"}
        >
          <i
            className={busy ? "bi bi-hourglass-split" : "bi bi-compass"}
            aria-hidden
          />
          <span className="centinela-hc-panel__run-label">
            {busy ? "…" : "Simular"}
          </span>
        </button>
      </div>

      {selectedObj?.startsSubmerged ? (
        <p className="small mb-0 opacity-75">
          Modo hundido: acumula grados-día (ADD) con la temperatura del agua hasta
          reaparecer (~100 °C·día). Luego deriva en superficie.
        </p>
      ) : null}

      {result?.meta?.startsSubmerged ? (
        <div className="centinela-hc-panel__budget" aria-label="Estado ADD">
          <div className="centinela-hc-panel__budget-title">Estado de flotación</div>
          <div className="centinela-hc-panel__budget-grid">
            <div className="centinela-hc-panel__budget-item">
              <span className="centinela-hc-panel__budget-label">Fase final</span>
              <strong className="centinela-hc-panel__budget-value">
                {result.meta.floatState === "submerged"
                  ? "Aún sumergido"
                  : result.meta.floatState === "mixed"
                    ? "Parcial"
                    : "En superficie"}
              </strong>
            </div>
            <div className="centinela-hc-panel__budget-item">
              <span className="centinela-hc-panel__budget-label">ADD medio</span>
              <strong className="centinela-hc-panel__budget-value">
                {result.meta.addMeanFinal != null
                  ? `${result.meta.addMeanFinal} °C·d`
                  : "—"}
              </strong>
            </div>
            <div className="centinela-hc-panel__budget-item">
              <span className="centinela-hc-panel__budget-label">1.ª flotación</span>
              <strong className="centinela-hc-panel__budget-value">
                {result.meta.firstFloatHoursMedian != null
                  ? `${result.meta.firstFloatHoursMedian} h`
                  : "—"}
              </strong>
            </div>
          </div>
        </div>
      ) : null}

      {step?.phase === "submerged" ? (
        <p className="small mb-0">
          En este instante la nube aún está sumergida
          {step.addMean != null ? ` (ADD ≈ ${step.addMean} °C·d)` : ""}.
        </p>
      ) : null}

      <SarTimelineControls
        nSteps={nSteps}
        timeIndex={timeIndex}
        tLabel={tLabel}
        playing={playing}
        phaseLabel={phaseLabel}
        onTimeIndexChange={onTimeIndexChange}
        onPlayingChange={onPlayingChange}
        onStop={resetAll}
      />
    </form>
  );
}
