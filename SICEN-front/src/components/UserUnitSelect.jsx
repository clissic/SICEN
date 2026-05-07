import { USER_UNITS } from "../constants/userUnits.js";

export function UserUnitSelect({
  id = "user-unit",
  value,
  onChange,
  required = false,
  className = "form-select",
}) {
  return (
    <select
      id={id}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      aria-label="Unidad"
    >
      <option value="">Seleccionar unidad…</option>
      {USER_UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}
