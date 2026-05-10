import { useEffect, useMemo, useState } from "react";
import { listUnitsRegistered } from "../api/client.js";

export function UserUnitSelect({
  id = "user-unit",
  value,
  onChange,
  required = false,
  className = "form-select",
  emptyOptionLabel = "Seleccionar unidad…",
}) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listUnitsRegistered();
        if (!cancelled) setUnits(data.units ?? []);
      } catch {
        if (!cancelled) setUnits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const sorted = [...units].sort((a, b) =>
      a.acronym.localeCompare(b.acronym, "es", { sensitivity: "base" })
    );
    const valUp = value?.trim() ? value.trim().toUpperCase() : "";
    const hasInDb = sorted.some((u) => u.acronym === valUp);
    if (valUp && !hasInDb) {
      return [{ acronym: valUp, name: null, orphan: true }, ...sorted];
    }
    return sorted.map((u) => ({ ...u, orphan: false }));
  }, [units, value]);

  function optionLabel(u) {
    if (u.orphan || u.name == null) {
      return `${u.acronym} (no registrada en el sistema)`;
    }
    return `${u.acronym} — ${u.name}`;
  }

  return (
    <select
      id={id}
      className={className}
      value={value ? value.trim().toUpperCase() : ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={loading && options.length === 0}
      aria-label="Unidad"
    >
      <option value="">
        {loading ? "Cargando unidades…" : emptyOptionLabel}
      </option>
      {options.map((u) => (
        <option key={u.acronym} value={u.acronym}>
          {optionLabel(u)}
        </option>
      ))}
    </select>
  );
}
