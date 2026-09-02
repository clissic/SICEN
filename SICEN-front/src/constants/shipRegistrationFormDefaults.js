export const VESSEL_TYPE_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "Ultramar", label: "Ultramar" },
  { value: "Cabotaje", label: "Cabotaje" },
  { value: "Deportivo", label: "Deportivo" },
];

export const RECREATIONAL_DOC_OPTIONS = [
  { value: "", label: "Seleccione…" },
  {
    value: "Certificado de Construcción",
    label: "Certificado de Construcción",
  },
  {
    value: "Registro de Embarcaciones Deportivas",
    label: "Registro de Embarcaciones Deportivas",
  },
  { value: "Matrícula de Cabotaje", label: "Matrícula de Cabotaje" },
  { value: "Extranjero", label: "Extranjero" },
];

/** Fija con Certificado de Construcción (documentación deportiva). */
export const RECREATIONAL_CATEGORY_FIXED_CONSTRUCCION = "500 metros";

export const RECREATIONAL_CATEGORY_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "Categoría A", label: "Categoría A" },
  { value: "Categoría B", label: "Categoría B" },
  { value: "Categoría C", label: "Categoría C" },
  { value: "Categoría D", label: "Categoría D" },
];

export const INITIAL_SHIP_REGISTRATION_FORM = {
  vesselType: "",
  recreationalDocType: "",
  recreationalCategory: "",
  name: "",
  imoNumber: "",
  nationalRegistryNumber: "",
  mmsi: "",
  callSign: "",
  flagState: "",
  portOfRegistry: "",
  shipType: "",
  yearBuilt: "",
  grossTonnage: "",
  netTonnage: "",
  deadweight: "",
  lengthOverall: "",
  beam: "",
  puntal: "",
  draft: "",
  owner: "",
  operator: "",
  /** Solo alta deportiva: náuta propietario vinculado (objeto UI). */
  ownerSkipper: null,
  /** Solo alta deportiva: náutas administradores vinculados (objetos UI). */
  administratorSkippers: [],
  classificationKind: "",
  classificationSociety: "",
  classificationFlagRegistry: "",
  master: "",
  crewCapacity: "",
};
