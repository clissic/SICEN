import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { userUpdate } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { OserpCandidateCombobox } from "../components/OserpCandidateCombobox.jsx";
import { InspectorCombobox } from "../components/InspectorCombobox.jsx";
import {
  mergeUserStatesForForm,
  userStatesForApi,
} from "../constants/userStates.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scrollPageToTop } from "../utils/scrollPageToTop.js";

const OSERP_STATE_NAME = "Oficial Supervisor por el Estado Rector de Puertos";

/**
 * Etiqueta humana "Rango Apellido, Nombre" para los mensajes de confirmación.
 */
function userLabel(u) {
  if (!u || typeof u !== "object") return "";
  const fn = String(u.first_name || "").trim();
  const ln = String(u.last_name || "").trim();
  const rank = String(u.rank || "").trim();
  const full = `${ln}${fn ? `, ${fn}` : ""}`.trim();
  if (rank && full) return `${rank} ${full}`;
  return full || String(u.email || "").trim();
}

/**
 * Tarjeta "ALTAS / BAJAS" del módulo OSERP: habilita o deshabilita usuarios
 * como Oficial Supervisor por el Estado Rector de Puertos.
 *
 * - El desplegable de **alta** sólo lista usuarios que todavía no son OSERP
 *   activos (`OserpCandidateCombobox`).
 * - El desplegable de **baja** sólo lista a los que ya son OSERP activos
 *   (`InspectorCombobox`, el mismo que usa el módulo de inspecciones).
 *
 * En ambos casos se persiste el array `states` del usuario tocando sólo la
 * habilitación OSERP. Tras cada operación se remontan ambos comboboxes (vía
 * `refreshKey`) para que las listas reflejen el cambio al instante.
 */
export function OserpAltaPage() {
  const { user: currentUser, refresh } = useAuth();

  const [altaEmail, setAltaEmail] = useState("");
  const [altaUser, setAltaUser] = useState(null);
  const [altaSubmitting, setAltaSubmitting] = useState(false);

  const [bajaEmail, setBajaEmail] = useState("");
  const [bajaUser, setBajaUser] = useState(null);
  const [bajaSubmitting, setBajaSubmitting] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  /* Remonta ambos comboboxes para que vuelvan a pedir la lista de usuarios y
     el cambio (alta o baja) se refleje en las opciones disponibles. */
  const [refreshKey, setRefreshKey] = useState(0);

  function handleAltaSelect(email, userDoc) {
    setAltaEmail(email || "");
    setAltaUser(userDoc || null);
    setMsg("");
    setErr("");
  }

  function handleBajaSelect(email, userDoc) {
    setBajaEmail(email || "");
    setBajaUser(userDoc || null);
    setMsg("");
    setErr("");
  }

  const canAlta = useMemo(
    () => !!altaEmail && !!altaUser?._id,
    [altaEmail, altaUser]
  );
  const canBaja = useMemo(
    () => !!bajaEmail && !!bajaUser?._id,
    [bajaEmail, bajaUser]
  );

  /** Persiste el estado OSERP del usuario en `isActive`. */
  async function persistOserpState(userDoc, isActive) {
    const states = mergeUserStatesForForm(userDoc.states).map((s) =>
      s.name === OSERP_STATE_NAME ? { ...s, isActive } : s
    );
    await userUpdate(userDoc._id, {
      first_name: userDoc.first_name,
      last_name: userDoc.last_name,
      rank: userDoc.rank,
      states: userStatesForApi(states),
    });
    /* Si el usuario se modificó a sí mismo, refrescamos la sesión para que
       sus habilitaciones queden actualizadas en el acto. */
    if (
      String(currentUser?.email || "").toLowerCase() ===
      String(userDoc.email || "").toLowerCase()
    ) {
      await refresh();
    }
  }

  async function onConfirmAlta() {
    if (!canAlta) {
      setErr("Seleccione un usuario para darle el alta.");
      return;
    }
    setErr("");
    setMsg("");

    const label = userLabel(altaUser);
    const confirm = await Swal.fire({
      icon: "question",
      title: "Confirmar alta como OSERP",
      html:
        `Se habilitará a <strong>${label}</strong> como Oficial Supervisor ` +
        "por el Estado Rector de Puertos.<br><br>¿Desea continuar?",
      showCancelButton: true,
      confirmButtonText: "Sí, dar de alta",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });
    if (!confirm.isConfirmed) return;

    setAltaSubmitting(true);
    try {
      await persistOserpState(altaUser, true);
      const successMsg = `${label} fue dado de alta como Oficial Supervisor por el Estado Rector de Puertos.`;
      await Swal.fire({
        icon: "success",
        title: "Alta registrada",
        text: successMsg,
        confirmButtonText: "Aceptar",
      });
      setMsg(successMsg);
      setAltaEmail("");
      setAltaUser(null);
      setRefreshKey((k) => k + 1);
      scrollPageToTop();
    } catch (ex) {
      const text =
        ex?.data?.msg || ex?.message || "No se pudo registrar el alta.";
      setErr(text);
      scrollPageToTop();
    } finally {
      setAltaSubmitting(false);
    }
  }

  async function onConfirmBaja() {
    if (!canBaja) {
      setErr("Seleccione un usuario para darle la baja.");
      return;
    }
    setErr("");
    setMsg("");

    const label = userLabel(bajaUser);
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Confirmar baja como OSERP",
      html:
        `Se quitará a <strong>${label}</strong> la habilitación de Oficial ` +
        "Supervisor por el Estado Rector de Puertos.<br><br>¿Desea continuar?",
      showCancelButton: true,
      confirmButtonText: "Sí, dar de baja",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });
    if (!confirm.isConfirmed) return;

    setBajaSubmitting(true);
    try {
      await persistOserpState(bajaUser, false);
      const successMsg = `${label} fue dado de baja como Oficial Supervisor por el Estado Rector de Puertos.`;
      await Swal.fire({
        icon: "success",
        title: "Baja registrada",
        text: successMsg,
        confirmButtonText: "Aceptar",
      });
      setMsg(successMsg);
      setBajaEmail("");
      setBajaUser(null);
      setRefreshKey((k) => k + 1);
      scrollPageToTop();
    } catch (ex) {
      const text =
        ex?.data?.msg || ex?.message || "No se pudo registrar la baja.";
      setErr(text);
      scrollPageToTop();
    } finally {
      setBajaSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Altas / Bajas de OSERP</h3>
            <p className="text-muted small mb-0 mt-1">
              Dar de alta o de baja usuarios como Oficial Supervisor por el
              Estado Rector de Puertos.
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos/oserp"
          >
            OSERP
          </Link>
        </div>

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

        <div className="row g-3 align-items-stretch">
          <div className="col-12 col-lg-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body p-4">
                <h5 className="card-title d-flex align-items-center gap-2">
                  <i className="bi bi-person-plus text-success" aria-hidden />
                  Alta
                </h5>
                <p className="text-muted small">
                  Habilitar a un usuario como OSERP.
                </p>

                <label htmlFor="oserp-candidate" className="form-label">
                  Usuario a habilitar <span className="text-danger">*</span>
                </label>
                <OserpCandidateCombobox
                  key={`alta-${refreshKey}`}
                  id="oserp-candidate"
                  value={altaEmail}
                  onChange={handleAltaSelect}
                  required
                />
                <div className="form-text">
                  Sólo se muestran los usuarios que todavía no están habilitados
                  como OSERP.
                </div>

                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onConfirmAlta}
                    disabled={!canAlta || altaSubmitting}
                    aria-busy={altaSubmitting}
                  >
                    {altaSubmitting
                      ? "Dando de alta…"
                      : "Confirmar alta como OSERP"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body p-4">
                <h5 className="card-title d-flex align-items-center gap-2">
                  <i className="bi bi-person-dash text-danger" aria-hidden />
                  Baja
                </h5>
                <p className="text-muted small">
                  Quitar la habilitación OSERP a un usuario.
                </p>

                <label htmlFor="oserp-active" className="form-label">
                  Usuario a dar de baja <span className="text-danger">*</span>
                </label>
                <InspectorCombobox
                  key={`baja-${refreshKey}`}
                  id="oserp-active"
                  value={bajaEmail}
                  onChange={handleBajaSelect}
                  placeholder="Seleccionar usuario OSERP…"
                  required
                />
                <div className="form-text">
                  Sólo se muestran los usuarios que actualmente están
                  habilitados como OSERP.
                </div>

                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={onConfirmBaja}
                    disabled={!canBaja || bajaSubmitting}
                    aria-busy={bajaSubmitting}
                  >
                    {bajaSubmitting
                      ? "Dando de baja…"
                      : "Confirmar baja como OSERP"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
