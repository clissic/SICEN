import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { createVesselInspection } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { VesselUltramarCombobox } from "../components/VesselUltramarCombobox.jsx";
import {
  CIALA_PRIORITY_OPTIONS,
  URUGUAY_ARRIVAL_PORTS,
} from "../constants/inspectionFormOptions.js";
import { scrollPageToTop } from "../utils/scrollPageToTop.js";
import {
  currentExerciseYear,
  getActiveInspectionYear,
  subscribeActiveInspectionYear,
} from "../utils/inspectionExercise.js";

/**
 * Esta pantalla corresponde a la tarjeta "REGISTRO DE INGRESOS" del menú de
 * Inspecciones. Sólo registra el **arribo del buque** al puerto y la
 * prioridad CIALA con la que entró; la diligencia (fecha de inspección,
 * deficiencias, PDF) se completa después desde "REGISTRO DE INSPECCIONES"
 * editando el ingreso. Por eso siempre se persiste con
 * `inspectionPerformed: false`: el listado "Ingresos sin inspección" lo
 * recoge inmediatamente.
 */
const INITIAL_FORM = {
  vesselId: "",
  arrivalDate: "",
  arrivalPort: "",
  cialaPriority: "",
};

/**
 * Devuelve la fecha de hoy en formato `YYYY-MM-DD` (zona local), para poder
 * compararla contra el valor de un `<input type="date">` sin sufrir saltos
 * por huso horario.
 */
function todayDateInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CreateInspectionPage() {
  const [year, setYear] = useState(
    () => getActiveInspectionYear() ?? currentExerciseYear()
  );
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    return subscribeActiveInspectionYear((next) => {
      setYear(next ?? currentExerciseYear());
    });
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleVesselChange(vesselId, vesselDoc) {
    set("vesselId", vesselId || "");
    setSelectedVessel(vesselDoc || null);
  }

  const clientErr = useMemo(() => {
    if (!form.vesselId) return "Seleccione un buque de Ultramar.";
    if (!form.arrivalDate) return "Indique la fecha de ingreso.";
    if (!String(form.arrivalPort).trim()) {
      return "Seleccione el puerto de ingreso.";
    }
    return "";
  }, [form]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (clientErr) {
      setErr(clientErr);
      scrollPageToTop();
      return;
    }

    /* Si la fecha de ingreso es posterior a hoy, pedimos confirmación
       explícita: en general el ingreso se carga el día del arribo o
       después, así que una fecha a futuro suele ser un error de tipeo.
       Pero hay casos válidos (planificación de arribos anunciados), por
       eso permitimos seguir si el usuario confirma. */
    const today = todayDateInputValue();
    if (form.arrivalDate && form.arrivalDate > today) {
      const confirm = await Swal.fire({
        icon: "warning",
        title: "Fecha de ingreso a futuro",
        html:
          "La fecha de ingreso seleccionada es <strong>posterior al día " +
          "de hoy</strong>. Si continúa, el ingreso quedará registrado " +
          "con esa fecha futura.<br><br>¿Desea continuar de todas formas?",
        showCancelButton: true,
        confirmButtonText: "Sí, continuar",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        focusCancel: true,
      });
      if (!confirm.isConfirmed) return;
    }

    const payload = {
      vesselId: form.vesselId,
      arrivalDate: form.arrivalDate || null,
      arrivalPort: String(form.arrivalPort || "")
        .trim()
        .toUpperCase(),
      cialaPriority: String(form.cialaPriority || "").trim(),
      inspectionPerformed: false,
      inspectionDate: null,
      deficiencies: [],
    };

    setSubmitting(true);
    try {
      const data = await createVesselInspection(payload);
      const successMsg = data?.msg || "Ingreso registrado correctamente.";
      await Swal.fire({
        icon: "success",
        title: "Ingreso registrado",
        text: successMsg,
        confirmButtonText: "Aceptar",
      });
      setMsg(successMsg);
      setForm(INITIAL_FORM);
      setSelectedVessel(null);
      scrollPageToTop();
    } catch (ex) {
      const text =
        ex?.data?.msg || ex?.message || "No se pudo registrar el ingreso.";
      setErr(text);
      scrollPageToTop();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Registrar ingreso</h3>
            <p className="text-muted small mb-0 mt-1">
              Ejercicio activo:{" "}
              <span className="fw-semibold text-body">{year}</span>. Sólo se
              registra el arribo del buque; la inspección se completa después
              desde «Registro de inspecciones».
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos/inspecciones"
          >
            Inspecciones
          </Link>
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            {msg ? (
              <div className="alert alert-success" role="status">
                {msg}
              </div>
            ) : null}
            {err ? (
              <div className="alert alert-danger" role="alert">
                {err}
              </div>
            ) : null}

            <form onSubmit={onSubmit} noValidate>
              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="inspection-vessel" className="form-label">
                    Buque <span className="text-danger">*</span>
                  </label>
                  <VesselUltramarCombobox
                    id="inspection-vessel"
                    value={form.vesselId}
                    onChange={handleVesselChange}
                    required
                  />
                  <div className="form-text">
                    Si no ve el buque en el desplegable, debe cargarlo
                    manualmente desde la sección{" "}
                    <Link
                      to="/base-buques"
                      className="text-decoration-underline fw-semibold"
                    >
                      GESTIÓN DE BUQUES
                    </Link>
                    .
                  </div>
                  {selectedVessel ? (
                    <div className="text-muted small mt-2">
                      <span className="fw-semibold">Bandera:</span>{" "}
                      {selectedVessel.flagState || "—"}
                      {selectedVessel.portOfRegistry ? (
                        <>
                          {" · "}
                          <span className="fw-semibold">
                            Puerto de matrícula:
                          </span>{" "}
                          {selectedVessel.portOfRegistry}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="col-md-6">
                  <label
                    htmlFor="inspection-arrival-date"
                    className="form-label"
                  >
                    Fecha de ingreso <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="inspection-arrival-date"
                    className="form-control"
                    value={form.arrivalDate}
                    onChange={(e) => set("arrivalDate", e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label
                    htmlFor="inspection-arrival-port"
                    className="form-label"
                  >
                    Puerto de ingreso <span className="text-danger">*</span>
                  </label>
                  <select
                    id="inspection-arrival-port"
                    className="form-select"
                    value={form.arrivalPort}
                    onChange={(e) => set("arrivalPort", e.target.value)}
                    required
                  >
                    <option value="">Seleccionar puerto…</option>
                    {URUGUAY_ARRIVAL_PORTS.map((port) => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label
                    htmlFor="inspection-ciala-priority"
                    className="form-label"
                  >
                    Prioridad CIALA
                  </label>
                  <select
                    id="inspection-ciala-priority"
                    className="form-select"
                    value={form.cialaPriority}
                    onChange={(e) => set("cialaPriority", e.target.value)}
                  >
                    {CIALA_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">
                    Las opciones reconocidas para las estadísticas son
                    «Prioridad 1» y «Prioridad 2»; el resto se agrupa como
                    «Sin prioridad».
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
                <Link
                  to="/estado-rector-puertos/inspecciones"
                  className="btn btn-outline-secondary"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? "Registrando…" : "Registrar ingreso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
