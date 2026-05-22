import { useCallback, useEffect } from "react";

/**
 * Lightbox de pruebas para una multa. Compartido por las páginas de consulta y
 * eliminación. Maneja el cierre con Escape, navegación con flechas y bloqueo
 * de scroll de fondo. La página dueña controla el estado `viewer`.
 *
 * Forma esperada de `viewer`:
 *   {
 *     items: string[],     // URLs de imágenes
 *     index: number,       // índice activo dentro de `items`
 *     fineNumber?: number | string | null,
 *     plate?: string | null,
 *   }
 */
export function CarFineProveViewer({ viewer, onClose, onStep }) {
  const close = useCallback(() => {
    if (typeof onClose === "function") onClose();
  }, [onClose]);

  const step = useCallback(
    (delta) => {
      if (typeof onStep === "function") onStep(delta);
    },
    [onStep]
  );

  useEffect(() => {
    if (!viewer) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [viewer, close, step]);

  if (!viewer) return null;
  const total = viewer.items?.length || 0;
  const current = viewer.items?.[viewer.index];
  if (!current) return null;

  return (
    <div
      className="car-fine-prove-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de pruebas"
      onClick={close}
    >
      <div
        className="car-fine-prove-modal__stage"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="car-fine-prove-modal__close"
          aria-label="Cerrar visor"
          onClick={close}
        >
          <i className="bi bi-x-lg" aria-hidden />
        </button>

        {total > 1 ? (
          <button
            type="button"
            className="car-fine-prove-modal__nav car-fine-prove-modal__nav--prev"
            aria-label="Prueba anterior"
            onClick={() => step(-1)}
          >
            <i className="bi bi-chevron-left" aria-hidden />
          </button>
        ) : null}

        <img
          src={current}
          alt={`Prueba ${viewer.index + 1}`}
          className="car-fine-prove-modal__image"
        />

        {total > 1 ? (
          <button
            type="button"
            className="car-fine-prove-modal__nav car-fine-prove-modal__nav--next"
            aria-label="Prueba siguiente"
            onClick={() => step(1)}
          >
            <i className="bi bi-chevron-right" aria-hidden />
          </button>
        ) : null}

        <div className="car-fine-prove-modal__caption">
          {viewer.fineNumber != null ? `Multa N° ${viewer.fineNumber}` : "Multa"}
          {viewer.plate ? ` · ${viewer.plate}` : ""} · Prueba{" "}
          {viewer.index + 1} / {total}
        </div>
      </div>
    </div>
  );
}
