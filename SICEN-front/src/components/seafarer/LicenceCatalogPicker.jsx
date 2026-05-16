import { useEffect, useRef, useState } from "react";
import { licencesCatalogList } from "../../api/client.js";

/** Identificador estable del documento del catálogo `licences`. */
export function licenceCatalogEntryId(doc) {
  if (doc == null || typeof doc !== "object") return "";
  const raw = doc._id ?? doc.id;
  if (raw == null || raw === "") return "";
  if (typeof raw === "object" && raw !== null && "$oid" in raw) {
    const oid = raw.$oid;
    return oid != null ? String(oid).trim() : "";
  }
  return String(raw).trim();
}

/** @param {object} doc */
export function formatLicenceCatalogLabel(doc) {
  const code = String(doc?.code ?? "").trim();
  const es = String(doc?.name?.es ?? "").trim();
  const en = String(doc?.name?.en ?? "").trim();
  const name = es || en;
  if (code && name) return `${code} — ${name}`;
  return name || code || "—";
}

/**
 * Buscador + lista de licencias del catálogo `licences` (kind=license).
 * @param {object} props
 * @param {boolean} [props.disabled]
 * @param {string} props.inputId
 * @param {{ _id: string, label: string }|null} props.selected
 * @param {(doc: object) => void} props.onSelect
 * @param {() => void} props.onClear
 */
export function LicenceCatalogPicker({
  disabled = false,
  inputId,
  selected,
  onSelect,
  onClear,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await licencesCatalogList({
          page: 1,
          pageSize: 100,
          q: String(query).trim(),
          kind: "license",
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setOptions(
          items.filter(
            (x) =>
              x &&
              x.active !== false &&
              String(x.kind ?? "license").toLowerCase() !== "title",
          ),
        );
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div ref={wrapRef} className="position-relative">
      {selected ? (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span className="small text-body-secondary">
            <strong>Seleccionado:</strong> {selected.label}
          </span>
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            disabled={disabled}
            onClick={() => {
              onClear();
              setQuery("");
              setOpen(false);
            }}
          >
            Quitar
          </button>
        </div>
      ) : null}
      <input
        id={inputId}
        type="search"
        className="form-control form-control-sm"
        autoComplete="off"
        placeholder="Buscar por código o nombre…"
        disabled={disabled}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open ? (
        <ul
          className="list-group position-absolute w-100 shadow-sm mt-1"
          style={{ zIndex: 20, maxHeight: "14rem", overflowY: "auto" }}
          role="listbox"
        >
          {loading ? (
            <li className="list-group-item small text-muted py-2">Buscando…</li>
          ) : options.length === 0 ? (
            <li className="list-group-item small text-muted py-2">
              No hay resultados.
            </li>
          ) : (
            options.map((doc) => {
              const id = licenceCatalogEntryId(doc);
              const label = formatLicenceCatalogLabel(doc);
              return (
                <li key={id || label} className="list-group-item p-0">
                  <button
                    type="button"
                    className="btn btn-link text-start text-decoration-none w-100 py-2 px-3 small rounded-0"
                    onClick={() => {
                      onSelect(doc);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
