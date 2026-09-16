/**
 * Encabezado de paneles de herramientas (título + minimizar + cerrar).
 * Con `minimized`, el panel padre debe usar `.is-minimized` para ocultar el cuerpo.
 */
export function CentinelaToolPanelHead({
  title,
  minimized = false,
  onToggleMinimized,
  onClose,
  closeLabel = "Cerrar",
  children,
  className = "",
}) {
  return (
    <div
      className={["centinela-tool-panel__head", className].filter(Boolean).join(" ")}
      data-tool-head="1"
    >
      <strong className="centinela-tool-panel__title">{title}</strong>
      <div className="centinela-tool-panel__head-actions">
        {children}
        {onToggleMinimized ? (
          <button
            type="button"
            className="centinela-goto-panel__close"
            aria-label={minimized ? "Expandir panel" : "Minimizar panel"}
            aria-expanded={!minimized}
            data-sicen-popover={minimized ? "Expandir" : "Minimizar"}
            data-sicen-popover-placement="top"
            onClick={onToggleMinimized}
          >
            <i
              className={minimized ? "bi bi-chevron-up" : "bi bi-chevron-down"}
              aria-hidden
            />
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            className="centinela-goto-panel__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
