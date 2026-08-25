/** Rutas del menú principal y áreas de gestión que exigen `userTutorial`. */
export const MAIN_MENU_ROUTE_PREFIXES = [
  "/centinela",
  "/estado-rector-puertos",
  "/mi-unidad",
  "/base-buques",
  "/base-gente-mar",
  "/multas",
  "/gestion-unidades",
  "/usuarios",
  "/herramientas",
];

/**
 * @param {string} pathname
 */
export function pathRequiresUserTutorial(pathname) {
  const p = (pathname ?? "").split("?")[0].replace(/\/$/, "") || "/";
  return MAIN_MENU_ROUTE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}
