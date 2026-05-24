/** Valores iniciales del formulario de alta (campos que completa el usuario). */
export const INITIAL_SEAFARER_CREATE_FORM = {
  dni: "",
  passport: "",
  ccSeries: "",
  ccNumber: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  nationality: "",
  gender: "",
  bloodGroup: "",
  bloodRh: "",
  hairColor: "",
  hairColorDetail: "",
  hairColoration: "",
  eyeColor: "",
  skinColor: "",
  heightCm: "",
  medicalExpiration: "",
  medicalStatus: "",
  vaccinationExpiration: "",
  vaccinationStatus: "",
  phone: "",
  email: "",
  address: "",
};

/** Opciones para búsqueda por documento (consulta / metadatos). */
export const SEAFARER_DOCUMENT_SEARCH_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "DNI", label: "DNI" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "CC", label: "Credencial cívica (CC)" },
];

export const SEAFARER_GENDER_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
];

export const SEAFARER_BLOOD_GROUP_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "AB", label: "AB" },
  { value: "O", label: "O" },
];

export const SEAFARER_BLOOD_RH_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "+", label: "+" },
  { value: "-", label: "−" },
];

const morphSelect = (values) => [
  { value: "", label: "Seleccione…" },
  ...values.map((v) => ({ value: v, label: v })),
];

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

export const SEAFARER_EYE_COLOR_OPTIONS = morphSelect(SEAFARER_EYE_COLOR_VALUES);

function hairColorOptionLabel(value) {
  if (value === SEAFARER_HAIR_COLOR_MULTICOLOR) return "Multicolor";
  return value;
}

export const SEAFARER_HAIR_COLOR_OPTIONS = [
  { value: "", label: "Seleccione…" },
  ...SEAFARER_HAIR_COLOR_VALUES.map((v) => ({
    value: v,
    label: hairColorOptionLabel(v),
  })),
];

export const SEAFARER_HAIR_COLORATION_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "NATURAL", label: "Natural" },
  { value: "ARTIFICIAL", label: "Artificial" },
];

export const SEAFARER_SKIN_COLOR_OPTIONS = morphSelect(SEAFARER_SKIN_COLOR_VALUES);

/** Etiqueta legible de coloración del cabello. */
export function displaySeafarerHairColoration(value) {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "NATURAL") return "Natural";
  if (v === "ARTIFICIAL") return "Artificial";
  return v || "—";
}

export function normalizeSeafarerMorphHairColor(raw) {
  const v = String(raw ?? "").trim();
  return SEAFARER_HAIR_COLOR_VALUES.includes(v) ? v : "";
}

export function normalizeSeafarerMorphEyeColor(raw) {
  const v = String(raw ?? "").trim();
  return SEAFARER_EYE_COLOR_VALUES.includes(v) ? v : "";
}

export function normalizeSeafarerMorphHairColoration(raw) {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "NATURAL" || v === "ARTIFICIAL") return v;
  return "";
}

export function normalizeSeafarerMorphHairColorDetail(hairColor, rawDetail) {
  const color = normalizeSeafarerMorphHairColor(hairColor);
  if (color !== SEAFARER_HAIR_COLOR_MULTICOLOR) return "";
  return String(rawDetail ?? "").trim();
}

export function normalizeSeafarerMorphSkinColor(raw) {
  const v = String(raw ?? "").trim();
  return SEAFARER_SKIN_COLOR_VALUES.includes(v) ? v : "";
}

/** Texto para tabla de consulta: color de cabello y detalle si es multicolor. */
export function displaySeafarerHairColor(morph) {
  if (!morph || typeof morph !== "object") return "—";
  const color = String(morph.hairColor ?? "").trim();
  if (!color) return "—";
  if (color === SEAFARER_HAIR_COLOR_MULTICOLOR) {
    const detail = String(morph.hairColorDetail ?? "").trim();
    return detail ? `Multicolor — ${detail}` : "Multicolor";
  }
  return color;
}

/** @deprecated Usar funciones específicas por tipo. */
export function normalizeSeafarerDocumentNumber(documentType, raw) {
  if (documentType === "DNI") return normalizeSeafarerDni(raw);
  if (documentType === "Pasaporte") return normalizeSeafarerPassport(raw);
  if (documentType === "CC") return normalizeSeafarerCcNumber(raw);
  return String(raw ?? "").trim();
}

export function normalizeSeafarerDni(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

export function normalizeSeafarerPassport(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Serie CC: solo letras, siempre mayúsculas. */
export function normalizeSeafarerCcSeries(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function normalizeSeafarerCcNumber(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

export function isCcDocumentSearchType(documentType) {
  return documentType === "CC";
}

/**
 * Texto legible de identificación (nuevo esquema o legado).
 * @param {object|null|undefined} seafarer
 */
export function formatSeafarerIdentification(seafarer) {
  if (!seafarer || typeof seafarer !== "object") return "—";
  const id = seafarer.identificationDocuments;
  if (id && typeof id === "object") {
    const parts = [];
    const dni = String(id.dni ?? "").trim();
    const pass = String(id.passport ?? "").trim();
    const cc = id.civicCredential;
    const ccSeries = cc && typeof cc === "object" ? String(cc.series ?? "").trim() : "";
    const ccNum = cc && typeof cc === "object" ? String(cc.number ?? "").trim() : "";
    if (dni) parts.push(`DNI ${dni}`);
    if (pass) parts.push(`Pasaporte ${pass}`);
    if (ccSeries || ccNum) parts.push(`CC ${ccSeries}-${ccNum}`);
    if (parts.length) return parts.join(" · ");
  }
  const leg = seafarer.document;
  if (leg && typeof leg === "object") {
    const t = String(leg.type ?? "").trim();
    const n = String(leg.number ?? "").trim();
    if (t || n) return [t, n].filter(Boolean).join(" ");
  }
  return "—";
}

/**
 * Convierte un documento de seafarer (consulta) al shape del formulario
 * `INITIAL_SEAFARER_CREATE_FORM`. Útil para precargar el modal de modificación.
 */
export function seafarerToCreateForm(seafarer) {
  if (!seafarer || typeof seafarer !== "object") {
    return { ...INITIAL_SEAFARER_CREATE_FORM };
  }
  const id =
    seafarer.identificationDocuments && typeof seafarer.identificationDocuments === "object"
      ? seafarer.identificationDocuments
      : {};
  const cc = id.civicCredential && typeof id.civicCredential === "object" ? id.civicCredential : {};
  const pd = seafarer.personalData && typeof seafarer.personalData === "object" ? seafarer.personalData : {};
  const bt = pd.bloodType && typeof pd.bloodType === "object" ? pd.bloodType : {};
  const morph =
    seafarer.morphologicalData && typeof seafarer.morphologicalData === "object"
      ? seafarer.morphologicalData
      : {};
  const mf =
    seafarer.maritimeFitness && typeof seafarer.maritimeFitness === "object"
      ? seafarer.maritimeFitness
      : {};
  const mc = mf.medicalCertificate && typeof mf.medicalCertificate === "object" ? mf.medicalCertificate : {};
  const vc = mf.vaccinationCard && typeof mf.vaccinationCard === "object" ? mf.vaccinationCard : {};
  const ct = seafarer.contact && typeof seafarer.contact === "object" ? seafarer.contact : {};

  const toDateInput = (v) => {
    if (v == null || v === "") return "";
    if (typeof v === "string") return v.slice(0, 10);
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    ...INITIAL_SEAFARER_CREATE_FORM,
    dni: String(id.dni ?? "").trim(),
    passport: String(id.passport ?? "").trim(),
    ccSeries: String(cc.series ?? "").trim(),
    ccNumber: String(cc.number ?? "").trim(),
    firstName: String(pd.firstName ?? "").trim(),
    lastName: String(pd.lastName ?? "").trim(),
    birthDate: toDateInput(pd.birthDate),
    nationality: String(pd.nationality ?? "").trim(),
    gender: String(pd.gender ?? "").trim(),
    bloodGroup: String(bt.group ?? "").trim().toUpperCase(),
    bloodRh: String(bt.rhFactor ?? "").trim(),
    hairColor: String(morph.hairColor ?? "").trim(),
    hairColorDetail: String(morph.hairColorDetail ?? "").trim(),
    hairColoration: String(morph.hairColoration ?? "").trim(),
    eyeColor: String(morph.eyeColor ?? "").trim(),
    skinColor: String(morph.skinColor ?? "").trim(),
    heightCm:
      morph.heightCm == null || morph.heightCm === ""
        ? ""
        : String(morph.heightCm),
    medicalExpiration: toDateInput(mc.expirationDate),
    medicalStatus: String(mc.status ?? "").trim(),
    vaccinationExpiration: toDateInput(vc.expirationDate),
    vaccinationStatus: String(vc.status ?? "").trim(),
    phone: String(ct.phone ?? "").trim(),
    email: String(ct.email ?? "").trim(),
    address: String(ct.address ?? "").trim(),
  };
}

/**
 * Plano del formulario → cuerpo JSON esperado por `POST /api/seafarers`.
 * @param {typeof INITIAL_SEAFARER_CREATE_FORM} f
 */
export function seafarerCreateFormToPayload(f) {
  const heightRaw = String(f.heightCm ?? "").trim();
  const heightCm = heightRaw === "" ? null : Number(heightRaw);

  return {
    identificationDocuments: {
      dni: normalizeSeafarerDni(f.dni),
      passport: normalizeSeafarerPassport(f.passport),
      civicCredential: {
        series: normalizeSeafarerCcSeries(f.ccSeries),
        number: normalizeSeafarerCcNumber(f.ccNumber),
      },
    },
    morphologicalData: {
      hairColor: normalizeSeafarerMorphHairColor(f.hairColor),
      hairColorDetail: normalizeSeafarerMorphHairColorDetail(
        f.hairColor,
        f.hairColorDetail,
      ),
      hairColoration: normalizeSeafarerMorphHairColoration(f.hairColoration),
      eyeColor: normalizeSeafarerMorphEyeColor(f.eyeColor),
      skinColor: normalizeSeafarerMorphSkinColor(f.skinColor),
      heightCm: Number.isFinite(heightCm) && heightCm >= 0 ? Math.round(heightCm) : null,
    },
    personalData: {
      firstName: String(f.firstName ?? "").trim(),
      lastName: String(f.lastName ?? "").trim(),
      birthDate: String(f.birthDate ?? "").trim(),
      nationality: String(f.nationality ?? "").trim(),
      gender: String(f.gender ?? "").trim(),
      bloodType: {
        group: String(f.bloodGroup ?? "").trim().toUpperCase(),
        rhFactor: String(f.bloodRh ?? "").trim(),
      },
    },
    maritimeFitness: {
      medicalCertificate: {
        expirationDate: String(f.medicalExpiration ?? "").trim(),
        status: String(f.medicalStatus ?? "").trim(),
      },
      vaccinationCard: {
        expirationDate: String(f.vaccinationExpiration ?? "").trim(),
        status: String(f.vaccinationStatus ?? "").trim(),
      },
    },
    contact: {
      phone: String(f.phone ?? "").trim(),
      email: String(f.email ?? "").trim(),
      address: String(f.address ?? "").trim(),
    },
  };
}
