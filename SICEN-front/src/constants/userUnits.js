/** Unidades organizativas (mismo orden que en el backend). */
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

/** Nombre descriptivo de cada sigla (para mostrar en UI). */
export const USER_UNIT_LABELS = Object.freeze({
  PREMO: "Prefectura de Montevideo",
  SUBEL: "Subprefectura de Bella Unión",
  PRESA: "Prefectura de Salto",
  PREPA: "Prefectura de Paysandú",
  PREFA: "Prefectura de Fray Bentos",
  PREME: "Prefectura de Mercedes",
  SUDOL: "Subprefectura de Dolores",
  PRENU: "Prefectura de Nueva Palmira",
  SUBCA: "Subprefectura de Carmelo",
  PRECO: "Prefectura de Colonia",
  SULAC: "Subprefectura de Juan Lacaze",
  SUVAZ: "Subprefectura de Santiago Vázquez",
  PREVI: "Prefectura de Trouville",
  SUCOS: "Subprefectura de Ciudad de la Costa",
  PRECA: "Prefectura de Canelones",
  SUFLO: "Subprefectura de La Floresta",
  SUPIR: "Subprefectura de Piriápolis",
  PREMA: "Prefectura de Maldonado",
  SUBCI: "Subprefectura de José Ignacio",
  PRELA: "Prefectura de La Paloma",
  SUCHU: "Subprefectura de Chuy",
  SUCHA: "Subprefectura de La Charqueada",
  PRERI: "Prefectura de Rio Branco",
});

/** Texto para mostrar; si la sigla no está en el mapa, devuelve la sigla tal cual. */
export function getUserUnitLabel(code) {
  if (code == null || !String(code).trim()) return "";
  const k = String(code).trim();
  return USER_UNIT_LABELS[k] ?? k;
}
