/** Divisiones del menú interno de Mi unidad. */
export const MI_UNIDAD_DIVISIONS = Object.freeze([
  {
    slug: "division-i",
    title: "DIVISIÓN I - POLICÍA MARITIMA",
    subtitle:
      "Destacamentos, procedimientos, medios terrestres y marítimos, guardia militar, etc.",
    iconClass: "bi-shield-check",
    imageSrc: "/img/divi.jpg",
    menuSections: [
      {
        slug: "capital-humano",
        title: "Capital humano",
        items: [
          {
            slug: "procedimientos",
            title: "Procedimientos",
            subtitle: "Procedimientos y protocolos de la división.",
            iconClass: "bi-journal-richtext",
          },
          {
            slug: "guias-funcionales",
            title: "Guías Funcionales",
            subtitle: "Guías de desempeño y referencia operativa.",
            iconClass: "bi-diagram-3",
          },
          {
            slug: "perfiles-puestos",
            title: "Perfiles de Puestos",
            subtitle: "Descripción de funciones y responsabilidades.",
            iconClass: "bi-person-badge",
          },
        ],
      },
    ],
  },
  {
    slug: "division-ii",
    title: "DIVISIÓN II - MARINA MERCANTE",
    subtitle:
      "Sumarios marítimos, situación de embargos, buques con pendientes, inspecciones, etc.",
    iconClass: "bi-compass",
    imageSrc: "/img/divii.jpg",
    menuSections: [
      {
        slug: "capital-humano",
        title: "Capital humano",
        items: [
          {
            slug: "procedimientos",
            title: "Procedimientos",
            subtitle: "Procedimientos y protocolos de la división.",
            iconClass: "bi-journal-richtext",
          },
          {
            slug: "guias-funcionales",
            title: "Guías Funcionales",
            subtitle: "Guías de desempeño y referencia operativa.",
            iconClass: "bi-diagram-3",
          },
          {
            slug: "perfiles-puestos",
            title: "Perfiles de Puestos",
            subtitle: "Descripción de funciones y responsabilidades.",
            iconClass: "bi-person-badge",
          },
        ],
      },
    ],
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
