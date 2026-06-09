import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usersGetAll } from "../api/client.js";

const OSERP_STATE_NAME = "Oficial Supervisor por el Estado Rector de Puertos";

function normalizeForSearch(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Etiqueta humana para un usuario en formato canónico
 * "Rango Apellido, Nombre" (ej.: "TN Pérez, Juan"). Si falta el rango o el
 * apellido caemos al campo disponible.
 */
function userLabel(u) {
  if (!u || typeof u !== "object") return "";
  const fn = String(u.first_name || "").trim();
  const ln = String(u.last_name || "").trim();
  const rank = String(u.rank || "").trim();
  const full = `${ln}${fn ? `, ${fn}` : ""}`.trim();
  if (rank && full) return `${rank} ${full}`;
  return full || String(u.email || "").trim();
}

/** True si el usuario ya tiene el estado OSERP activo. */
function hasOserpActive(u) {
  if (!u || !Array.isArray(u.states)) return false;
  return u.states.some(
    (s) =>
      s && String(s.name).trim() === OSERP_STATE_NAME && s.isActive === true
  );
}

/**
 * Combobox para elegir un usuario **candidato a alta como OSERP**: muestra
 * únicamente a quienes **todavía no tienen** la habilitación "Oficial
 * Supervisor por el Estado Rector de Puertos" activa. Es el espejo de
 * `InspectorCombobox` (que lista a los OSERP activos).
 *
 * - Trae todos los usuarios con `usersGetAll()` y descarta a los que ya son
 *   OSERP activos.
 * - Muestra "Rango Apellido, Nombre" con la unidad y el email como subtítulo.
 * - Tiene buscador interno por nombre, apellido, rango, unidad o email.
 * - Soporta teclado: ↑/↓ navegan, Enter selecciona, Esc cierra.
 *
 * Props:
 *  - `id` opcional para el input.
 *  - `value`: email del usuario seleccionado, o `""`.
 *  - `onChange(email, userDoc)`: callback con el email y el documento del
 *    usuario elegido (o `""`/`null` al limpiar).
 *  - `required`: si el formulario lo necesita.
 *  - `placeholder`: texto cuando no hay selección.
 */
export function OserpCandidateCombobox({
  id,
  value,
  onChange,
  required = false,
  placeholder = "Seleccionar usuario…",
}) {
  const reactId = useId();
  const inputId = id || `oserp-candidate-${reactId}`;

  const [users, setUsers] = useState([]);
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
    usersGetAll()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.payload) ? data.payload : [];
        /* Sólo usuarios que NO son OSERP activos: son los candidatos válidos
           para darles el alta. */
        const candidates = list.filter(
          (u) => u && typeof u === "object" && u.email && !hasOserpActive(u)
        );
        candidates.sort((a, b) => {
          const la = `${a.last_name || ""} ${a.first_name || ""}`.toLowerCase();
          const lb = `${b.last_name || ""} ${b.first_name || ""}`.toLowerCase();
          return la.localeCompare(lb, "es");
        });
        setUsers(candidates);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e?.message || "No se pudieron cargar los usuarios.");
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
    if (!q) return users;
    return users.filter((u) => {
      const haystack = `${u.rank ?? ""} ${u.first_name ?? ""} ${u.last_name ?? ""} ${u.unit ?? ""} ${u.email ?? ""}`;
      return normalizeForSearch(haystack).includes(q);
    });
  }, [query, users]);

  const selected = useMemo(() => {
    if (!value) return null;
    const v = String(value).toLowerCase();
    return users.find((u) => String(u.email || "").toLowerCase() === v) || null;
  }, [value, users]);

  const displayValue = useMemo(() => {
    if (!selected) return "";
    return userLabel(selected);
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

  function pick(u) {
    onChange?.(String(u.email || "").toLowerCase(), u);
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

  const isUnusable = loading && users.length === 0;

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
          placeholder={loading ? "Cargando usuarios…" : placeholder}
          onClick={() => {
            if (!isUnusable) setOpen(true);
          }}
          onFocus={() => {
            if (!isUnusable) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-listbox`}
          disabled={isUnusable}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => {
            if (!isUnusable) setOpen((o) => !o);
          }}
          aria-label={open ? "Cerrar listado de usuarios" : "Abrir listado de usuarios"}
          tabIndex={-1}
          disabled={isUnusable}
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
              placeholder="Buscar por nombre, apellido, rango o unidad…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              aria-label="Buscar usuario"
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
              <li className="vessel-combobox__loading">Cargando usuarios…</li>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <li className="vessel-combobox__empty">
                {users.length === 0
                  ? "No hay usuarios disponibles para dar de alta."
                  : "Sin coincidencias para esa búsqueda."}
              </li>
            ) : null}
            {filtered.map((u, idx) => {
              const isActive = idx === active;
              const isSelected =
                selected &&
                String(selected.email || "").toLowerCase() ===
                  String(u.email || "").toLowerCase();
              const classes = ["vessel-combobox__option"];
              if (isActive) classes.push("is-active");
              if (isSelected) classes.push("is-selected");
              const label = userLabel(u) || "(Sin nombre)";
              const sub = [u.unit, u.email]
                .map((s) => String(s ?? "").trim())
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={String(u._id || u.email)}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected || false}
                    data-idx={idx}
                    className={classes.join(" ")}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(u)}
                  >
                    <span className="vessel-combobox__option-main">{label}</span>
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
