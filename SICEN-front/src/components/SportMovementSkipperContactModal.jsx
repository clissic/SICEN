import { useEffect, useState } from "react";
import { findSeafarerByDocument } from "../api/client.js";

function dash(v) {
  const s = String(v ?? "").trim();
  return s || "—";
}

function seafarerFullName(seafarer) {
  const pd = seafarer?.personalData || {};
  const last = String(pd.lastName || "").trim();
  const first = String(pd.firstName || "").trim();
  if (last && first) return `${last}, ${first}`;
  return last || first || "";
}

/**
 * Modal con datos de contacto del patrón de un movimiento demorado.
 * Intenta refrescar desde la BD de náutas; si falla, usa el snapshot del movimiento.
 */
export function SportMovementSkipperContactModal({
  open,
  movement,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState(null);
  const [source, setSource] = useState("");
  const [warn, setWarn] = useState("");

  useEffect(() => {
    if (!open || !movement) return;

    const snap = movement.skipper || {};
    const fallback = {
      fullName: snap.fullName || "",
      documentType: snap.documentType || "DNI",
      documentNumber: snap.documentNumber || "",
      brevetCategory: snap.brevetCategory || "",
      phone: snap.phone || "",
      email: snap.email || "",
      address: snap.address || "",
    };
    setContact(fallback);
    setSource("snapshot");
    setWarn("");

    let cancelled = false;
    async function refresh() {
      const docType = String(snap.documentType || "DNI").trim() || "DNI";
      const docNumber = String(snap.documentNumber || "").trim();
      if (!docNumber) return;

      setLoading(true);
      try {
        let data;
        if (docType === "CC" && docNumber.includes("-")) {
          const [series, number] = docNumber.split("-");
          data = await findSeafarerByDocument("CC", "", series, number);
        } else {
          data = await findSeafarerByDocument(docType, docNumber);
        }
        if (cancelled) return;
        const sf = data?.seafarer;
        if (!sf) return;
        const ct = sf.contact && typeof sf.contact === "object" ? sf.contact : {};
        setContact({
          fullName: seafarerFullName(sf) || fallback.fullName,
          documentType: docType,
          documentNumber: docNumber,
          brevetCategory: fallback.brevetCategory,
          phone: String(ct.phone || "").trim(),
          email: String(ct.email || "").trim(),
          address: String(ct.address || "").trim(),
        });
        setSource("live");
      } catch {
        if (!cancelled) {
          setWarn(
            "No se pudo actualizar el contacto desde la base de náutas; se muestran los datos del movimiento."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();
    return () => {
      cancelled = true;
    };
  }, [open, movement]);

  if (!open || !movement) return null;

  const vesselName = movement.vesselSnapshot?.name || "—";
  const vesselReg = movement.vesselSnapshot?.nationalRegistryNumber || "—";

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Contacto del patrón</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            <p className="small text-muted mb-3">
              Buque: <strong>{vesselName}</strong> · Matrícula:{" "}
              <strong>{vesselReg}</strong>
            </p>

            {loading ? (
              <p className="text-muted small mb-3">Actualizando contacto…</p>
            ) : null}
            {warn ? (
              <div className="alert alert-warning py-2 small">{warn}</div>
            ) : null}
            {source === "live" && !loading ? (
              <p className="text-muted small mb-2">
                Datos actualizados desde la base de náutas.
              </p>
            ) : null}

            <dl className="row mb-0 small">
              <dt className="col-sm-4">Nombre</dt>
              <dd className="col-sm-8">{dash(contact?.fullName)}</dd>

              <dt className="col-sm-4">Documento</dt>
              <dd className="col-sm-8">
                {dash(contact?.documentType)} {dash(contact?.documentNumber)}
              </dd>

              <dt className="col-sm-4">Brevet</dt>
              <dd className="col-sm-8">
                {contact?.brevetCategory
                  ? `Categoría ${contact.brevetCategory}`
                  : "—"}
              </dd>

              <dt className="col-sm-4">Teléfono</dt>
              <dd className="col-sm-8">
                {contact?.phone ? (
                  <a href={`tel:${String(contact.phone).replace(/\s/g, "")}`}>
                    {contact.phone}
                  </a>
                ) : (
                  "—"
                )}
              </dd>

              <dt className="col-sm-4">Email</dt>
              <dd className="col-sm-8">
                {contact?.email ? (
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                ) : (
                  "—"
                )}
              </dd>

              <dt className="col-sm-4">Dirección</dt>
              <dd className="col-sm-8">{dash(contact?.address)}</dd>
            </dl>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
