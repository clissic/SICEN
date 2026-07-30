/**
 * Líneas dinámicas para solicitar especializaciones en
 * «Actualización de datos». Cada fila: especialización (obligatoria si la
 * fila se usa), acción Alta/Baja según el estado actual del usuario, y
 * certificado PDF/imagen opcional.
 */
import { useMemo, useState } from "react";
import { USER_STATE_OPTIONS } from "../constants/userStates.js";

const MAX_CERT_BYTES = 2 * 1024 * 1024;
const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

function emptyRow() {
  return { name: "", certificateDataUrl: "", certificateFileName: "" };
}

function isAllowedCert(file) {
  const t = String(file.type || "").toLowerCase();
  const n = String(file.name || "").toLowerCase();
  if (t === "application/pdf" || n.endsWith(".pdf")) return true;
  if (t === "image/jpeg" || n.endsWith(".jpg") || n.endsWith(".jpeg")) {
    return true;
  }
  if (t === "image/png" || n.endsWith(".png")) return true;
  return false;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

/** @returns {"Alta"|"Baja"|""} */
export function specializationActionForUser(name, userStates) {
  const n = String(name || "").trim();
  if (!n) return "";
  const active = Array.isArray(userStates)
    ? userStates.some(
        (s) => String(s?.name ?? "").trim() === n && s?.isActive === true
      )
    : false;
  return active ? "Baja" : "Alta";
}

export function SpecializationRequestFields({
  rows,
  onChange,
  userStates = [],
  disabled = false,
}) {
  const list = Array.isArray(rows) && rows.length > 0 ? rows : [emptyRow()];
  const [fileErrByIdx, setFileErrByIdx] = useState({});
  const activeNames = useMemo(() => {
    const set = new Set();
    if (Array.isArray(userStates)) {
      for (const s of userStates) {
        if (s?.isActive === true) {
          const n = String(s?.name ?? "").trim();
          if (n) set.add(n);
        }
      }
    }
    return set;
  }, [userStates]);

  function updateRow(idx, patch) {
    onChange(list.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...list, emptyRow()]);
  }

  function removeRow(idx) {
    setFileErrByIdx((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    if (list.length <= 1) {
      onChange([emptyRow()]);
      return;
    }
    onChange(list.filter((_, i) => i !== idx));
  }

  async function onCertChange(idx, e) {
    setFileErrByIdx((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      updateRow(idx, { certificateDataUrl: "", certificateFileName: "" });
      return;
    }
    if (!isAllowedCert(file)) {
      setFileErrByIdx((prev) => ({
        ...prev,
        [idx]: "El archivo debe ser PDF, JPG o PNG.",
      }));
      e.target.value = "";
      updateRow(idx, { certificateDataUrl: "", certificateFileName: "" });
      return;
    }
    if (file.size > MAX_CERT_BYTES) {
      setFileErrByIdx((prev) => ({
        ...prev,
        [idx]: "El archivo supera 2 MB.",
      }));
      e.target.value = "";
      updateRow(idx, { certificateDataUrl: "", certificateFileName: "" });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateRow(idx, {
        certificateDataUrl: dataUrl,
        certificateFileName: file.name,
      });
    } catch {
      setFileErrByIdx((prev) => ({
        ...prev,
        [idx]: "No se pudo leer el archivo.",
      }));
      e.target.value = "";
      updateRow(idx, { certificateDataUrl: "", certificateFileName: "" });
    }
  }

  const selectedNames = list
    .map((r) => String(r.name || "").trim())
    .filter(Boolean);

  return (
    <div className="col-12">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label className="form-label mb-0">
          Solicitar especializaciones
        </label>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={addRow}
          disabled={disabled}
        >
          Agregar línea
        </button>
      </div>
      <div className="form-text mb-2">
        Indique las especializaciones. La acción se completa sola:{" "}
        <strong>Alta</strong> si aún no la tiene, <strong>Baja</strong> si ya
        está activa. El certificado (PDF o imagen) es opcional. Puede dejar la
        línea vacía si no corresponde.
      </div>
      {list.map((row, idx) => {
        const name = String(row.name || "");
        const action = name
          ? activeNames.has(name)
            ? "Baja"
            : "Alta"
          : "";
        return (
          <div className="row g-2 mb-2 align-items-start" key={idx}>
            <div className="col-md-5">
              <select
                className="form-select"
                value={name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                disabled={disabled}
                aria-label={`Especialización ${idx + 1}`}
                required={Boolean(row.certificateDataUrl)}
              >
                <option value="">Seleccione especialización…</option>
                {USER_STATE_OPTIONS.map((opt) => {
                  const taken =
                    selectedNames.includes(opt.name) && opt.name !== name;
                  return (
                    <option key={opt.code} value={opt.name} disabled={taken}>
                      {opt.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="text"
                className="form-control"
                value={action}
                readOnly
                disabled={disabled}
                placeholder="—"
                aria-label={`Acción especialización ${idx + 1}`}
              />
            </div>
            <div className="col-md-4">
              <input
                type="file"
                className="form-control"
                accept={ACCEPT}
                disabled={disabled}
                aria-label={`Certificado especialización ${idx + 1}`}
                onChange={(e) => onCertChange(idx, e)}
              />
              {row.certificateFileName ? (
                <div className="form-text text-truncate">
                  {row.certificateFileName}
                </div>
              ) : (
                <div className="form-text">PDF o imagen · máx. 2 MB</div>
              )}
              {fileErrByIdx[idx] ? (
                <div className="text-danger small">{fileErrByIdx[idx]}</div>
              ) : null}
            </div>
            <div className="col-md-1 d-flex">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm w-100"
                data-sicen-popover="Quitar línea"
                aria-label="Quitar línea"
                onClick={() => removeRow(idx)}
                disabled={disabled}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Filas listas para enviar (sin vacías). Si hay certificado sin
 * especialización, lanza Error con mensaje de UI.
 * @param {unknown[]} rows
 * @param {unknown} [userStates]
 */
export function normalizeSpecializationRequests(rows, userStates) {
  const allowed = new Set(USER_STATE_OPTIONS.map((o) => o.name));
  const list = Array.isArray(rows) ? rows : [];
  const out = [];
  const seen = new Set();
  for (const row of list) {
    const name = String(row?.name ?? "").trim();
    const certificateDataUrl = String(row?.certificateDataUrl ?? "").trim();
    const certificateFileName = String(row?.certificateFileName ?? "").trim();
    if (!name && !certificateDataUrl) continue;
    if (!name) {
      throw new Error(
        "Seleccione la especialización en cada línea con certificado."
      );
    }
    if (!allowed.has(name)) {
      throw new Error("Hay una especialización no válida en la solicitud.");
    }
    if (seen.has(name)) {
      throw new Error("No repita especializaciones en la solicitud.");
    }
    seen.add(name);
    const action = specializationActionForUser(name, userStates);
    out.push({
      name,
      action,
      ...(certificateDataUrl
        ? { certificateDataUrl, certificateFileName }
        : {}),
    });
  }
  return out;
}
