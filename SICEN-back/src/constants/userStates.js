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
 * @returns {{ name: string, isActive: boolean, lastModify: Date|null, modifyBy: string }[]}
 */
export function buildDefaultUserStates() {
  return DEFAULT_USER_STATE_NAMES.map((name) => ({
    name,
    isActive: false,
    lastModify: null,
    modifyBy: "",
  }));
}

/**
 * Normaliza la fecha de modificación a `Date` o `null`.
 * @param {unknown} value
 * @returns {Date|null}
 */
function toDateOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Indexa por `name` los estados guardados conservando la auditoría
 * (`isActive`, `lastModify`, `modifyBy`).
 * @param {unknown} stored
 * @returns {Map<string, { isActive: boolean, lastModify: Date|null, modifyBy: string }>}
 */
function indexStatesByName(stored) {
  const byName = new Map();
  if (Array.isArray(stored)) {
    for (const item of stored) {
      const name = String(item?.name ?? "").trim();
      if (!name) continue;
      byName.set(name, {
        isActive: !!item?.isActive,
        lastModify: toDateOrNull(item?.lastModify),
        modifyBy: String(item?.modifyBy ?? "").trim(),
      });
    }
  }
  return byName;
}

/**
 * Alinea estados guardados con la lista canónica (por `name`), conservando la
 * auditoría de cada habilitación (`lastModify` / `modifyBy`).
 * @param {unknown} stored
 * @returns {{ name: string, isActive: boolean, lastModify: Date|null, modifyBy: string }[]}
 */
export function mergeUserStatesFromDocument(stored) {
  const byName = indexStatesByName(stored);
  return DEFAULT_USER_STATE_NAMES.map((name) => {
    const prev = byName.get(name);
    return {
      name,
      isActive: prev?.isActive ?? false,
      lastModify: prev?.lastModify ?? null,
      modifyBy: prev?.modifyBy ?? "",
    };
  });
}

/**
 * @param {unknown} input
 * @returns {{ name: string, isActive: boolean, lastModify: Date|null, modifyBy: string }[]}
 */
export function normalizeUserStatesPayload(input) {
  return mergeUserStatesFromDocument(input);
}

/**
 * Aplica una actualización de habilitaciones registrando, **solo en las que
 * cambiaron de estado** (`isActive`), quién las modificó y cuándo. Las
 * habilitaciones que no cambian conservan su auditoría previa.
 *
 * @param {unknown} storedStates Estados actuales guardados en el documento.
 * @param {unknown} incomingStates Estados entrantes (payload del cliente).
 * @param {string} modifierEmail Email del usuario que realiza el cambio.
 * @returns {{ name: string, isActive: boolean, lastModify: Date|null, modifyBy: string }[]}
 */
export function applyUserStatesModification(
  storedStates,
  incomingStates,
  modifierEmail,
) {
  const prevByName = indexStatesByName(storedStates);
  const nextByName = indexStatesByName(incomingStates);
  const now = new Date();
  const email = String(modifierEmail ?? "").trim();

  return DEFAULT_USER_STATE_NAMES.map((name) => {
    const prev = prevByName.get(name);
    const next = nextByName.get(name);
    const prevActive = prev?.isActive ?? false;
    const nextActive = next?.isActive ?? prevActive;

    if (nextActive !== prevActive) {
      return {
        name,
        isActive: nextActive,
        lastModify: now,
        modifyBy: email,
      };
    }
    return {
      name,
      isActive: prevActive,
      lastModify: prev?.lastModify ?? null,
      modifyBy: prev?.modifyBy ?? "",
    };
  });
}
