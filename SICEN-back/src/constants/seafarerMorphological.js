export const SEAFARER_EYE_COLOR_VALUES = [
  "NEGRO",
  "MARRÓN",
  "AZUL",
  "VERDE",
  "ROJO",
  "VIOLETA",
];

export const SEAFARER_HAIR_COLOR_VALUES = [
  "NEGRO",
  "MARRÓN",
  "RUBIO",
  "PELIRROJO",
  "GRIS",
  "BLANCO",
  "ROJO",
  "ROSA",
  "NARANJA",
  "AMARILLO",
  "VERDE",
  "AZUL",
  "VIOLETA",
  "MULTICOLOR",
  "SIN CABELLO",
];

export const SEAFARER_HAIR_COLOR_MULTICOLOR = "MULTICOLOR";

export const SEAFARER_HAIR_COLORATION_VALUES = ["NATURAL", "ARTIFICIAL"];

export const SEAFARER_SKIN_COLOR_VALUES = [
  "MUY CLARO",
  "CLARO",
  "TRIGUEÑO CLARO",
  "TRIGUEÑO",
  "MORENO",
  "OSCURO",
];

function str(v) {
  return v == null ? "" : String(v).trim();
}

export function normalizeSeafarerMorphHairColor(raw) {
  const v = str(raw);
  return SEAFARER_HAIR_COLOR_VALUES.includes(v) ? v : "";
}

export function normalizeSeafarerMorphEyeColor(raw) {
  const v = str(raw);
  return SEAFARER_EYE_COLOR_VALUES.includes(v) ? v : "";
}

export function normalizeSeafarerMorphHairColoration(raw) {
  const v = str(raw).toUpperCase();
  return SEAFARER_HAIR_COLORATION_VALUES.includes(v) ? v : "";
}

export function normalizeSeafarerMorphHairColorDetail(hairColor, rawDetail) {
  const color = normalizeSeafarerMorphHairColor(hairColor);
  if (color !== SEAFARER_HAIR_COLOR_MULTICOLOR) return "";
  return str(rawDetail);
}

export function normalizeSeafarerMorphSkinColor(raw) {
  const v = str(raw);
  return SEAFARER_SKIN_COLOR_VALUES.includes(v) ? v : "";
}
