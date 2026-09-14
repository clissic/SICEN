import {
  INTEL_GROUPS,
  INTEL_ITEM_IDS,
  intelGroupVisibleItems,
} from "../../constants/centinelaIntelLayers.js";

/**
 * Desplegable de inteligencia marítima organizado por FUNCIÓN.
 */
export function CentinelaIntelLayersPanel({
  intelVisibility,
  intelMenuOpen,
  onToggleMenu,
  groupOpen,
  onToggleGroup,
  onToggleAll,
  onToggleGroupItems,
  onToggleItem,
  aisStatusLine = "",
  gfwStatusLine = "",
}) {
  const toggleCount = INTEL_ITEM_IDS.filter((id) => intelVisibility[id]).length;
  const allOn =
    INTEL_ITEM_IDS.length > 0 &&
    INTEL_ITEM_IDS.every((id) => intelVisibility[id]);
  const someOn = INTEL_ITEM_IDS.some((id) => intelVisibility[id]);

  return (
    <div className="centinela-zones centinela-intel-layers">
      <div className="centinela-zones__header">
        <label className="centinela-zones__master">
          <input
            type="checkbox"
            className="form-check-input"
            checked={allOn}
            ref={(el) => {
              if (el) el.indeterminate = someOn && !allOn;
            }}
            onChange={(e) => onToggleAll(e.target.checked)}
            aria-label="Mostrar u ocultar toda la inteligencia marítima"
          />
        </label>
        <button
          type="button"
          className="centinela-zones__toggle"
          aria-expanded={intelMenuOpen}
          aria-controls="centinela-intel-list"
          onClick={onToggleMenu}
        >
          <i
            className={`bi ${
              intelMenuOpen ? "bi-chevron-down" : "bi-chevron-right"
            }`}
            aria-hidden
          />
          <span>Inteligencia marítima</span>
          <span className="centinela-zones__count">
            {toggleCount}/{INTEL_ITEM_IDS.length}
          </span>
        </button>
      </div>

      {intelMenuOpen ? (
        <div
          id="centinela-intel-list"
          className="centinela-zones__list"
          role="group"
          aria-label="Capas de inteligencia marítima por función"
        >
          {INTEL_GROUPS.map((group) => {
            const items = intelGroupVisibleItems(group);
            const ids = items.map((i) => i.id);
            const gAll =
              ids.length > 0 && ids.every((id) => intelVisibility[id]);
            const gSome = ids.some((id) => intelVisibility[id]);
            const gOpen = Boolean(groupOpen[group.id]);
            const gCount = ids.filter((id) => intelVisibility[id]).length;
            const statusHint =
              group.id === "ais"
                ? aisStatusLine
                : group.id === "fishing" ||
                    group.id === "sts" ||
                    group.id === "dark"
                  ? gfwStatusLine
                  : "";

            return (
              <div key={group.id} className="centinela-skylight-subgroup">
                <div className="centinela-zones__header centinela-skylight-subgroup__header">
                  <label className="centinela-zones__master">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={gAll}
                      ref={(el) => {
                        if (el) el.indeterminate = gSome && !gAll;
                      }}
                      onChange={(e) =>
                        onToggleGroupItems(group.id, e.target.checked)
                      }
                      aria-label={`Mostrar u ocultar ${group.name}`}
                    />
                  </label>
                  <button
                    type="button"
                    className="centinela-zones__toggle"
                    aria-expanded={gOpen}
                    onClick={() => onToggleGroup(group.id)}
                  >
                    <i
                      className={`bi ${
                        gOpen ? "bi-chevron-down" : "bi-chevron-right"
                      }`}
                      aria-hidden
                    />
                    <span>{group.name}</span>
                    {group.infoText ? (
                      <span
                        className="centinela-brevet-info-icon"
                        data-sicen-popover={group.infoText}
                        data-sicen-popover-placement="top"
                        data-sicen-popover-touch="click"
                        role="img"
                        aria-label={`Información de ${group.name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <i className="bi bi-info-circle" aria-hidden />
                      </span>
                    ) : null}
                    <span className="centinela-zones__count">
                      {gCount}/{ids.length}
                    </span>
                  </button>
                </div>
                {gOpen ? (
                  <div
                    className="centinela-zones__list"
                    role="group"
                    aria-label={group.name}
                  >
                    {items.map((layer) => (
                      <label
                        key={layer.id}
                        className="centinela-page__layer-item centinela-skylight-layer-item"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={Boolean(intelVisibility[layer.id])}
                          onChange={() => onToggleItem(layer.id)}
                        />
                        <span
                          className="centinela-skylight-swatch"
                          style={{ background: layer.color }}
                          aria-hidden
                        />
                        <span>{layer.name}</span>
                        {layer.infoText ? (
                          <span
                            className="centinela-brevet-info-icon"
                            data-sicen-popover={layer.infoText}
                            data-sicen-popover-placement="top"
                            data-sicen-popover-touch="click"
                            role="img"
                            aria-label={`Información de ${layer.name}`}
                            onClick={(e) => e.preventDefault()}
                          >
                            <i className="bi bi-info-circle" aria-hidden />
                          </span>
                        ) : null}
                      </label>
                    ))}
                    {group.id === "ais" && aisStatusLine ? (
                      <p className="centinela-ais-layer__hint mb-0">
                        {aisStatusLine}
                      </p>
                    ) : null}
                    {statusHint && group.id !== "ais" ? (
                      <p className="centinela-ais-layer__hint mb-0">
                        {statusHint}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
