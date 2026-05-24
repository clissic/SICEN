import { useEffect, useId, useMemo, useRef, useState } from "react";
import { vesselsByType } from "../api/client.js";

/**
 * Normaliza una cadena para búsqueda: minúsculas + sin diacríticos.
 */
function normalizeForSearch(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Combobox para elegir un buque de **Ultramar** ya registrado en el sistema.
 *
 * - Carga los buques al montar (`GET /api/vessels/by-type/Ultramar`).
 * - Muestra cada opción con el formato **«OMI — Nombre del buque»** y un
 *   subtítulo con la bandera/puerto de matrícula para diferenciar homónimos.
 * - Tiene buscador interno que filtra por OMI o nombre (sin diacríticos).
 * - Soporta teclado: ↑/↓ navegan, Enter selecciona, Esc cierra.
 *
 * Props:
 *  - `id` opcional para el input.
 *  - `value`: `_id` del buque seleccionado (string), o `""`.
 *  - `onChange(vesselId, vesselDoc)`: callback con el `_id` y el documento
 *    elegido (o `null` al limpiar).
 *  - `required`: si el formulario lo necesita.
 *  - `placeholder`: texto cuando no hay selección.
 */
export function VesselUltramarCombobox({
  id,
  value,
  onChange,
  required = false,
  placeholder = "Seleccionar buque…",
}) {
  const reactId = useId();
  const inputId = id || `vessel-ultramar-${reactId}`;

  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    vesselsByType("Ultramar")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.vessels) ? data.vessels : [];
        setVessels(list);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(
          e?.message || "No se pudieron cargar los buques de Ultramar."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return vessels;
    return vessels.filter((v) => {
      const haystack = `${v.imoNumber ?? ""} ${v.name ?? ""} ${v.flagState ?? ""} ${v.portOfRegistry ?? ""}`;
      return normalizeForSearch(haystack).includes(q);
    });
  }, [query, vessels]);

  const selected = useMemo(() => {
    if (!value) return null;
    return vessels.find((v) => String(v._id) === String(value)) || null;
  }, [value, vessels]);

  const displayValue = useMemo(() => {
    if (!selected) return "";
    const omi = String(selected.imoNumber ?? "").trim();
    const name = String(selected.name ?? "").trim();
    if (omi && name) return `${omi} — ${name}`;
    return name || omi || "(Sin nombre)";
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActive(0);
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [active, open]);

  function pick(vessel) {
    onChange?.(String(vessel._id), vessel);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((i) => Math.min(Math.max(filtered.length - 1, 0), i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        if (filtered[active]) pick(filtered[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
    }
  }

  return (
    <div className="vessel-combobox" ref={containerRef}>
      <div className="input-group">
        <input
          type="text"
          id={inputId}
          className="form-control vessel-combobox__display"
          readOnly
          required={required}
          value={displayValue}
          placeholder={loading ? "Cargando buques de Ultramar…" : placeholder}
          onClick={() => setOpen((o) => !o)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-listbox`}
          disabled={loading && vessels.length === 0}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar listado de buques" : "Abrir listado de buques"}
          tabIndex={-1}
          disabled={loading && vessels.length === 0}
        >
          <i
            className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}
            aria-hidden
          />
        </button>
      </div>

      {loadError ? (
        <div className="form-text text-danger small mt-1">{loadError}</div>
      ) : null}

      {open ? (
        <div className="card shadow position-absolute w-100 vessel-combobox__menu">
          <div className="vessel-combobox__search-wrap">
            <input
              ref={searchRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Buscar por OMI o nombre…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              aria-label="Buscar buque de Ultramar"
              autoComplete="off"
            />
          </div>
          <ul
            ref={listRef}
            id={`${inputId}-listbox`}
            className="vessel-combobox__list"
            role="listbox"
          >
            {loading ? (
              <li className="vessel-combobox__loading">Cargando buques…</li>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <li className="vessel-combobox__empty">
                {vessels.length === 0
                  ? "No hay buques de Ultramar registrados."
                  : "Sin coincidencias para esa búsqueda."}
              </li>
            ) : null}
            {filtered.map((v, idx) => {
              const isActive = idx === active;
              const isSelected = selected && String(selected._id) === String(v._id);
              const classes = ["vessel-combobox__option"];
              if (isActive) classes.push("is-active");
              if (isSelected) classes.push("is-selected");
              const omi = String(v.imoNumber ?? "").trim() || "—";
              const name = String(v.name ?? "").trim() || "(Sin nombre)";
              const sub = [v.flagState, v.portOfRegistry]
                .map((s) => String(s ?? "").trim())
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={String(v._id)}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected || false}
                    data-idx={idx}
                    className={classes.join(" ")}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(v)}
                  >
                    <span className="vessel-combobox__option-main">
                      {omi} — {name}
                    </span>
                    {sub ? (
                      <span className="vessel-combobox__option-sub">{sub}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
