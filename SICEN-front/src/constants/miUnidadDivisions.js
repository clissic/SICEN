/** Divisiones del menú interno de Mi unidad. */
export const MI_UNIDAD_DIVISIONS = Object.freeze([
  {
    slug: "division-i",
    title: "DIVISIÓN I - POLICÍA MARITIMA",
    subtitle:
      "Destacamentos, procedimientos, medios terrestres y marítimos, guardia militar, etc.",
    iconClass: "bi-shield-check",
    imageSrc: "/img/divi.jpg",
  },
  {
    slug: "division-ii",
    title: "DIVISIÓN II - MARINA MERCANTE",
    subtitle:
      "Sumarios marítimos, situación de embargos, buques con pendientes, inspecciones, etc.",
    iconClass: "bi-compass",
    imageSrc: "/img/divii.jpg",
  },
  {
    slug: "division-iii",
    title: "DIVISIÓN III - APOYO LOGÍSTICO",
    subtitle:
      "Seguimiento logístico, gestión de personal, licencias, calificaciones, etc.",
    iconClass: "bi-gear-wide-connected",
    imageSrc: "/img/diviii.jpg",
  },
]);

const BY_SLUG = Object.fromEntries(
  MI_UNIDAD_DIVISIONS.map((d) => [d.slug, d])
);

export function getMiUnidadDivision(slug) {
  return slug ? BY_SLUG[slug] ?? null : null;
}
