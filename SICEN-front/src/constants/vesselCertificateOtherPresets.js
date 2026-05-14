/**
 * Certificados adicionales (no fijos). Se muestran en la tabla cuando el usuario
 * los agrega por buque; la clave `key` debe coincidir con el backend.
 */
export const VESSEL_CERTIFICATE_OTHER_OPTIONS = [
  { key: "other_ais_test_report", label: "AIS Test Report / Certificate (AIS)" },
  { key: "other_athens_convention", label: "Athens Convention Certificate" },
  { key: "other_blue_card", label: "Blue Card Certificate" },
  { key: "other_bunker_convention", label: "Bunker Convention Certificate" },
  {
    key: "other_cii_statement_compliance",
    label: "Carbon Intensity Indicator Statement of Compliance (CII)",
  },
  {
    key: "other_cssc_combined",
    label: "Cargo Ship Safety Certificate (CSSC Combined)",
  },
  {
    key: "other_fitness_dangerous_chemicals",
    label: "Certificate of Fitness for Dangerous Chemicals",
  },
  {
    key: "other_fitness_liquefied_gases",
    label: "Certificate of Fitness for Liquefied Gases",
  },
  {
    key: "other_clc",
    label: "Civil Liability Convention Certificate (CLC)",
  },
  {
    key: "other_dmlc_part_i",
    label: "Declaration of Maritime Labour Compliance Part I (DMLC Part I)",
  },
  {
    key: "other_dmlc_part_ii",
    label: "Declaration of Maritime Labour Compliance Part II (DMLC Part II)",
  },
  {
    key: "other_grain_authorization",
    label: "Document of Authorization for the Carriage of Grain",
  },
  {
    key: "other_dangerous_goods_doc",
    label: "Document of Compliance for Dangerous Goods",
  },
  {
    key: "other_eexi",
    label: "Energy Efficiency Existing Ship Index Statement / Certificate (EEXI)",
  },
  { key: "other_epirb_test", label: "EPIRB Test Certificate (EPIRB)" },
  {
    key: "other_fire_fighting_inspection",
    label: "Fire Fighting Equipment Inspection Certificate",
  },
  {
    key: "other_gmdss_radio_survey",
    label: "GMDSS Radio Survey Certificate (GMDSS)",
  },
  { key: "other_gyro_compass_test", label: "Gyro Compass Test Certificate" },
  {
    key: "other_hsc_safety",
    label: "High Speed Craft Safety Certificate (HSC)",
  },
  {
    key: "other_iapp",
    label: "International Air Pollution Prevention Certificate (IAPP)",
  },
  {
    key: "other_iafs",
    label: "International Anti-Fouling System Certificate (IAFS)",
  },
  {
    key: "other_ibwm",
    label: "International Ballast Water Management Certificate (IBWMC)",
  },
  {
    key: "other_ibc_code",
    label:
      "International Certificate of Fitness for the Carriage of Dangerous Chemicals in Bulk (IBC Code)",
  },
  {
    key: "other_igc_code",
    label:
      "International Certificate of Fitness for the Carriage of Liquefied Gases in Bulk (IGC Code)",
  },
  {
    key: "other_ieec",
    label: "International Energy Efficiency Certificate (IEEC)",
  },
  {
    key: "other_lifeboat_inspection",
    label: "Lifeboat and Launching Appliance Inspection Certificate",
  },
  {
    key: "other_lrit",
    label: "Long Range Identification and Tracking Compliance Certificate (LRIT)",
  },
  { key: "other_mlc", label: "Maritime Labour Certificate (MLC)" },
  {
    key: "other_mlc_financial_repatriation",
    label: "MLC Financial Security Certificate (Repatriation)",
  },
  {
    key: "other_mlc_financial_shipowner",
    label: "MLC Financial Security for Shipowners Liability",
  },
  { key: "other_marpol_exemption", label: "MARPOL Exemption Certificate" },
  {
    key: "other_wrc_nairobi",
    label: "Nairobi Wreck Removal Convention Certificate (WRC)",
  },
  {
    key: "other_passenger_liability_insurance",
    label: "Passenger Liability Insurance Certificate",
  },
  {
    key: "other_pssc",
    label: "Passenger Ship Safety Certificate (PSSC)",
  },
  { key: "other_polar_ship", label: "Polar Ship Certificate" },
  {
    key: "other_radar_performance",
    label: "Radar Performance Certificate",
  },
  {
    key: "other_seemp",
    label: "Ship Energy Efficiency Management Plan (SEEMP)",
  },
  {
    key: "other_sscc_sscec",
    label:
      "Ship Sanitation Control Certificate / Exemption Certificate (SSCC / SSCEC)",
  },
  { key: "other_solas_exemption", label: "SOLAS Exemption Certificate" },
  {
    key: "other_sps",
    label: "Special Purpose Ship Safety Certificate (SPS)",
  },
  {
    key: "other_vdr_annual",
    label: "Voyage Data Recorder Annual Performance Test Certificate (VDR)",
  },
];

/** @type {ReadonlySet<string>} */
export const VESSEL_CERTIFICATE_OTHER_KEYS = new Set(
  VESSEL_CERTIFICATE_OTHER_OPTIONS.map((o) => o.key)
);

/** @param {string} key */
export function getOtherCertificateLabel(key) {
  const k = String(key ?? "").trim();
  const hit = VESSEL_CERTIFICATE_OTHER_OPTIONS.find((o) => o.key === k);
  return hit ? hit.label : k;
}
