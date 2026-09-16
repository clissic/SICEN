/**
 * Opciones de etiquetas embebidas en el menú de Capas (debajo de Zonas).
 * Siempre listan AIS / Marcadores / Zonas / Distancias; se pueden activar
 * de antemano y aplican cuando la capa o herramienta correspondiente esté on.
 */
export function CentinelaLabelsOptions({ options = [] }) {
  if (options.length === 0) return null;

  return (
    <ul className="centinela-labels-panel__list list-unstyled mb-0">
      {options.map((opt) => (
        <li key={opt.id}>
          <label className="centinela-labels-panel__item">
            <input
              type="checkbox"
              className="form-check-input"
              checked={Boolean(opt.checked)}
              onChange={(e) => opt.onChange?.(e.target.checked)}
            />
            <span>{opt.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
