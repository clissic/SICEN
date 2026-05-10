import { useEffect, useState } from "react";
import {
  getUnit,
  readUserUnitCache,
  writeUserUnitCache,
} from "../api/client.js";

function unitFromCache(normalized) {
  if (!normalized) return null;
  const c = readUserUnitCache();
  if (c?.acronym === normalized) {
    return Object.prototype.hasOwnProperty.call(c, "unit") ? c.unit : null;
  }
  return undefined;
}

/**
 * Datos de la unidad del usuario: primero `localStorage` (rellenado en login / refresh),
 * y solo si no hay coincidencia se hace GET /api/units/:sigla.
 */
export function useUnitFromApi(unitCode) {
  const normalized = unitCode?.trim()
    ? unitCode.trim().toUpperCase()
    : "";

  const [unit, setUnit] = useState(() => {
    if (!normalized) return null;
    const snap = unitFromCache(normalized);
    return snap === undefined ? null : snap;
  });

  useEffect(() => {
    if (!normalized) {
      setUnit(null);
      return;
    }
    const cached = unitFromCache(normalized);
    if (cached !== undefined) {
      setUnit(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getUnit(normalized);
        const u = data.unit ?? null;
        if (!cancelled) {
          setUnit(u);
          writeUserUnitCache(normalized, u);
        }
      } catch {
        if (!cancelled) {
          setUnit(null);
          writeUserUnitCache(normalized, null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [normalized]);

  return unit;
}
