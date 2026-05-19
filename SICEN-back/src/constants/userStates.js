/** Habilitaciones / roles operativos inicializados al crear un usuario. */
export const DEFAULT_USER_STATE_NAMES = [
  "Oficial Supervisor por el Estado Rector de Puertos",
  "Inspector de la Comisión Técnica",
  "Inspector de Embarcaciones Menores",
  "Oficial Investigador de Accidentes Marítimos",
  "Auditor Interno del Código PBIP",
  "Auditor Interno del Código IGS",
  "Oficial de Desgacificación de Buques",
  "Oficial Juez Sumariante",
];

/**
 * Códigos de referencia (OSERP, COTEC, …) alineados al orden de `DEFAULT_USER_STATE_NAMES`.
 * @type {readonly string[]}
 */
export const DEFAULT_USER_STATE_CODES = [
  "OSERP",
  "COTEC",
  "IEMEB",
  "OFIAM",
  "PBIP",
  "IGS",
  "ODEBU",
  "JUSUM",
];

/**
 * @returns {{ name: string, isActive: boolean }[]}
 */
export function buildDefaultUserStates() {
  return DEFAULT_USER_STATE_NAMES.map((name) => ({
    name,
    isActive: false,
  }));
}

/**
 * Alinea estados guardados con la lista canónica (por `name`).
 * @param {unknown} stored
 * @returns {{ name: string, isActive: boolean }[]}
 */
export function mergeUserStatesFromDocument(stored) {
  const byName = new Map();
  if (Array.isArray(stored)) {
    for (const item of stored) {
      const name = String(item?.name ?? "").trim();
      if (name) byName.set(name, !!item?.isActive);
    }
  }
  return buildDefaultUserStates().map((d) => ({
    name: d.name,
    isActive: byName.get(d.name) ?? false,
  }));
}

/**
 * @param {unknown} input
 * @returns {{ name: string, isActive: boolean }[]}
 */
export function normalizeUserStatesPayload(input) {
  return mergeUserStatesFromDocument(input);
}
