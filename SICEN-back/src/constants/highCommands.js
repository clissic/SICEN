/** Alineado con `SICEN-front/src/constants/highCommands.js`. */
export const HIGH_COMMAND_IDS = [
  "COMFLO",
  "PRENA",
  "DIGFA",
  "DIPER",
  "ESMAY",
  "DIMAT",
];

export function parseHighCommand(raw) {
  const id = String(raw ?? "").trim().toUpperCase();
  return HIGH_COMMAND_IDS.includes(id) ? id : "";
}
