import { useState } from "react";
import { usersPaginated } from "../../api/client.js";
import { confirmSkipperVesselLink } from "../../utils/confirmSkipperVesselLink.js";
import { formatSkipperLabel } from "../../utils/skipperUserLabel.js";

export { formatSkipperLabel };
/**
 * Busca un náuta deportivo por DNI / pasaporte y permite seleccionarlo.
 */
export function SkipperDocumentLookupField({
  idPrefix = "skipper",
  label = "Buscar náuta por DNI / pasaporte",
  value = null,
  onChange,
  excludedUserIds = [],
  disabled = false,
  /** default | embedded — embedded va debajo de otro campo (sin caja grande). */
  variant = "default",
  /** Si se indica (ej. "propietario", "administrador"), pide confirmación al elegir. */
  linkRoleLabel = "",
}) {
  const [docQuery, setDocQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [candidates, setCandidates] = useState([]);

  const excluded = new Set(
    (excludedUserIds || []).map((id) => String(id)).filter(Boolean)
  );

  async function handleSearch(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const q = String(docQuery || "").trim();
    if (!q) {
      setSearchErr("Indique el documento.");
      setCandidates([]);
      return;
    }
    setSearching(true);
    setSearchErr("");
    setCandidates([]);
    try {
      const data = await usersPaginated({
        currentPage: 1,
        pageSize: 10,
        role: "skipper",
        documentId: q,
      });
      const docs = Array.isArray(data?.payload?.paginatedUsers)
        ? data.payload.paginatedUsers
        : [];
      const filtered = docs.filter((u) => !excluded.has(String(u._id)));
      if (!filtered.length) {
        setSearchErr("No se encontró un náuta deportivo con ese documento.");
      }
      setCandidates(filtered);
    } catch (ex) {
      setSearchErr(ex?.message || "No se pudo buscar.");
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }

  async function selectUser(user) {
    const role = String(linkRoleLabel || "").trim();
    if (role) {
      const confirmed = await confirmSkipperVesselLink({ user, roleLabel: role });
      if (!confirmed) return;
    }
    onChange?.({
      _id: String(user._id),
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      documentId: user.documentId,
    });
    setDocQuery("");
    setCandidates([]);
    setSearchErr("");
  }

  const embedded = variant === "embedded";
  const inputClass = embedded ? "form-control" : "form-control form-control-sm";
  const btnClass = embedded ? "btn btn-outline-primary" : "btn btn-outline-primary btn-sm";

  if (value?._id) {
    if (embedded) {
      return (
        <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
          <span className="badge text-bg-primary text-wrap text-start">
            {formatSkipperLabel(value)}
            {value.email ? ` · ${value.email}` : ""}
          </span>
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            disabled={disabled}
            onClick={() => onChange?.(null)}
          >
            Quitar vínculo
          </button>
        </div>
      );
    }
    return (
      <div>
        <label className="form-label small" htmlFor={`${idPrefix}-selected`}>
          {label}
        </label>
        <div
          id={`${idPrefix}-selected`}
          className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-2 bg-body-tertiary"
        >
          <div className="small">
            <strong>{formatSkipperLabel(value)}</strong>
            {value.email ? (
              <span className="text-muted"> · {value.email}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={disabled}
            onClick={() => onChange?.(null)}
          >
            Quitar
          </button>
        </div>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="mt-2">
        <div className="form-text small mb-1">{label}</div>
        <div className="input-group">
          <input
            id={`${idPrefix}-doc`}
            className={inputClass}
            placeholder="DNI o pasaporte"
            value={docQuery}
            onChange={(e) => setDocQuery(e.target.value)}
            disabled={disabled || searching}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleSearch(e);
              }
            }}
          />
          <button
            type="button"
            className={btnClass}
            disabled={disabled || searching || !docQuery.trim()}
            onClick={handleSearch}
          >
            {searching ? "…" : "Buscar"}
          </button>
        </div>
        {searchErr ? (
          <div className="form-text text-danger small mb-0">{searchErr}</div>
        ) : null}
        {candidates.length > 0 ? (
          <div className="list-group mt-2">
            {candidates.map((u) => (
              <button
                key={u._id}
                type="button"
                className="list-group-item list-group-item-action py-2 small"
                disabled={disabled}
                onClick={() => selectUser(u)}
              >
                {formatSkipperLabel(u)}
                {u.email ? ` · ${u.email}` : ""}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <label className="form-label small" htmlFor={`${idPrefix}-doc`}>
        {label}
      </label>
      <div className="d-flex flex-wrap gap-2">
        <input
          id={`${idPrefix}-doc`}
          className={inputClass}
          placeholder="DNI o pasaporte"
          value={docQuery}
          onChange={(e) => setDocQuery(e.target.value)}
          disabled={disabled || searching}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleSearch(e);
            }
          }}
        />
        <button
          type="button"
          className={btnClass}
          disabled={disabled || searching || !docQuery.trim()}
          onClick={handleSearch}
        >
          {searching ? "…" : "Buscar"}
        </button>
      </div>
      {searchErr ? (
        <div className="form-text text-danger small mb-0">{searchErr}</div>
      ) : null}
      {candidates.length > 0 ? (
        <div className="list-group mt-2">
          {candidates.map((u) => (
            <button
              key={u._id}
              type="button"
              className="list-group-item list-group-item-action py-2 small"
              disabled={disabled}
              onClick={() => selectUser(u)}
            >
              {formatSkipperLabel(u)}
              {u.email ? ` · ${u.email}` : ""}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
