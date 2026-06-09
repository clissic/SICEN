import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CAR_BRANDS,
  OTHER_CAR_BRAND,
  normalizeForSearch,
} from "../constants/carBrands.js";

/**
 * Combobox de marca de vehículo con buscador interno.
 * - Selección desde catálogo (`CAR_BRANDS`) más una opción final `Otra`.
 * - Buscador con coincidencia parcial e insensible a diacríticos.
 * - Soporta teclado: ↑ ↓ Enter (selecciona resaltada) Esc (cierra).
 *
 * Props: `id`, `value`, `onChange(value)`, `required`, `placeholder`.
 */
export function CarBrandCombobox({
  id,
  value,
  onChange,
  required = false,
  placeholder = "Seleccionar marca…",
}) {
  const reactId = useId();
  const inputId = id || `car-brand-${reactId}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    const matches = q
      ? CAR_BRANDS.filter((b) => normalizeForSearch(b).includes(q))
      : CAR_BRANDS.slice();
    return [...matches, OTHER_CAR_BRAND];
  }, [query]);

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

  function pick(brand) {
    onChange(brand);
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
      setActive((i) => Math.min(filtered.length - 1, i + 1));
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
    <div className="car-brand-combobox" ref={containerRef}>
      <div className="input-group">
        <input
          type="text"
          id={inputId}
          className="form-control car-brand-combobox__display"
          readOnly
          required={required}
          value={value || ""}
          placeholder={placeholder}
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-listbox`}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar listado de marcas" : "Abrir listado de marcas"}
          tabIndex={-1}
        >
          <i
            className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div className="card shadow position-absolute w-100 car-brand-combobox__menu">
          <div className="car-brand-combobox__search-wrap">
            <input
              ref={searchRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Buscar marca…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              aria-label="Buscar marca"
              autoComplete="off"
            />
          </div>
          <ul
            ref={listRef}
            id={`${inputId}-listbox`}
            className="car-brand-combobox__list"
            role="listbox"
          >
            {filtered.length === 1 && filtered[0] === OTHER_CAR_BRAND ? (
              <li className="car-brand-combobox__empty">
                Sin coincidencias en el catálogo.
              </li>
            ) : null}
            {filtered.map((b, idx) => {
              const isOther = b === OTHER_CAR_BRAND;
              const isActive = idx === active;
              const isSelected = value === b;
              const classes = ["car-brand-combobox__option"];
              if (isActive) classes.push("is-active");
              if (isSelected) classes.push("is-selected");
              if (isOther) classes.push("car-brand-combobox__option--other");
              return (
                <li key={b}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-idx={idx}
                    className={classes.join(" ")}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(b)}
                  >
                    {b}
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
