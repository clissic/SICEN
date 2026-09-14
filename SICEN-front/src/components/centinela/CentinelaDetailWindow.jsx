import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_POS = { x: 24, y: 88 };
const WINDOW_WIDTH = 320;

function clampPosition(x, y, width, height) {
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - Math.min(height, 120) - 8);
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

/**
 * Ventana fija en pantalla (no anclada al mapa), arrastrable por el encabezado.
 * Reemplaza popups Leaflet para poder panear el mapa sin perder el detalle.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   onClose: () => void,
 *   children: import('react').ReactNode,
 *   initialPosition?: { x: number, y: number },
 * }} props
 */
export function CentinelaDetailWindow({
  open,
  title,
  onClose,
  children,
  initialPosition = DEFAULT_POS,
}) {
  const [pos, setPos] = useState(() =>
    clampPosition(initialPosition.x, initialPosition.y, WINDOW_WIDTH, 200)
  );
  const dragRef = useRef(null);
  const winRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setPos(
      clampPosition(initialPosition.x, initialPosition.y, WINDOW_WIDTH, 200)
    );
  }, [open, initialPosition.x, initialPosition.y]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onPointerDownHeader = useCallback((e) => {
    if (e.button != null && e.button !== 0) return;
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
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMoveHeader = useCallback((e) => {
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

  const onPointerUpHeader = useCallback((e) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  if (!open) return null;

  return (
    <aside
      ref={winRef}
      className="centinela-glass centinela-detail-window"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-modal="false"
      aria-label={title || "Detalle del mapa"}
    >
      <div
        className="centinela-detail-window__header"
        onPointerDown={onPointerDownHeader}
        onPointerMove={onPointerMoveHeader}
        onPointerUp={onPointerUpHeader}
        onPointerCancel={onPointerUpHeader}
      >
        <h2 className="centinela-detail-window__title">
          {title || "Detalle"}
        </h2>
        <button
          type="button"
          className="centinela-detail-window__close"
          onClick={onClose}
          aria-label="Cerrar detalle"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <i className="bi bi-x-lg" aria-hidden />
        </button>
      </div>
      <div className="centinela-glass__body centinela-detail-window__body">
        {children}
      </div>
    </aside>
  );
}
