/**
 * Conteos derivados del listado de usuarios (GET /api/users).
 */

import { USER_STATE_OPTIONS } from "./userStates.js";

/**
 * Filas ordenadas: sigla de unidad (mayúsculas); usuarios sin unidad como "(Sin unidad)", al final.
 * @returns {{ unit: string, count: number }[]}
 */
export function summarizeUsersByUnit(users) {
  const map = new Map();
  if (!Array.isArray(users)) return [];
  for (const u of users) {
    const raw = (u?.unit ?? "").trim();
    const label = raw ? raw.toUpperCase() : "(Sin unidad)";
    map.set(label, (map.get(label) || 0) + 1);
  }
  const rows = Array.from(map.entries()).map(([unit, count]) => ({ unit, count }));
  rows.sort((a, b) => {
    if (a.unit === "(Sin unidad)") return 1;
    if (b.unit === "(Sin unidad)") return -1;
    return a.unit.localeCompare(b.unit, "es", { sensitivity: "base" });
  });
  return rows;
}

/**
 * Cantidades por rol conocido en el esquema (user, admin, superAdmin).
 * Si hubiera otros valores en BD histórica, se agrupan en una fila opcional.
 * @returns {{ key: string, label: string, count: number }[]}
 */
export function summarizeUsersByRole(users) {
  let nUser = 0;
  let nAdmin = 0;
  let nSuper = 0;
  let nOther = 0;
  if (Array.isArray(users)) {
    for (const u of users) {
      const r = u?.role;
      if (r === "user") nUser++;
      else if (r === "admin") nAdmin++;
      else if (r === "superAdmin") nSuper++;
      else nOther++;
    }
  }
  const base = [
    { key: "user", label: "Usuario", count: nUser },
    { key: "admin", label: "Administrador", count: nAdmin },
    { key: "superAdmin", label: "Super administrador", count: nSuper },
  ];
  if (nOther > 0) {
    base.push({ key: "other", label: "Otro rol", count: nOther });
  }
  return base;
}

/**
 * Usuarios con cada especialización activa (`states[].isActive === true`).
 * @returns {{ code: string, name: string, count: number }[]}
 */
export function summarizeUsersBySpecialization(users) {
  const counts = new Map(
    USER_STATE_OPTIONS.map((opt) => [opt.name, 0]),
  );

  if (Array.isArray(users)) {
    for (const u of users) {
      const byName = new Map();
      if (Array.isArray(u?.states)) {
        for (const item of u.states) {
          const name = String(item?.name ?? "").trim();
          if (name) byName.set(name, !!item.isActive);
        }
      }
      for (const opt of USER_STATE_OPTIONS) {
        if (byName.get(opt.name) === true) {
          counts.set(opt.name, (counts.get(opt.name) || 0) + 1);
        }
      }
    }
  }

  return USER_STATE_OPTIONS.map((opt) => ({
    code: opt.code,
    name: opt.name,
    count: counts.get(opt.name) || 0,
  }));
}
