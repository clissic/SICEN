/** Alineado con `SICEN-back/src/constants/userStates.js`. */
export const USER_STATE_OPTIONS = [
  {
    code: "OSERP",
    name: "Oficial Supervisor por el Estado Rector de Puertos",
    icon: "bi-globe2",
  },
  {
    code: "COTEC",
    name: "Inspector de la Comisión Técnica",
    icon: "bi-award",
  },
  {
    code: "IEMEB",
    name: "Inspector de Embarcaciones Menores",
    icon: "bi-card-checklist",
  },
  {
    code: "OFIAM",
    name: "Oficial Investigador de Accidentes Marítimos",
    icon: "bi-search",
  },
  {
    code: "PBIP",
    name: "Auditor Interno del Código PBIP",
    icon: "bi-shield-check",
  },
  {
    code: "IGS",
    name: "Auditor Interno del Código IGS",
    icon: "bi-shield-lock",
  },
  {
    code: "ODEBU",
    name: "Oficial de Desgacificación de Buques",
    icon: "bi-fire",
  },
  {
    code: "JUSUM",
    name: "Oficial Juez Sumariante",
    icon: "bi-hammer",
  },
];

/**
 * @param {unknown} stored
 * @returns {{ name: string, isActive: boolean, code: string }[]}
 */
export function mergeUserStatesForForm(stored) {
  const byName = new Map();
  if (Array.isArray(stored)) {
    for (const item of stored) {
      const name = String(item?.name ?? "").trim();
      if (name) byName.set(name, !!item?.isActive);
    }
  }
  return USER_STATE_OPTIONS.map((opt) => ({
    code: opt.code,
    name: opt.name,
    icon: opt.icon,
    isActive: byName.get(opt.name) ?? false,
  }));
}

/** @param {unknown} stored */
export function getActiveUserStates(stored) {
  return mergeUserStatesForForm(stored).filter((s) => s.isActive);
}

/**
 * @param {{ name: string, isActive: boolean }[]} states
 */
export function userStatesForApi(states) {
  return (Array.isArray(states) ? states : []).map(({ name, isActive }) => ({
    name,
    isActive: !!isActive,
  }));
}
