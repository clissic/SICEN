import { getMiUnidadDivision } from "./miUnidadDivisions.js";

/**
 * Resuelve un ítem de menú anidado bajo una división (p. ej. Capital humano → Procedimientos).
 */
export function getMiUnidadDivisionMenuItem(
  divisionSlug,
  sectionSlug,
  itemSlug
) {
  const division = getMiUnidadDivision(divisionSlug);
  if (!division?.menuSections?.length) {
    return null;
  }
  const section = division.menuSections.find((s) => s.slug === sectionSlug);
  const item = section?.items?.find((i) => i.slug === itemSlug);
  if (!section || !item) {
    return null;
  }
  return { division, section, item };
}
