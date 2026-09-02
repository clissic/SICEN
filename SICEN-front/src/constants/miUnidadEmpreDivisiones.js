/** Divisiones P1–P6 del menú Mi Unidad exclusivo para la unidad EMPRE. */
export const EMPRE_UNIT_ACRONYM = "EMPRE";

export const MI_UNIDAD_EMPRE_DIVISIONES = Object.freeze([
  {
    slug: "p1-personal",
    title: "P1 - Personal",
    subtitle: "Gestión de personal y recursos humanos.",
    iconClass: "bi-people-fill",
    imageSrc: null,
  },
  {
    slug: "p2-inteligencia",
    title: "P2 - Inteligencia",
    subtitle: "Análisis e información estratégica.",
    iconClass: "bi-binoculars-fill",
    imageSrc: null,
  },
  {
    slug: "p3-planes-y-operaciones",
    title: "P3 - Planes y Operaciones",
    subtitle: "Planificación y conducción operativa.",
    iconClass: "bi-clipboard2-check-fill",
    imageSrc: null,
    menuItems: [
      {
        slug: "control-de-fronteras",
        title: "Control de fronteras",
        subtitle: "Seguimiento y control en zonas de frontera.",
        iconClass: "bi-signpost-split-fill",
      },
    ],
  },
  {
    slug: "p4-logistica",
    title: "P4 - Logística",
    subtitle: "Abastecimiento, mantenimiento y apoyo.",
    iconClass: "bi-truck",
    imageSrc: null,
  },
  {
    slug: "p5-comunicaciones",
    title: "P5 - Comunicaciones",
    subtitle: "Enlaces, mensajería y sistemas de comunicación.",
    iconClass: "bi-broadcast-pin",
    imageSrc: null,
  },
  {
    slug: "p6-asuntos-especiales",
    title: "P6 - Asuntos Especiales",
    subtitle: "Temas específicos y coordinación especial.",
    iconClass: "bi-patch-check-fill",
    imageSrc: null,
  },
]);

export function isEmpreUnit(unitCode) {
  return (
    String(unitCode ?? "")
      .trim()
      .toUpperCase() === EMPRE_UNIT_ACRONYM
  );
}

/** Slugs de áreas visibles en Mi Unidad para EMPRE. */
export const MI_UNIDAD_EMPRE_AREA_SLUGS = Object.freeze(["secretaria"]);

const BY_SLUG = Object.fromEntries(
  MI_UNIDAD_EMPRE_DIVISIONES.map((d) => [d.slug, d])
);

export function getMiUnidadEmpreDivision(slug) {
  return slug ? BY_SLUG[slug] ?? null : null;
}

export function getMiUnidadEmpreDivisionItem(divisionSlug, itemSlug) {
  const division = getMiUnidadEmpreDivision(divisionSlug);
  if (!division?.menuItems?.length) return null;
  const item = division.menuItems.find((i) => i.slug === itemSlug);
  if (!item) return null;
  return { division, item };
}
