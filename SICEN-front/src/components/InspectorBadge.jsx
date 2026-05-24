import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** Por encima de modales de inspección (1085) y SweetAlert (~1060). */
const POPOVER_Z_INDEX = 1100;

/**
 * Devuelve "Apellido, Nombre" a partir de un documento de usuario. Acepta
 * que cualquiera de los campos esté ausente.
 */
export function userFullName(u) {
  const fn = String(u?.first_name || "").trim();
  const ln = String(u?.last_name || "").trim();
  if (ln && fn) return `${ln}, ${fn}`;
  return ln || fn || "";
}

/**
 * Devuelve el texto plano canónico para un inspector ("Rango Apellido,
 * Nombre"). Útil cuando se necesita renderizar fuera de React (por
 * ejemplo dentro del HTML de un Swal de confirmación, donde el popover
 * del badge no funciona).
 */
export function inspectorPlainLabel(email, user) {
  const e = String(email || "").trim().toLowerCase();
  const name = userFullName(user);
  const rank = String(user?.rank || "").trim();
  if (rank && name) return `${rank} ${name}`;
  return name || e;
}

function InspectorBadgePopoverContent({ known, rank, fullName, safeEmail, unit }) {
  if (known) {
    return (
      <>
        <span>
          {rank ? (
            <span className="inspector-badge__rank">{rank}</span>
          ) : null}
          <span className="inspector-badge__name">
            {fullName || safeEmail || "(Sin nombre)"}
          </span>
        </span>
        {unit || safeEmail ? (
          <span className="inspector-badge__sub">
            {[unit, safeEmail].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </>
    );
  }
  return (
    <>
      <span className="inspector-badge__name">Inspector no encontrado</span>
      <span className="inspector-badge__sub">
        {safeEmail || "Email no disponible"}
      </span>
    </>
  );
}

/**
 * Ícono `bi-person-badge` con popover (hover/foco) que muestra rango,
 * apellido y nombre del inspector. El popover se renderiza con un portal
 * en `document.body` y `position: fixed` para no quedar recortado por
 * `overflow` de `.table-responsive` ni por el stacking context de la tabla.
 */
export function InspectorBadge({ email, user }) {
  const safeEmail = String(email || "").trim().toLowerCase();
  const fullName = userFullName(user);
  const rank = String(user?.rank || "").trim();
  const unit = String(user?.unit || "").trim();
  const known = Boolean(user && (fullName || rank));

  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState("top");
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tooltipId = useId();

  const ariaLabel = known
    ? `Inspector ${rank ? `${rank} ` : ""}${fullName || safeEmail}`
    : `Inspector ${safeEmail || "desconocido"}`;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const approxHeight = 88;
    const placeAbove = rect.top >= approxHeight + gap;

    setPlacement(placeAbove ? "top" : "bottom");
    setCoords({
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const showPopover = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hidePopover = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updatePosition]);

  const transform =
    placement === "top"
      ? "translate(-50%, -100%)"
      : "translate(-50%, 0)";

  return (
    <>
      <span
        ref={triggerRef}
        className={`inspector-badge${known ? "" : " is-unknown"}`}
        tabIndex={0}
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        role="img"
        onMouseEnter={showPopover}
        onMouseLeave={hidePopover}
        onFocus={showPopover}
        onBlur={hidePopover}
      >
        <i className="bi bi-person-badge inspector-badge__icon" aria-hidden />
      </span>

      {open &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={`inspector-badge__popover inspector-badge__popover--portal inspector-badge__popover--${placement}`}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform,
              zIndex: POPOVER_Z_INDEX,
            }}
          >
            <InspectorBadgePopoverContent
              known={known}
              rank={rank}
              fullName={fullName}
              safeEmail={safeEmail}
              unit={unit}
            />
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Render de una celda con uno o varios `InspectorBadge` en línea. Si la
 * inspección no tiene inspectors poblado muestra un guion neutro.
 */
export function InspectorsCell({ inspectors, usersByEmail }) {
  const emails = Array.isArray(inspectors) ? inspectors : [];
  if (emails.length === 0) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className="inspector-badges-row">
      {emails.map((raw) => {
        const e = String(raw || "").trim().toLowerCase();
        if (!e) return null;
        const u = usersByEmail?.get(e) || null;
        return <InspectorBadge key={e} email={e} user={u} />;
      })}
    </span>
  );
}
