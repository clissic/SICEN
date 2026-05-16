/** Opciones de categoría según tipo de licencia del catálogo `licences`. */

const UY_BD = ["A", "B", "C", "D"];

const EMBARQUE = [
  "Capitán",
  "Jefe de Máquinas",
  "Marinero de Cubierta",
  "Marinero de Máquinas",
  "Cocinero",
];

const PERMISO_EMBARQUE = [
  "Aprendiz de cubierta",
  "Aprendiz de máquinas",
  "Aprendiz de pesca artesanal",
];

const BUZO = [
  "Segunda Categoría",
  "Primera Categoría",
  "Supervisor de Buceo",
  "Buzo Deportivo",
  "Instructor de Buceo Deportivo",
];

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Devuelve lista fija de categorías según código o nombre de la licencia del catálogo.
 * @param {{ code?: string, nameEs?: string, nameEn?: string }} hint
 * @returns {readonly string[]}
 */
export function getHeldLicenseCategorySelectOptions(hint) {
  const code = String(hint?.code ?? "").trim().toUpperCase();
  const blob = norm(
    [hint?.nameEs, hint?.nameEn].filter(Boolean).join(" "),
  );

  if (code === "UY_BD") {
    return UY_BD;
  }
  if (blob.includes(norm("Libreta de Buzo"))) {
    return BUZO;
  }
  if (blob.includes(norm("Permiso de Embarque"))) {
    return PERMISO_EMBARQUE;
  }
  if (blob.includes(norm("Libreta de Embarque"))) {
    return EMBARQUE;
  }
  return [];
}
