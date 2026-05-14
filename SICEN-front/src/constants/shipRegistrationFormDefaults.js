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
];

export const INITIAL_SHIP_REGISTRATION_FORM = {
  vesselType: "",
  recreationalDocType: "",
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
  classificationKind: "",
  classificationSociety: "",
  classificationFlagRegistry: "",
  master: "",
  crewCapacity: "",
};
