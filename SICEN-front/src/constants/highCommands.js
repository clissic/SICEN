export const HIGH_COMMANDS = [
  { id: "COMFLO", name: "Comando de la Flota", color: "#c0392b" },
  { id: "PRENA", name: "Prefectura Nacional Naval", color: "#111111" },
  { id: "DIGFA", name: "Dirección General de Finanzas", color: "#2471a3" },
  { id: "DIPER", name: "Dirección General de Personal Naval", color: "#ffffff" },
  { id: "ESMAY", name: "Estado Mayor General de la Armada", color: "#f4d03f" },
  { id: "DIMAT", name: "Dirección General de Material Naval", color: "#196f3d" },
];

/** Grandes mandos que hacen patrullas y se muestran en la casilla del día. */
export const PATROL_HIGH_COMMANDS = ["PRENA", "COMFLO"];

export function highCommandLabel(id) {
  const found = HIGH_COMMANDS.find((item) => item.id === id);
  if (!found) return id || "—";
  return `${found.id} — ${found.name}`;
}
