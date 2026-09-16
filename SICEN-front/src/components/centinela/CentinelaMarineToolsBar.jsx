/**
 * Medio marino + Herramientas: en desktop como dock inferior (estilo macOS);
 * en mobile permanece al pie del panel Capas.
 *
 * Items de herramientas (dock):
 * - `open`: herramienta encendida → punto debajo
 * - `active`: ventana visible (no minimizada) → resalte
 * - `focused`: ventana con focus → resalte pleno; sin focus → resalte más transparente
 *
 * @param {"dock" | "panel"} layout
 * @param {{ id: string, icon: string, label: string, active?: boolean, open?: boolean, focused?: boolean, popover: string, onClick: () => void }[]} marineItems
 * @param {{ id: string, icon: string, label: string, active?: boolean, open?: boolean, focused?: boolean, popover: string, onClick: () => void }[]} toolItems
 */
export function CentinelaMarineToolsBar({
  layout = "panel",
  marineItems = [],
  toolItems = [],
}) {
  function renderItem(item) {
    const isDock = layout === "dock";
    const btnClass = isDock
      ? "centinela-dock__btn"
      : "centinela-glass__action-btn";
    const open = item.open ?? item.active;
    const active = Boolean(item.active);
    const focused = Boolean(item.focused);
    return (
      <span
        key={item.id}
        className={
          isDock ? "centinela-dock__item" : "centinela-glass__action-wrap"
        }
        data-sicen-popover={item.popover}
        data-sicen-popover-placement="top"
      >
        <button
          type="button"
          className={[
            btnClass,
            active ? "is-active" : "",
            focused ? "is-focused" : "",
            open ? "is-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-centinela-dock-id={isDock ? item.id : undefined}
          aria-pressed={active || open}
          aria-label={item.label}
          onClick={item.onClick}
        >
          <i className={`bi ${item.icon}`} aria-hidden />
          {isDock ? (
            <span
              className={[
                "centinela-dock__dot",
                open ? "is-on" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden
            />
          ) : null}
        </button>
      </span>
    );
  }

  if (layout === "dock") {
    return (
      <nav className="centinela-dock" aria-label="Medio marino y herramientas">
        <div className="centinela-dock__inner">
          <div className="centinela-dock__group" role="group" aria-label="Medio marino">
            {marineItems.map(renderItem)}
          </div>
          <div className="centinela-dock__separator" role="separator" aria-hidden />
          <div className="centinela-dock__group" role="group" aria-label="Herramientas">
            {toolItems.map(renderItem)}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <div className="centinela-glass__footer-actions">
      <div className="centinela-page__layers-title">Medio marino</div>
      <div className="centinela-glass__marine-row">
        {marineItems.map(renderItem)}
      </div>
      <div className="centinela-page__layers-title">Herramientas</div>
      <div className="centinela-glass__sim-row">{toolItems.map(renderItem)}</div>
    </div>
  );
}
