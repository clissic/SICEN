import { useEffect, useMemo, useState } from "react";
import {
  listUnitsRegistered,
  listUnitsRegisteredPublic,
} from "../api/client.js";

export function UserUnitSelect({
  id = "user-unit",
  value,
  onChange,
  required = false,
  className = "form-select",
  emptyOptionLabel = "Seleccionar unidad…",
  usePublicEndpoint = false,
  extraOptions = [],
}) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = usePublicEndpoint
          ? await listUnitsRegisteredPublic()
          : await listUnitsRegistered();
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
  }, [usePublicEndpoint]);

  const normalizedExtras = useMemo(
    () =>
      (Array.isArray(extraOptions) ? extraOptions : [])
        .filter((o) => o && typeof o.value === "string" && o.value.trim() !== "")
        .map((o) => ({ value: o.value.trim().toUpperCase(), label: o.label })),
    [extraOptions]
  );

  const options = useMemo(() => {
    const sorted = [...units].sort((a, b) =>
      a.acronym.localeCompare(b.acronym, "es", { sensitivity: "base" })
    );
    const valUp = value?.trim() ? value.trim().toUpperCase() : "";
    const hasInDb = sorted.some((u) => u.acronym === valUp);
    const isExtra = normalizedExtras.some((o) => o.value === valUp);
    if (valUp && !hasInDb && !isExtra) {
      return [{ acronym: valUp, name: null, orphan: true }, ...sorted];
    }
    return sorted.map((u) => ({ ...u, orphan: false }));
  }, [units, value, normalizedExtras]);

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
      {normalizedExtras.length > 0 ? (
        <>
          <option disabled>──────────</option>
          {normalizedExtras.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </>
      ) : null}
    </select>
  );
}
