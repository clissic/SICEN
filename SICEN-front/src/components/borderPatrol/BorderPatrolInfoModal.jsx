import { useEffect } from "react";
import { ModalPortal, SICEN_MODAL_Z_INDEX } from "../ModalPortal.jsx";
import {
  areaLabel,
  fuelLabel,
  statusLabel,
} from "../../constants/borderPatrolFulfillment.js";
import { formatDisplay } from "./borderPatrolCalendarUtils.js";

const KIND_NAME = {
  fluvial: "Fluvial",
  terrestre: "Terrestre",
};

function Row({ label, value }) {
  return (
    <div className="col-sm-6 mb-2">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold text-break">{value ?? "—"}</div>
    </div>
  );
}

export function BorderPatrolInfoModal({ patrol, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !patrol) return null;

  const f = patrol.fulfillment;
  const incidents = Array.isArray(f?.incidents) ? f.incidents : [];

  return (
    <ModalPortal>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="border-patrol-info-title"
        style={{ background: "rgba(0,0,0,0.45)", zIndex: SICEN_MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="border-patrol-info-title">
                Información de la patrulla
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              <div className="row">
                <Row label="Unidad" value={patrol.unitAcronym} />
                <Row label="Fecha" value={formatDisplay(patrol.date)} />
                <Row label="Nro." value={patrol.number ?? "—"} />
                <Row
                  label="Tipo"
                  value={KIND_NAME[patrol.kind] || patrol.kind}
                />
                <Row label="Detalle" value={patrol.detail || "Sin detalle"} />
                <Row label="Área" value={areaLabel(patrol.area || f?.area)} />
                <Row label="Estado" value={statusLabel(patrol.status)} />
                <div className="col-12 mb-2">
                  <div className="text-muted small">Observaciones</div>
                  <div className="fw-semibold text-break">
                    {patrol.observations?.trim()
                      ? patrol.observations
                      : "—"}
                  </div>
                </div>
              </div>

              {f ? (
                <div className="border-top pt-3 mt-2">
                  <h6 className="mb-3">Datos de cumplimiento</h6>
                  <div className="row">
                    <Row label="Medio utilizado" value={f.vehicle} />
                    <Row
                      label="Embarcaciones registradas"
                      value={f.registeredCraft}
                    />
                    <Row
                      label="Emb. deportivas"
                      value={f.controlledCraft?.sports}
                    />
                    <Row
                      label="Buques mercantes"
                      value={f.controlledCraft?.merchant}
                    />
                    <Row
                      label="Pesqueros"
                      value={f.controlledCraft?.fishing}
                    />
                    <Row
                      label="Personas identificadas"
                      value={f.identifiedPersons}
                    />
                    <Row
                      label="Combustible"
                      value={`${fuelLabel(f.fuel?.type)} · ${f.fuel?.liters ?? 0} lts.`}
                    />
                    <Row
                      label="Incidentes declarados"
                      value={f.incidentCount ?? incidents.length}
                    />
                    <Row
                      label={
                        patrol.kind === "terrestre"
                          ? "Kilómetros patrullados"
                          : "Millas náuticas patrulladas"
                      }
                      value={
                        patrol.kind === "terrestre"
                          ? f.distanceKm ?? 0
                          : f.distanceNm ?? 0
                      }
                    />
                    <Row label="Averías" value={f.breakdowns} />
                    <Row label="Personal involucrado" value={f.personnel} />
                  </div>
                  {incidents.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-muted small mb-1">Detalle de incidentes</div>
                      <ul className="mb-0 ps-3">
                        {incidents.map((item, index) => (
                          <li key={`info-inc-${index}`} className="mb-1">
                            {item.detail || "—"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted small mb-0 mt-2">
                  Todavía no hay datos de cumplimiento cargados.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
