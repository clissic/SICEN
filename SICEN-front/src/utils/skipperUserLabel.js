/** Etiqueta legible para un usuario náuta (nombre + documento). */
export function formatSkipperLabel(user) {
  if (!user) return "";
  const first = String(user.first_name ?? "").trim();
  const last = String(user.last_name ?? "").trim();
  const name =
    last && first ? `${last}, ${first}` : `${first} ${last}`.trim() || "—";
  const doc = String(user.documentId ?? "").trim();
  return doc ? `${name} — ${doc}` : name;
}
