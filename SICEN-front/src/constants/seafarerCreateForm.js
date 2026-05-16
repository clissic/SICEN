/** Valores iniciales del formulario de alta (campos que completa el usuario). */
export const INITIAL_SEAFARER_CREATE_FORM = {
  documentType: "",
  documentNumber: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  nationality: "",
  gender: "",
  seamanBookNumber: "",
  seamanBookExpiration: "",
  seamanBookStatus: "",
  medicalExpiration: "",
  medicalStatus: "",
  vaccinationExpiration: "",
  vaccinationStatus: "",
  phone: "",
  email: "",
  address: "",
};

export const SEAFARER_DOCUMENT_TYPE_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "DNI", label: "DNI" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "Cédula de identidad", label: "Cédula de identidad" },
  { value: "Otro", label: "Otro" },
];

/** DNI y cédula de identidad: solo dígitos. Pasaporte: mayúsculas. */
export function normalizeSeafarerDocumentNumber(documentType, raw) {
  const v = String(raw ?? "");
  if (documentType === "DNI" || documentType === "Cédula de identidad") {
    return v.replace(/\D/g, "");
  }
  if (documentType === "Pasaporte") {
    return v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  return v;
}

export function isNumericSeafarerDocumentType(documentType) {
  return (
    documentType === "DNI" || documentType === "Cédula de identidad"
  );
}

export const SEAFARER_GENDER_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
  { value: "Otro", label: "Otro" },
  { value: "Prefiero no decir", label: "Prefiero no decir" },
];

/**
 * Plano del formulario → cuerpo JSON esperado por `POST /api/seafarers`.
 * @param {typeof INITIAL_SEAFARER_CREATE_FORM} f
 */
export function seafarerCreateFormToPayload(f) {
  return {
    document: {
      type: String(f.documentType ?? "").trim(),
      number: normalizeSeafarerDocumentNumber(
        f.documentType,
        String(f.documentNumber ?? "").trim(),
      ),
    },
    personalData: {
      firstName: String(f.firstName ?? "").trim(),
      lastName: String(f.lastName ?? "").trim(),
      birthDate: String(f.birthDate ?? "").trim(),
      nationality: String(f.nationality ?? "").trim(),
      gender: String(f.gender ?? "").trim(),
    },
    maritimeFitness: {
      seamanBook: {
        number: String(f.seamanBookNumber ?? "").trim(),
        expirationDate: String(f.seamanBookExpiration ?? "").trim(),
        status: String(f.seamanBookStatus ?? "").trim(),
      },
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
