/**
 * Coincidencia propietario de buque ↔ usuario náuta (rol skipper).
 */

function str(v) {
  return String(v ?? "").trim();
}

function normalizeMatchText(s) {
  return str(s).toLowerCase().replace(/\s+/g, " ");
}

/** Términos para buscar en ownership.owner (documento y variantes de nombre). */
export function buildSkipperOwnerMatchTerms(user) {
  const terms = [];
  const docDigits = str(user?.documentId).replace(/\D/g, "");
  if (docDigits) terms.push(docDigits);

  const first = str(user?.first_name);
  const last = str(user?.last_name);
  if (first && last) {
    terms.push(`${last}, ${first}`.toLowerCase());
    terms.push(`${first} ${last}`.toLowerCase());
    terms.push(`${last} ${first}`.toLowerCase());
  } else if (first) {
    terms.push(first.toLowerCase());
  } else if (last) {
    terms.push(last.toLowerCase());
  }

  return [...new Set(terms.filter(Boolean))];
}

export function ownerStringMatchesSkipper(ownerStr, user) {
  const owner = normalizeMatchText(ownerStr);
  if (!owner) return false;
  const terms = buildSkipperOwnerMatchTerms(user);
  return terms.some((term) => {
    const t = normalizeMatchText(term);
    return t && (owner.includes(t) || t.includes(owner));
  });
}

/** Propietario por texto o vinculado en ownership.administrators. */
export function skipperCanManageVessel(vesselLean, user) {
  if (!user?._id) return false;
  if (ownerStringMatchesSkipper(vesselLean?.ownership?.owner, user)) {
    return true;
  }
  const uid = String(user._id);
  return (vesselLean?.ownership?.administrators || []).some(
    (a) => String(a.userId) === uid
  );
}

/** Etiqueta legible para ownership.owner al aprobar claimType owner. */
export function ownerLabelFromSkipper(user) {
  const first = str(user?.first_name);
  const last = str(user?.last_name);
  const name =
    last && first ? `${last}, ${first}` : `${first} ${last}`.trim() || "—";
  const doc = str(user?.documentId);
  return doc ? `${name} — ${doc}` : name;
}
