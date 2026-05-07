/** Unidades organizativas válidas para usuarios (orden de negocio). */
export const USER_UNITS = Object.freeze([
  "PREMO",
  "SUBEL",
  "PRESA",
  "PREPA",
  "PREFA",
  "PREME",
  "SUDOL",
  "PRENU",
  "SUBCA",
  "PRECO",
  "SULAC",
  "SUVAZ",
  "PREVI",
  "SUCOS",
  "PRECA",
  "SUFLO",
  "SUPIR",
  "PREMA",
  "SUBCI",
  "PRELA",
  "SUCHU",
  "SUCHA",
  "PRERI",
]);

const VALID = new Set(USER_UNITS);

export function isValidUserUnit(unit) {
  return typeof unit === "string" && VALID.has(unit);
}
