import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const DOCK_ANIM_MS = 340;

function clampPosition(x, y, width, height) {
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - Math.min(height, 80) - 8);
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

function readDockPoint(dockId) {
  if (!dockId || typeof document === "undefined") return null;
  const sel = `[data-centinela-dock-id="${CSS.escape(dockId)}"]`;
  const btn = document.querySelector(sel);
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    size: Math.min(r.width, r.height),
  };
}

function dockScaleFrom(el, pos, dock) {
  const w = Math.max(el.offsetWidth || 420, 80);
  const h = Math.max(el.offsetHeight || 160, 40);
  const originX = dock.cx - pos.x;
  const originY = dock.cy - pos.y;
  const scale = Math.min(0.14, Math.max(0.05, dock.size / w));
  return { originX, originY, scale, w, h };
}

/**
 * Cáscara flotante arrastrable para interfaces de herramientas (desktop).
 * Abre/cierra con animación desde el ícono del dock (`dockId`).
 * Al minimizar conserva la posición; al cerrar del todo vuelve a initialPosition.
 */
export function CentinelaFloatingToolWindow({
  open = false,
  minimized = false,
  focused = false,
  title = "",
  onFocus,
  dockId = "",
  initialPosition = { x: 72, y: 96 },
  children,
  className = "",
}) {
  const wantVisible = open && !minimized;
  const [pos, setPos] = useState(() =>
    clampPosition(initialPosition.x, initialPosition.y, 420, 200)
  );
  /** Sigue pintando durante la animación de salida / mientras open (minimizada). */
  const [paint, setPaint] = useState(wantVisible);
  const [dockAnimating, setDockAnimating] = useState(false);
  const dragRef = useRef(null);
  const winRef = useRef(null);
  const placedRef = useRef(false);
  const animTokenRef = useRef(0);
  /** false inicial: la primera vez que wantVisible=true siempre anima (montaje). */
  const prevWantRef = useRef(false);

  useEffect(() => {
    if (!open) {
      placedRef.current = false;
      return;
    }
    if (placedRef.current) return;
    placedRef.current = true;
    setPos(
      clampPosition(initialPosition.x, initialPosition.y, 420, 200)
    );
  }, [open, initialPosition.x, initialPosition.y]);

  useLayoutEffect(() => {
    const wasVisible = prevWantRef.current;
    prevWantRef.current = wantVisible;

    if (wantVisible === wasVisible) return;

    const token = ++animTokenRef.current;
    const reduce = prefersReducedMotion();

    if (wantVisible) {
      setPaint(true);
      if (reduce || !dockId) {
        setDockAnimating(false);
        return;
      }

      setDockAnimating(true);
      const runEnter = () => {
        if (animTokenRef.current !== token) return;
        const el = winRef.current;
        const dock = readDockPoint(dockId);
        if (!el || !dock) {
          setDockAnimating(false);
          return;
        }
        const { originX, originY, scale } = dockScaleFrom(el, pos, dock);
        el.style.transformOrigin = `${originX}px ${originY}px`;
        el.style.transform = `scale(${scale})`;
        el.style.opacity = "0";
        void el.offsetWidth;
        requestAnimationFrame(() => {
          if (animTokenRef.current !== token) return;
          el.style.transform = "scale(1)";
          el.style.opacity = "";
          window.setTimeout(() => {
            if (animTokenRef.current !== token) return;
            el.style.transform = "";
            el.style.transformOrigin = "";
            setDockAnimating(false);
          }, DOCK_ANIM_MS);
        });
      };
      requestAnimationFrame(() => requestAnimationFrame(runEnter));
      return;
    }

    /* Salida (minimizar o cerrar) */
    if (reduce || !dockId) {
      setDockAnimating(false);
      setPaint(false);
      return;
    }

    const el = winRef.current;
    const dock = readDockPoint(dockId);
    if (!el || !dock) {
      setDockAnimating(false);
      setPaint(false);
      return;
    }

    setDockAnimating(true);
    setPaint(true);
    const { originX, originY, scale } = dockScaleFrom(el, pos, dock);
    el.style.transformOrigin = `${originX}px ${originY}px`;
    el.style.transform = "scale(1)";
    el.style.opacity = el.style.opacity || "";
    void el.offsetWidth;
    requestAnimationFrame(() => {
      if (animTokenRef.current !== token) return;
      el.style.transform = `scale(${scale})`;
      el.style.opacity = "0";
      window.setTimeout(() => {
        if (animTokenRef.current !== token) return;
        el.style.transform = "";
        el.style.transformOrigin = "";
        el.style.opacity = "";
        setDockAnimating(false);
        setPaint(false);
      }, DOCK_ANIM_MS);
    });
  }, [wantVisible, dockId, pos]);

  /* Si cerró del todo y ya no pinta, limpiar. */
  const keepMounted = open || paint;

  const onPointerDown = useCallback(
    (e) => {
      onFocus?.();
      if (e.button != null && e.button !== 0) return;
      if (
        e.target?.closest?.(
          "button, a, input, select, textarea, label, [data-no-drag]"
        )
      ) {
        return;
      }
      const head = e.target?.closest?.("[data-tool-head]");
      if (!head) return;
      const el = winRef.current;
      if (!el) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        pointerId: e.pointerId,
      };
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [onFocus]
  );

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setPos(
      clampPosition(
        e.clientX - drag.offsetX,
        e.clientY - drag.offsetY,
        drag.width,
        drag.height
      )
    );
  }, []);

  const onPointerUp = useCallback((e) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  if (!keepMounted) return null;

  const interactive = paint && !dockAnimating;

  return (
    <div
      ref={winRef}
      className={[
        "centinela-floating-tool",
        dockAnimating ? "is-dock-animating" : "",
        !paint ? "is-minimized-slot" : "",
        paint && focused ? "is-focused" : "",
        paint && !focused && !dockAnimating ? "is-dimmed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: pos.x,
        top: pos.y,
        display: paint || dockAnimating ? undefined : "none",
        visibility: paint || dockAnimating ? undefined : "hidden",
      }}
      role="dialog"
      aria-modal="false"
      aria-label={title || "Herramienta"}
      aria-hidden={!paint}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    >
      {children}
    </div>
  );
}
