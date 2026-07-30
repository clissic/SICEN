/**
 * Líneas dinámicas para cargar puertos en jurisdicción de una unidad.
 * El padre debe incluir `ports` en el FormData al enviar (JSON).
 */
export function UnitJurisdictionPortsFields({
  ports,
  onChange,
  disabled = false,
  idPrefix = "unit-port",
}) {
  const rows = Array.isArray(ports) && ports.length > 0 ? ports : [""];

  function updateRow(idx, value) {
    const next = rows.map((row, i) => (i === idx ? value : row));
    onChange(next);
  }

  function addRow() {
    onChange([...rows, ""]);
  }

  function removeRow(idx) {
    if (rows.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="col-12">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label className="form-label mb-0">Puertos en jurisdicción</label>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={addRow}
          disabled={disabled}
        >
          Agregar puerto
        </button>
      </div>
      <div className="form-text mb-2">
        Indique los puertos bajo jurisdicción de esta unidad. Puede dejar la
        línea vacía si no corresponde.
      </div>
      {rows.map((value, idx) => (
        <div className="row g-2 mb-2" key={`${idPrefix}-${idx}`}>
          <div className="col-11">
            <input
              type="text"
              className="form-control"
              value={value}
              maxLength={200}
              placeholder="Nombre del puerto"
              aria-label={`Puerto en jurisdicción ${idx + 1}`}
              onChange={(e) => updateRow(idx, e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="col-1 d-flex">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm w-100"
              data-sicen-popover="Quitar puerto"
              aria-label="Quitar puerto"
              onClick={() => removeRow(idx)}
              disabled={disabled}
            >
              <i className="bi bi-x-lg" aria-hidden />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Serializa el array para enviarlo en multipart (`puertosJurisdiccion`). */
export function appendPortsUnderJurisdiction(formData, ports) {
  const cleaned = (Array.isArray(ports) ? ports : [])
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  formData.set("puertosJurisdiccion", JSON.stringify(cleaned));
}
