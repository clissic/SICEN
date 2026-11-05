import { useEffect, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import { ModalPortal, SICEN_MODAL_Z_INDEX } from "../ModalPortal.jsx";
import {
  PATROL_FUEL_OPTIONS,
  PATROL_STATUS_OPTIONS,
  areaLabel,
  buildFulfillmentPayload,
  emptyFulfillmentForm,
  fulfillmentFromPatrol,
  validateFulfillmentForm,
} from "../../constants/borderPatrolFulfillment.js";
import { formatDisplay } from "./borderPatrolCalendarUtils.js";

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  disabled,
}) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className="form-control"
        min={min}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function BorderPatrolEditModal({
  patrol,
  open,
  saving,
  err,
  onClose,
  onSave,
}) {
  const [status, setStatus] = useState("planned");
  const [notes, setNotes] = useState("");
  const [form, setForm] = useState(() => emptyFulfillmentForm());
  const [localErr, setLocalErr] = useState("");

  useEffect(() => {
    if (!open || !patrol) return;
    setStatus(patrol.status || "planned");
    setNotes(patrol.observations || "");
    setForm(fulfillmentFromPatrol(patrol));
    setLocalErr("");
  }, [open, patrol]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  if (!open || !patrol) return null;

  function patchForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function addIncident() {
    setForm((prev) => ({
      ...prev,
      incidents: [...(prev.incidents || []), { detail: "" }],
    }));
  }

  function updateIncident(index, detail) {
    setForm((prev) => {
      const incidents = [...(prev.incidents || [])];
      incidents[index] = { detail };
      return { ...prev, incidents };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalErr("");
    if (status === "fulfilled") {
      const msg = validateFulfillmentForm(form);
      if (msg) {
        setLocalErr(msg);
        return;
      }
    }
    const payload = {
      status,
      observations: notes.trim(),
    };
    if (status === "fulfilled") {
      payload.fulfillment = buildFulfillmentPayload(form);
    }
    await onSave(payload);
  }

  const showFulfillment = status === "fulfilled";
  const alertMsg = localErr || err;

  return (
    <ModalPortal>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="border-patrol-edit-title"
        style={{ background: "rgba(0,0,0,0.45)", zIndex: SICEN_MODAL_Z_INDEX }}
        onClick={() => {
          if (!saving) onClose();
        }}
      >
        <div
          className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
          onClick={(event) => event.stopPropagation()}
        >
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title" id="border-patrol-edit-title">
                Modificar patrulla
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
                disabled={saving}
              />
            </div>
            <div className="modal-body">
              <p className="small text-muted mb-3">
                {patrol.unitAcronym} · Nro. {patrol.number ?? "—"} ·{" "}
                {patrol.detail || "Sin detalle"}
                {patrol.date ? ` · ${formatDisplay(patrol.date)}` : ""}
              </p>
              <ErrorAlert
                message={alertMsg}
                className="alert alert-danger py-2 small"
              />

              <div className="mb-3">
                <div className="form-label">Estado</div>
                <div className="empre-patrol-status-btns">
                  {PATROL_STATUS_OPTIONS.map((opt) => {
                    const active = status === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`btn ${active ? opt.btnClass : `btn-outline-${opt.btnClass.replace("btn-", "")}`}`}
                        disabled={saving}
                        aria-pressed={active}
                        onClick={() => setStatus(opt.id)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {showFulfillment ? (
                <div className="border-top pt-3 mb-3">
                  <h6 className="mb-3">Datos de la patrulla cumplida</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      {patrol.kind === "terrestre" ? (
                        <NumberField
                          id="bp-distance-km"
                          label="Kilómetros patrullados"
                          value={form.distanceKm}
                          min={0}
                          step={0.1}
                          disabled={saving}
                          onChange={(value) => patchForm({ distanceKm: value })}
                        />
                      ) : (
                        <NumberField
                          id="bp-distance-nm"
                          label="Millas náuticas patrulladas"
                          value={form.distanceNm}
                          min={0}
                          step={0.1}
                          disabled={saving}
                          onChange={(value) => patchForm({ distanceNm: value })}
                        />
                      )}
                    </div>
                    <div className="col-md-4">
                      <NumberField
                        id="bp-breakdowns"
                        label="Averías"
                        value={form.breakdowns}
                        min={0}
                        step={1}
                        disabled={saving}
                        onChange={(value) => patchForm({ breakdowns: value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <NumberField
                        id="bp-personnel"
                        label="Personal involucrado"
                        value={form.personnel}
                        min={1}
                        step={1}
                        disabled={saving}
                        onChange={(value) => patchForm({ personnel: value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <div className="form-label">Área</div>
                      <p className="form-control-plaintext fw-semibold mb-0 py-1">
                        {areaLabel(patrol.area)}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="bp-vehicle">
                        Medio utilizado
                      </label>
                      <input
                        id="bp-vehicle"
                        type="text"
                        className="form-control"
                        placeholder="Matrícula"
                        maxLength={80}
                        value={form.vehicle}
                        disabled={saving}
                        required
                        onChange={(event) =>
                          patchForm({ vehicle: event.target.value })
                        }
                      />
                    </div>
                    <div className="col-12">
                      <div className="form-label mb-2">
                        Embarcaciones controladas
                      </div>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <NumberField
                            id="bp-registered"
                            label="Embarcaciones registradas"
                            value={form.registeredCraft}
                            min={0}
                            step={1}
                            disabled={saving}
                            onChange={(value) =>
                              patchForm({ registeredCraft: value })
                            }
                          />
                        </div>
                        <div className="col-md-4">
                          <NumberField
                            id="bp-persons"
                            label="Personas identificadas"
                            value={form.identifiedPersons}
                            min={0}
                            step={1}
                            disabled={saving}
                            onChange={(value) =>
                              patchForm({ identifiedPersons: value })
                            }
                          />
                        </div>
                        <div className="col-md-4">
                          <NumberField
                            id="bp-sports"
                            label="Emb. deportivas"
                            value={form.controlledSports}
                            min={0}
                            step={1}
                            disabled={saving}
                            onChange={(value) =>
                              patchForm({ controlledSports: value })
                            }
                          />
                        </div>
                        <div className="col-md-4">
                          <NumberField
                            id="bp-merchant"
                            label="Buques mercantes"
                            value={form.controlledMerchant}
                            min={0}
                            step={1}
                            disabled={saving}
                            onChange={(value) =>
                              patchForm({ controlledMerchant: value })
                            }
                          />
                        </div>
                        <div className="col-md-4">
                          <NumberField
                            id="bp-fishing"
                            label="Pesqueros"
                            value={form.controlledFishing}
                            min={0}
                            step={1}
                            disabled={saving}
                            onChange={(value) =>
                              patchForm({ controlledFishing: value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-label mb-2">
                        Consumo de combustible
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="bp-fuel-type">
                            Tipo
                          </label>
                          <select
                            id="bp-fuel-type"
                            className="form-select"
                            value={form.fuelType}
                            disabled={saving}
                            required
                            onChange={(event) =>
                              patchForm({ fuelType: event.target.value })
                            }
                          >
                            <option value="">Elegí el tipo…</option>
                            {PATROL_FUEL_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <NumberField
                            id="bp-fuel-liters"
                            label="Cantidad (lts.)"
                            value={form.fuelLiters}
                            min={0}
                            step={0.1}
                            disabled={saving}
                            onChange={(value) =>
                              patchForm({ fuelLiters: value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <div className="form-label mb-0">Incidentes</div>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          disabled={saving}
                          onClick={addIncident}
                        >
                          Declarar incidente
                        </button>
                      </div>
                      {(form.incidents || []).length === 0 ? (
                        <p className="text-muted small mb-0">
                          Sin incidentes declarados.
                        </p>
                      ) : (
                        (form.incidents || []).map((item, index) => (
                          <div key={`inc-${index}`} className="mb-2">
                            <label
                              className="form-label small"
                              htmlFor={`bp-incident-${index}`}
                            >
                              Incidente {index + 1}
                            </label>
                            <textarea
                              id={`bp-incident-${index}`}
                              className="form-control"
                              rows={2}
                              placeholder="Detalle del incidente..."
                              value={item.detail}
                              disabled={saving}
                              onChange={(event) =>
                                updateIncident(index, event.target.value)
                              }
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mb-0">
                <label className="form-label" htmlFor="border-patrol-edit-notes">
                  Observaciones
                </label>
                <textarea
                  id="border-patrol-edit-notes"
                  className="form-control"
                  rows={3}
                  maxLength={500}
                  value={notes}
                  placeholder="Opcional"
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
