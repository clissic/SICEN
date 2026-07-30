import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { updateDataRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import {
  SpecializationRequestFields,
  normalizeSpecializationRequests,
} from "../components/SpecializationRequestFields.jsx";
import { UserAvatarFileInput } from "../components/UserAvatarFileInput.jsx";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { ADMIN_EDIT_ROLES, normalizeRoleForSelect } from "../constants/userRoles.js";
import { RANK_OPTIONS } from "../constants/ranks.js";

function emptySpecRow() {
  return { name: "", certificateDataUrl: "", certificateFileName: "" };
}

export function UpdateDataPage() {
  const { user } = useAuth();
  const [newFirstName, setNf] = useState("");
  const [newLastName, setNl] = useState("");
  const [newRank, setNr] = useState("");
  const [newRole, setNrole] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newEmail, setNe] = useState("");
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState("");
  const [specializationRequests, setSpecializationRequests] = useState([
    emptySpecRow(),
  ]);
  const [newDataBody, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    setNf(user.first_name ?? "");
    setNl(user.last_name ?? "");
    setNr(user.rank ?? "");
    setNrole(
      user.role === "superAdmin" ? "superAdmin" : normalizeRoleForSelect(user.role)
    );
    setNewUnit(user.unit ?? "");
    setNe(user.email ?? "");
    setProfilePhotoDataUrl("");
    setSpecializationRequests([emptySpecRow()]);
  }, [user?._id]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      let specs = [];
      try {
        specs = normalizeSpecializationRequests(
          specializationRequests,
          user?.states
        );
      } catch (normErr) {
        setErr(normErr.message || "Revise las especializaciones solicitadas.");
        setSubmitting(false);
        return;
      }
      const newRolePayload =
        user.role === "superAdmin" ? "superAdmin" : newRole;
      const data = await updateDataRequest({
        first_name: user.first_name,
        newFirstName,
        last_name: user.last_name,
        newLastName,
        rank: user.rank,
        newRank,
        role: user.role,
        newRole: newRolePayload,
        unit: user.unit,
        newUnit,
        email: user.email,
        newEmail,
        newDataBody,
        ...(profilePhotoDataUrl
          ? { profilePhotoDataUrl }
          : {}),
        ...(specs.length ? { specializationRequests: specs } : {}),
      });
      setMsg(data.msg || "Solicitud enviada");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const isSuperAdminUser = user?.role === "superAdmin";

  return (
    <Layout>
      <div className="container-md py-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
              <h3 className="m-0">Solicitud de actualización de datos</h3>
              <Link className="btn btn-outline-secondary btn-sm" to="/home">
                Volver
              </Link>
            </div>

            <p className="small text-muted">
              Los datos actuales ya están cargados. Modifique lo necesario y
              complete el motivo.
            </p>

            {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
            <ErrorAlert message={err} />

            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  className="form-control"
                  value={newFirstName}
                  onChange={(e) => setNf(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Apellido</label>
                <input
                  className="form-control"
                  value={newLastName}
                  onChange={(e) => setNl(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Grado</label>
                <select
                  className="form-select"
                  value={newRank}
                  onChange={(e) => setNr(e.target.value)}
                  aria-label="Grado"
                >
                  <option value="">Seleccionar grado…</option>
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="update-data-unit">
                  Unidad
                </label>
                <UserUnitSelect
                  id="update-data-unit"
                  value={newUnit}
                  onChange={setNewUnit}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="update-data-role">
                  Rol
                </label>
                {isSuperAdminUser ? (
                  <>
                    <input
                      id="update-data-role"
                      className="form-control"
                      disabled
                      readOnly
                      value="superAdmin"
                    />
                    <div className="form-text">
                      Este rol no puede modificarse desde este formulario.
                    </div>
                  </>
                ) : (
                  <select
                    id="update-data-role"
                    className="form-select"
                    value={newRole}
                    onChange={(e) => setNrole(e.target.value)}
                    aria-label="Rol"
                  >
                    {ADMIN_EDIT_ROLES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNe(e.target.value)}
                />
              </div>
              <UserAvatarFileInput
                id="update-data-profile-photo"
                onDataUrl={setProfilePhotoDataUrl}
                label="Foto de perfil (archivo .jpg, opcional)"
              />
              <SpecializationRequestFields
                rows={specializationRequests}
                onChange={setSpecializationRequests}
                userStates={user?.states}
                disabled={submitting}
              />
              <div className="col-12">
                <label className="form-label">Motivo / cuerpo del mensaje</label>
                <textarea
                  className="form-control"
                  rows={5}
                  required
                  value={newDataBody}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="col-12 d-grid">
                <button
                  type="submit"
                  className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden
                        style={{
                          width: "1em",
                          height: "1em",
                          borderWidth: "0.15em",
                        }}
                      />
                      <span>Enviando solicitud…</span>
                    </>
                  ) : (
                    "Enviar solicitud"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
