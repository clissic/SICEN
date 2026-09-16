import { useEffect, useId, useMemo, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import {
  MAP_MARKER_COLORS,
  MAP_MARKER_DEFAULT_COLOR,
} from "../../constants/centinelaMarkerIcons.js";
import {
  decimalToDmsInputParts,
  dmsMaxDigitCount,
  formatDmsDigitsInput,
  parseDmsDigits,
} from "../../utils/geoDms.js";
import {
  formatPolygonAreaParts,
  polygonAreaSquareMeters,
} from "../../utils/geoMeasure.js";
import { CentinelaToolPanelHead } from "./CentinelaToolPanelHead.jsx";

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

function emptyPoint() {
  return {
    latDigits: "",
    lngDigits: "",
    latHemi: "S",
    lngHemi: "O",
  };
}

function pointFromLatLng(lat, lng) {
  const latParts = decimalToDmsInputParts(
    Number.isFinite(lat) ? lat : NaN,
    "lat"
  );
  const lngParts = decimalToDmsInputParts(
    Number.isFinite(lng) ? lng : NaN,
    "lng"
  );
  return {
    latDigits: latParts.digits,
    lngDigits: lngParts.digits,
    latHemi: latParts.hemi,
    lngHemi: lngParts.hemi,
  };
}

function initialFromZone(initial) {
  const pts = Array.isArray(initial?.positions) ? initial.positions : [];
  const points =
    pts.length >= 1
      ? pts.map((p) => pointFromLatLng(Number(p?.[0]), Number(p?.[1])))
      : [emptyPoint(), emptyPoint(), emptyPoint()];
  while (points.length < 3) {
    points.push(emptyPoint());
  }
  return {
    name: initial?.name || "",
    color: initial?.color || MAP_MARKER_DEFAULT_COLOR,
    points,
  };
}

function parsePoint(pt) {
  const lat = parseDmsDigits(pt.latDigits, "lat", pt.latHemi);
  const lng = parseDmsDigits(pt.lngDigits, "lng", pt.lngHemi);
  if (lat == null || lng == null) return null;
  return [lat, lng];
}

/**
 * Panel inferior: alta/edición de zona personal (≥3 vértices).
 * Sin backdrop: el mapa sigue interactivo (pick de vértices).
 */
export function ZoneFormModal({
  mode = "create",
  initial = null,
  saving = false,
  pickMode = false,
  pendingMapPoint = null,
  onConsumeMapPoint,
  pendingVertexMove = null,
  onConsumeVertexMove,
  onTogglePickMode,
  onSave,
  onClose,
  onPointsChange,
  minimized = false,
  onToggleMinimized,
}) {
  const formId = useId();
  const [state, setState] = useState(() => initialFromZone(initial));
  const [err, setErr] = useState(null);
  const [areaUnit, setAreaUnit] = useState("m2");

  useEffect(() => {
    setState(initialFromZone(initial));
    setErr(null);
  }, [initial, mode]);

  const areaParts = useMemo(() => {
    const positions = [];
    for (const pt of state.points) {
      const parsed = parsePoint(pt);
      if (parsed) positions.push(parsed);
    }
    const m2 = polygonAreaSquareMeters(positions);
    return formatPolygonAreaParts(m2, areaUnit);
  }, [state.points, areaUnit]);

  useEffect(() => {
    const vertices = state.points.flatMap((pt, index) => {
      const p = parsePoint(pt);
      return p ? [{ index, lat: p[0], lng: p[1] }] : [];
    });
    onPointsChange?.({ vertices, color: state.color });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft al editar puntos/color
  }, [state.points, state.color]);

  useEffect(() => {
    if (!pendingMapPoint) return;
    const lat = Number(pendingMapPoint.lat);
    const lng = Number(pendingMapPoint.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      onConsumeMapPoint?.();
      return;
    }
    const next = pointFromLatLng(lat, lng);
    setState((s) => {
      const idx = s.points.findIndex((p) => !parsePoint(p));
      if (idx >= 0) {
        const points = s.points.slice();
        points[idx] = next;
        return { ...s, points };
      }
      return { ...s, points: [...s.points, next] };
    });
    setErr(null);
    onConsumeMapPoint?.();
  }, [pendingMapPoint, onConsumeMapPoint]);

  useEffect(() => {
    if (!pendingVertexMove) return;
    const idx = Number(pendingVertexMove.index);
    const lat = Number(pendingVertexMove.lat);
    const lng = Number(pendingVertexMove.lng);
    if (
      !Number.isFinite(idx) ||
      idx < 0 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      onConsumeVertexMove?.();
      return;
    }
    const next = pointFromLatLng(lat, lng);
    setState((s) => {
      if (idx >= s.points.length) return s;
      const points = s.points.slice();
      points[idx] = next;
      return { ...s, points };
    });
    setErr(null);
    onConsumeVertexMove?.();
  }, [pendingVertexMove, onConsumeVertexMove]);

  function setDigit(idx, kind, raw) {
    const max = dmsMaxDigitCount(kind);
    const next = String(raw || "")
      .replace(/\D/g, "")
      .slice(0, max);
    setState((s) => {
      const points = s.points.map((p, i) => {
        if (i !== idx) return p;
        return kind === "lat"
          ? { ...p, latDigits: next }
          : { ...p, lngDigits: next };
      });
      return { ...s, points };
    });
    if (err) setErr(null);
  }

  function setHemi(idx, kind, hemi) {
    setState((s) => {
      const points = s.points.map((p, i) => {
        if (i !== idx) return p;
        return kind === "lat"
          ? { ...p, latHemi: hemi }
          : { ...p, lngHemi: hemi };
      });
      return { ...s, points };
    });
  }

  function addPoint() {
    setState((s) => ({ ...s, points: [...s.points, emptyPoint()] }));
    if (err) setErr(null);
  }

  function removePoint(idx) {
    setState((s) => {
      if (s.points.length <= 3) return s;
      return { ...s, points: s.points.filter((_, i) => i !== idx) };
    });
  }

  function movePoint(idx, dir) {
    setState((s) => {
      const j = idx + dir;
      if (j < 0 || j >= s.points.length) return s;
      const points = s.points.slice();
      const tmp = points[idx];
      points[idx] = points[j];
      points[j] = tmp;
      return { ...s, points };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const name = String(state.name || "").trim();
    if (!name) {
      setErr("Ingresá un nombre para la zona.");
      return;
    }
    const positions = [];
    for (let i = 0; i < state.points.length; i++) {
      const parsed = parsePoint(state.points[i]);
      if (!parsed) {
        setErr(
          `Completá el punto ${i + 1} (latitud y longitud DMS válidas).`
        );
        return;
      }
      positions.push(parsed);
    }
    if (positions.length < 3) {
      setErr("La zona necesita al menos 3 puntos.");
      return;
    }
    setErr(null);
    try {
      await onSave?.({
        name,
        color: state.color,
        positions,
      });
    } catch (ex) {
      setErr(ex?.message || "No se pudo guardar la zona.");
    }
  }

  return (
    <form
      className={[
        "centinela-tool-panel",
        "centinela-zone-form",
        minimized ? "is-minimized" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onSubmit={handleSubmit}
      role="dialog"
      aria-label={mode === "edit" ? "Editar zona" : "Nueva zona"}
    >
      <CentinelaToolPanelHead
        className="centinela-goto-panel__head"
        title={mode === "edit" ? "Editar zona" : "Nueva zona"}
        minimized={minimized}
        onToggleMinimized={onToggleMinimized}
        onClose={onClose}
      />

      <ErrorAlert
        message={err}
        className="alert alert-danger py-2 small mb-0"
      />

      <div className="centinela-zone-form__top">
        <label className="centinela-marker-form__name">
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
            placeholder="Ej. Área de interés"
            autoComplete="off"
          />
        </label>
        <div
          className="centinela-marker-form__colors"
          role="group"
          aria-label="Color"
        >
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
      </div>

      <div className="centinela-zone-form__points-head">
        <span className="centinela-goto-panel__label">
          Puntos ({state.points.length})
        </span>
        <div className="centinela-zone-form__points-actions">
          <button
            type="button"
            className={[
              "centinela-hc-panel__pick",
              "centinela-zone-form__pick",
              pickMode ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={saving}
            aria-pressed={pickMode}
            aria-label="Seleccionar en mapa"
            onClick={() => onTogglePickMode?.(!pickMode)}
          >
            <i className="bi bi-cursor" aria-hidden />
            <span className="centinela-hc-panel__pick-label">
              Seleccionar en mapa
            </span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={saving}
            onClick={addPoint}
          >
            <i className="bi bi-plus-lg" aria-hidden /> Agregar punto
          </button>
        </div>
      </div>

      <div id={`${formId}-points`} className="centinela-zone-form__points">
        {state.points.map((pt, idx) => (
          <div key={idx} className="centinela-zone-form__point">
            <span className="centinela-zone-form__idx" aria-hidden>
              {idx + 1}
            </span>
            <input
              type="text"
              inputMode="numeric"
              className="form-control form-control-sm centinela-goto-panel__input"
              value={formatDmsDigitsInput(pt.latDigits, "lat")}
              onChange={(e) => setDigit(idx, "lat", e.target.value)}
              placeholder="Lat"
              disabled={saving}
              autoComplete="off"
              spellCheck={false}
              aria-label={`Latitud punto ${idx + 1}`}
            />
            <HemiToggle
              options={["N", "S"]}
              value={pt.latHemi}
              onChange={(hemi) => setHemi(idx, "lat", hemi)}
              ariaLabel={`Hemisferio latitud punto ${idx + 1}`}
            />
            <input
              type="text"
              inputMode="numeric"
              className="form-control form-control-sm centinela-goto-panel__input"
              value={formatDmsDigitsInput(pt.lngDigits, "lng")}
              onChange={(e) => setDigit(idx, "lng", e.target.value)}
              placeholder="Lon"
              disabled={saving}
              autoComplete="off"
              spellCheck={false}
              aria-label={`Longitud punto ${idx + 1}`}
            />
            <HemiToggle
              options={["E", "O"]}
              value={pt.lngHemi}
              onChange={(hemi) => setHemi(idx, "lng", hemi)}
              ariaLabel={`Hemisferio longitud punto ${idx + 1}`}
            />
            <div className="centinela-zone-form__point-btns">
              <div className="centinela-zone-form__point-btns-move">
                <button
                  type="button"
                  className="centinela-markers-list__icon-btn"
                  aria-label="Subir"
                  disabled={saving || idx === 0}
                  onClick={() => movePoint(idx, -1)}
                >
                  <i className="bi bi-arrow-up" aria-hidden />
                </button>
                <button
                  type="button"
                  className="centinela-markers-list__icon-btn"
                  aria-label="Bajar"
                  disabled={saving || idx === state.points.length - 1}
                  onClick={() => movePoint(idx, 1)}
                >
                  <i className="bi bi-arrow-down" aria-hidden />
                </button>
              </div>
              <div className="centinela-zone-form__point-btns-delete">
                <button
                  type="button"
                  className="centinela-markers-list__icon-btn"
                  aria-label="Quitar punto"
                  disabled={saving || state.points.length <= 3}
                  onClick={() => removePoint(idx)}
                >
                  <i className="bi bi-trash" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="centinela-zone-form__footer">
        <div className="centinela-zone-form__area" aria-live="polite">
          <span className="centinela-zone-form__area-label">
            Área:{" "}
            <strong className="centinela-zone-form__area-value">
              {areaParts.value} {areaParts.unitLabel}
            </strong>
          </span>
          <div
            className="centinela-measure-panel__toggles"
            role="group"
            aria-label="Unidad de área"
          >
            <button
              type="button"
              className={[
                "centinela-measure-panel__unit-btn",
                areaUnit === "m2" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={areaUnit === "m2"}
              onClick={() => setAreaUnit("m2")}
            >
              m²
            </button>
            <button
              type="button"
              className={[
                "centinela-measure-panel__unit-btn",
                areaUnit === "ha" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={areaUnit === "ha"}
              onClick={() => setAreaUnit("ha")}
            >
              ha
            </button>
          </div>
        </div>
        <div className="centinela-zone-form__actions centinela-tool-save-actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary centinela-tool-save-actions__btn"
            onClick={onClose}
            disabled={saving}
            aria-label="Cancelar"
            data-sicen-popover="Cancelar"
            data-sicen-popover-placement="top"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
          <button
            type="submit"
            className="btn btn-sm btn-primary centinela-tool-save-actions__btn"
            disabled={saving}
            aria-label={saving ? "Guardando…" : "Guardar"}
            data-sicen-popover={saving ? "Guardando…" : "Guardar"}
            data-sicen-popover-placement="top"
          >
            <i
              className={saving ? "bi bi-hourglass-split" : "bi bi-floppy"}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </form>
  );
}
