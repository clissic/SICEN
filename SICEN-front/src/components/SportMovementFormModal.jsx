import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "./ErrorAlert.jsx";
import {
  findSeafarerByDocument,
  listUnitsRegistered,
} from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

function emptyPassenger() {
  return { fullName: "", documentNumber: "" };
}

function emptyInformedUnit() {
  return "";
}

function portsOfUnit(units, acronym) {
  const ac = String(acronym || "").trim().toUpperCase();
  if (!ac) return [];
  const unit = units.find(
    (u) => String(u.acronym || "").trim().toUpperCase() === ac
  );
  if (!unit || !Array.isArray(unit.portsUnderJurisdiction)) return [];
  return unit.portsUnderJurisdiction
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
}

function seafarerHasSportBrevet(seafarer) {
  const held = Array.isArray(seafarer?.heldLicenses)
    ? seafarer.heldLicenses
    : [];
  for (const hl of held) {
    const code =
      hl?.licenseId && typeof hl.licenseId === "object"
        ? String(hl.licenseId.code || "")
        : "";
    if (code.toUpperCase() === "UY_BD") return true;
  }
  return false;
}

function seafarerFullName(seafarer) {
  const pd = seafarer?.personalData || {};
  const last = String(pd.lastName || "").trim();
  const first = String(pd.firstName || "").trim();
  if (last && first) return `${last}, ${first}`;
  return last || first || "";
}

function etaToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Modal Bootstrap para alta/edición de un movimiento deportivo.
 */
export function SportMovementFormModal({
  open,
  onClose,
  vessel,
  initialMovement = null,
  onSubmit,
  saving = false,
}) {
  const { user } = useAuth();
  const isEdit = Boolean(initialMovement?._id);
  const originUnitAcronym = String(user?.unit || "").trim().toUpperCase();
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [departurePort, setDeparturePort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [eta, setEta] = useState("");
  const [destinationUnit, setDestinationUnit] = useState("");
  const [informedUnits, setInformedUnits] = useState([emptyInformedUnit()]);
  const [units, setUnits] = useState([]);
  const [unitsErr, setUnitsErr] = useState("");
  const [skipperCi, setSkipperCi] = useState("");
  const [skipper, setSkipper] = useState(null);
  const [skipperErr, setSkipperErr] = useState("");
  const [skipperLoading, setSkipperLoading] = useState(false);
  const [passengers, setPassengers] = useState([emptyPassenger()]);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listUnitsRegistered()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.units)
          ? data.units
          : Array.isArray(data?.payload)
            ? data.payload
            : Array.isArray(data)
              ? data
              : [];
        setUnits(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setUnitsErr(e?.message || "No se pudieron cargar las unidades.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialMovement) {
      setDepartureDate(String(initialMovement.departureDate || "").slice(0, 10));
      setDepartureTime(String(initialMovement.departureTime || ""));
      setDeparturePort(String(initialMovement.departurePort || ""));
      setDestinationPort(String(initialMovement.destinationPort || ""));
      setEta(etaToLocalInput(initialMovement.eta));
      setDestinationUnit(String(initialMovement.destinationUnit || ""));
      const transitUnits = Array.isArray(initialMovement.informedUnits)
        ? initialMovement.informedUnits.map((value) => String(value || ""))
        : [];
      setInformedUnits(
        transitUnits.length ? transitUnits : [emptyInformedUnit()]
      );
      setSkipperCi(String(initialMovement.skipper?.documentNumber || ""));
      setSkipper(
        initialMovement.skipper?.fullName
          ? {
              fullName: initialMovement.skipper.fullName,
              documentNumber: initialMovement.skipper.documentNumber,
              brevetCategory: initialMovement.skipper.brevetCategory,
            }
          : null
      );
      const pax = Array.isArray(initialMovement.passengers)
        ? initialMovement.passengers.map((p) => ({
            fullName: p.fullName || "",
            documentNumber: p.documentNumber || "",
          }))
        : [];
      setPassengers(pax.length ? pax : [emptyPassenger()]);
    } else {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      setDepartureDate(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      );
      setDepartureTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
      setDeparturePort("");
      setDestinationPort("");
      setEta("");
      setDestinationUnit("");
      setInformedUnits([emptyInformedUnit()]);
      setSkipperCi("");
      setSkipper(null);
      setPassengers([emptyPassenger()]);
    }
    setSkipperErr("");
    setFormErr("");
  }, [open, initialMovement]);

  async function searchSkipper() {
    setSkipperErr("");
    setSkipper(null);
    const ci = String(skipperCi || "").replace(/\D/g, "");
    if (!ci) {
      setSkipperErr("Ingrese la cédula del patrón.");
      return;
    }
    setSkipperLoading(true);
    try {
      const data = await findSeafarerByDocument("DNI", ci);
      const seafarer = data?.seafarer;
      if (!seafarer) {
        setSkipperErr("No se encontró un náuta con esa cédula.");
        return;
      }
      if (!seafarerHasSportBrevet(seafarer)) {
        setSkipperErr(
          "El náuta encontrado no tiene Brevet Deportivo registrado."
        );
        return;
      }
      setSkipper({
        fullName: seafarerFullName(seafarer),
        documentNumber: ci,
        seafarer,
      });
    } catch (e) {
      setSkipperErr(e?.message || "No se pudo buscar al patrón.");
    } finally {
      setSkipperLoading(false);
    }
  }

  function updatePassenger(idx, field, value) {
    setPassengers((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  function addPassengerRow() {
    setPassengers((prev) => [...prev, emptyPassenger()]);
  }

  function removePassengerRow(idx) {
    setPassengers((prev) => {
      if (prev.length <= 1) return [emptyPassenger()];
      return prev.filter((_, i) => i !== idx);
    });
  }

  function updateInformedUnit(idx, value) {
    setInformedUnits((prev) =>
      prev.map((unit, i) => (i === idx ? value : unit))
    );
  }

  function addInformedUnitRow() {
    setInformedUnits((prev) => [...prev, emptyInformedUnit()]);
  }

  function removeInformedUnitRow(idx) {
    setInformedUnits((prev) => {
      if (prev.length <= 1) return [emptyInformedUnit()];
      return prev.filter((_, i) => i !== idx);
    });
  }

  const departurePorts = useMemo(
    () => portsOfUnit(units, originUnitAcronym),
    [units, originUnitAcronym]
  );

  const destinationPorts = useMemo(
    () => portsOfUnit(units, destinationUnit),
    [units, destinationUnit]
  );

  function handleDestinationUnitChange(value) {
    setDestinationUnit(value);
    setDestinationPort("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErr("");
    if (!vessel && !initialMovement?.vesselId) {
      setFormErr("No hay buque seleccionado.");
      return;
    }
    if (!departureDate || !departureTime) {
      setFormErr("Complete fecha y hora de despacho.");
      return;
    }
    if (!departurePort.trim() || !destinationPort.trim()) {
      setFormErr("Complete puerto de despacho y destino.");
      return;
    }
    if (!eta) {
      setFormErr("Indique la ETA.");
      return;
    }
    if (!destinationUnit) {
      setFormErr("Seleccione la prefectura de destino.");
      return;
    }
    const selectedInformedUnits = informedUnits.filter(Boolean);
    if (new Set(selectedInformedUnits).size !== selectedInformedUnits.length) {
      setFormErr("No repita prefecturas en el tránsito.");
      return;
    }
    if (selectedInformedUnits.includes(destinationUnit)) {
      setFormErr(
        "La prefectura de destino no puede repetirse entre las prefecturas de tránsito."
      );
      return;
    }
    if (!skipper) {
      setFormErr("Busque y confirme el patrón con brevet deportivo.");
      return;
    }

    const payload = {
      vesselId: vessel?._id || vessel?.id || initialMovement?.vesselId,
      departureDate,
      departureTime,
      departurePort: departurePort.trim(),
      destinationPort: destinationPort.trim(),
      eta: new Date(eta).toISOString(),
      destinationUnit,
      informedUnits: selectedInformedUnits,
      skipper: {
        documentType: "DNI",
        documentNumber: skipper.documentNumber || skipperCi,
      },
      passengers: passengers.filter(
        (p) => p.fullName.trim() || p.documentNumber.trim()
      ),
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setFormErr(err?.message || "No se pudo guardar el movimiento.");
    }
  }

  if (!open) return null;

  const vesselName =
    vessel?.name ||
    vessel?.generalInfo?.name ||
    initialMovement?.vesselSnapshot?.name ||
    "—";
  const vesselReg =
    vessel?.nationalRegistryNumber ||
    vessel?.identification?.nationalRegistryNumber ||
    initialMovement?.vesselSnapshot?.nationalRegistryNumber ||
    "—";

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{
        background: "rgba(0,0,0,0.45)",
        overflowY: "auto",
      }}
    >
      <div className="modal-dialog modal-lg my-3">
        <div
          className="modal-content"
          style={{ maxHeight: "calc(100dvh - 2rem)", overflow: "hidden" }}
        >
          <form
            onSubmit={handleSubmit}
            className="d-flex flex-column"
            style={{ minHeight: 0, maxHeight: "calc(100dvh - 2rem)" }}
          >
            <div className="modal-header">
              <h5 className="modal-title">
                {isEdit ? "Modificar movimiento" : "Registrar movimiento"}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
                disabled={saving}
              />
            </div>
            <div
              className="modal-body"
              style={{
                minHeight: 0,
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
            >
              <p className="small text-muted mb-3">
                Buque: <strong>{vesselName}</strong> · Matrícula:{" "}
                <strong>{vesselReg}</strong>
              </p>

              <ErrorAlert message={formErr} />

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Hora de ingreso del movimiento</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">ETA</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    required
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Prefectura de destino</label>
                  <select
                    className="form-select"
                    required
                    value={destinationUnit}
                    onChange={(e) =>
                      handleDestinationUnitChange(e.target.value)
                    }
                    disabled={saving}
                  >
                    <option value="">Seleccione…</option>
                    {units.map((u) => {
                      const acr = String(u.acronym || "").toUpperCase();
                      return (
                        <option key={acr} value={acr}>
                          {acr}
                          {u.name ? ` — ${u.name}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Puerto despacho</label>
                  <select
                    className="form-select"
                    required
                    value={departurePort}
                    onChange={(e) => setDeparturePort(e.target.value)}
                    disabled={saving || departurePorts.length === 0}
                  >
                    <option value="">
                      {departurePorts.length === 0
                        ? "Sin puertos en su unidad"
                        : "Seleccione…"}
                    </option>
                    {departurePorts.map((port) => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                    {departurePort &&
                    !departurePorts.includes(departurePort) ? (
                      <option value={departurePort}>{departurePort}</option>
                    ) : null}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Puerto destino</label>
                  <select
                    className="form-select"
                    required
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    disabled={
                      saving ||
                      !destinationUnit ||
                      destinationPorts.length === 0
                    }
                  >
                    <option value="">
                      {!destinationUnit
                        ? "Elija primero la prefectura de destino"
                        : destinationPorts.length === 0
                          ? "Sin puertos en esa unidad"
                          : "Seleccione…"}
                    </option>
                    {destinationPorts.map((port) => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                    {destinationPort &&
                    !destinationPorts.includes(destinationPort) ? (
                      <option value={destinationPort}>
                        {destinationPort}
                      </option>
                    ) : null}
                  </select>
                </div>
              </div>

              <hr className="my-3" />
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0">Prefecturas a informar</h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={addInformedUnitRow}
                  disabled={saving}
                >
                  Agregar línea
                </button>
              </div>

              <div className="form-text mb-2">
                Agregue las prefecturas de tránsito que deban ser informadas.
                Puede dejar la línea vacía si no corresponde.
              </div>
              {informedUnits.map((unitValue, idx) => (
                <div className="row g-2 mb-2" key={idx}>
                  <div className="col-11">
                    <select
                      className="form-select"
                      value={unitValue}
                      onChange={(e) =>
                        updateInformedUnit(idx, e.target.value)
                      }
                      disabled={saving}
                      aria-label={`Prefectura de tránsito ${idx + 1}`}
                    >
                      <option value="">Seleccione prefectura de tránsito…</option>
                      {units.map((u) => {
                        const acr = String(u.acronym || "").toUpperCase();
                        const alreadySelected =
                          informedUnits.includes(acr) && unitValue !== acr;
                        return (
                          <option
                            key={acr}
                            value={acr}
                            disabled={
                              acr === destinationUnit || alreadySelected
                            }
                          >
                            {acr}
                            {u.name ? ` — ${u.name}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="col-1 d-flex">
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm w-100"
                      data-sicen-popover="Quitar prefectura"
                      aria-label="Quitar prefectura"
                      onClick={() => removeInformedUnitRow(idx)}
                      disabled={saving}
                    >
                      <i className="bi bi-x-lg" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
              {unitsErr ? (
                <div className="form-text text-danger">{unitsErr}</div>
              ) : null}

              <hr className="my-3" />
              <h6 className="mb-2">Patrón</h6>
              <div className="row g-2 align-items-end">
                <div className="col-md-8">
                  <label className="form-label">Cédula (CI)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={skipperCi}
                    onChange={(e) => {
                      setSkipperCi(e.target.value);
                      setSkipper(null);
                      setSkipperErr("");
                    }}
                    disabled={saving || skipperLoading}
                    inputMode="numeric"
                  />
                </div>
                <div className="col-md-4">
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100"
                    onClick={searchSkipper}
                    disabled={saving || skipperLoading}
                  >
                    {skipperLoading ? "Buscando…" : "Buscar patrón"}
                  </button>
                </div>
              </div>
              {skipperErr ? (
                <div className="text-danger small mt-2">{skipperErr}</div>
              ) : null}
              {skipper ? (
                <div className="alert alert-success py-2 mt-2 mb-0 small">
                  {skipper.fullName}
                  {skipper.brevetCategory
                    ? ` · Brevet ${skipper.brevetCategory}`
                    : " · Brevet Deportivo OK"}
                </div>
              ) : null}

              <hr className="my-3" />
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0">Personas a bordo</h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={addPassengerRow}
                  disabled={saving}
                >
                  Agregar línea
                </button>
              </div>
              {passengers.map((row, idx) => (
                <div className="row g-2 mb-2" key={idx}>
                  <div className="col-md-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nombre"
                      value={row.fullName}
                      onChange={(e) =>
                        updatePassenger(idx, "fullName", e.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="col-md-5">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="CI"
                      value={row.documentNumber}
                      onChange={(e) =>
                        updatePassenger(idx, "documentNumber", e.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="col-md-1 d-flex">
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm w-100"
                      data-sicen-popover="Quitar línea"
                      onClick={() => removePassengerRow(idx)}
                      disabled={saving}
                    >
                      <i className="bi bi-x-lg" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
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
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar movimiento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
