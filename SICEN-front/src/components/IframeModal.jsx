import { useEffect, useState } from "react";
import "../styles/iframe-modal.css";

/**
 * Modal a pantalla casi completa que embebe un sitio externo dentro de un
 * iframe sin sacar al usuario del SPA. Comparte la misma estética del modal
 * de "Desarrollado por JPC" en el footer.
 *
 * Props:
 * - `open` (bool, requerido): controla la visibilidad.
 * - `onClose` (fn, requerido): se invoca al cerrar (Esc, backdrop, botón).
 * - `url` (string, requerido): URL embebida en el iframe.
 * - `titleText` (string, requerido): título visible en el header del modal.
 * - `logoSrc` (string, opcional): logo del sitio para acompañar al título.
 * - `logoInvertDark` (bool, default `true`): si `true`, el logo se invierte
 *   en modo oscuro (clase `iframe-modal__logo--invert`).
 * - `ariaLabel` (string, opcional): override del `aria-label` del diálogo.
 */
export function IframeModal({
  open,
  onClose,
  url,
  titleText,
  logoSrc,
  logoInvertDark = true,
  ariaLabel,
}) {
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (open) setIframeLoading(true);
  }, [open, url]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const logoClass = logoInvertDark
    ? "iframe-modal__logo iframe-modal__logo--invert me-2"
    : "iframe-modal__logo me-2";

  return (
    <>
      <div
        className="modal fade show d-block iframe-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || titleText}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content position-relative">
            <button
              type="button"
              className="btn-close iframe-modal__close"
              aria-label="Cerrar"
              onClick={onClose}
            />
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center">
                {logoSrc ? (
                  <img
                    className={logoClass}
                    src={logoSrc}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    style={{ height: "1.25em" }}
                  />
                ) : null}
                <span>{titleText}</span>
              </h5>
              <div className="d-flex align-items-center gap-2 ms-3 me-4">
                <a
                  className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir en una pestaña nueva"
                >
                  <i className="bi bi-box-arrow-up-right" aria-hidden />
                  <span className="d-none d-sm-inline">Abrir en pestaña</span>
                </a>
              </div>
            </div>
            <div className="modal-body">
              {iframeLoading ? (
                <div className="iframe-modal__loading" aria-hidden>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                  />
                  <span>Cargando…</span>
                </div>
              ) : null}
              <iframe
                className="iframe-modal__frame"
                src={url}
                title={titleText}
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => setIframeLoading(false)}
              />
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        aria-hidden="true"
        role="presentation"
      />
    </>
  );
}
