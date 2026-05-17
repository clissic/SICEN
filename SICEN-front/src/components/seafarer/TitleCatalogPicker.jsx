import { useEffect, useRef, useState } from "react";
import { titlesCatalogList } from "../../api/client.js";
import { formatTitleCatalogLabel } from "../../constants/titleCatalogForm.js";

/** Identificador estable del documento del catálogo `titles` (respuesta API). */
export function titleCatalogEntryId(doc) {
  if (doc == null || typeof doc !== "object") return "";
  const raw = doc._id ?? doc.id;
  if (raw == null || raw === "") return "";
  if (typeof raw === "object" && raw !== null && "$oid" in raw) {
    const oid = raw.$oid;
    return oid != null ? String(oid).trim() : "";
  }
  return String(raw).trim();
}

export { formatTitleCatalogLabel } from "../../constants/titleCatalogForm.js";

/**
 * Buscador + lista de títulos del catálogo `titles`.
 * @param {object} props
 * @param {boolean} [props.disabled]
 * @param {string} props.inputId
 * @param {{ _id: string, label: string }|null} props.selected
 * @param {(doc: object) => void} props.onSelect — documento lean del listado API
 * @param {() => void} props.onClear
 */
export function TitleCatalogPicker({
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
        const data = await titlesCatalogList({
          page: 1,
          pageSize: 100,
          q: String(query).trim(),
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setOptions(items.filter((x) => x && x.active !== false));
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
        placeholder="Buscar por código, nombre o aplicación…"
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
              const id = titleCatalogEntryId(doc);
              const label = formatTitleCatalogLabel(doc);
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
