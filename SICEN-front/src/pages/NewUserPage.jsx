import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createUserAdmin } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { UserAvatarFileInput } from "../components/UserAvatarFileInput.jsx";
import { RANK_OPTIONS } from "../constants/ranks.js";
import {
  CREATE_USER_ROLE_OPTIONS_ADMIN,
  CREATE_USER_ROLE_OPTIONS_SUPERADMIN,
  isSkipperRole,
  roleUsesPnnFields,
  userRoleLabel,
} from "../constants/userRoles.js";
import { useAuth } from "../context/AuthContext.jsx";
import { parseNewUserPrefillParam } from "../utils/newUserPrefill.js";
import "../styles/new-user-page.css";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  rank: "",
  unit: "",
  email: "",
  role: "user",
  documentId: "",
  phone: "",
  birthDate: "",
};

export function NewUserPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillAppliedRef = useRef(false);
  const roleOptions = useMemo(
    () =>
      user?.role === "superAdmin"
        ? CREATE_USER_ROLE_OPTIONS_SUPERADMIN
        : CREATE_USER_ROLE_OPTIONS_ADMIN,
    [user?.role]
  );
  const allowedRoleValues = useMemo(
    () => new Set(roleOptions.map((o) => o.value)),
    [roleOptions]
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [requestNote, setRequestNote] = useState("");
  const [fromRequest, setFromRequest] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const raw = searchParams.get("prefill");
    if (!raw) return;
    const data = parseNewUserPrefillParam(raw);
    prefillAppliedRef.current = true;
    if (!data) {
      setErr("No se pudieron leer los datos de la solicitud en el enlace.");
      setSearchParams({}, { replace: true });
      return;
    }
    const role = allowedRoleValues.has(data.role) ? data.role : "user";
    setForm({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      role,
      rank: isSkipperRole(role) ? "" : data.rank,
      unit: isSkipperRole(role) ? "" : data.unit,
      documentId: isSkipperRole(role) ? data.documentId : "",
      phone: isSkipperRole(role) ? data.phone : "",
      birthDate: isSkipperRole(role) ? data.birthDate : "",
    });
    setRequestNote(data.note || "");
    setFromRequest(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, allowedRoleValues]);

  useEffect(() => {
    if (user?.role !== "superAdmin") {
      setForm((f) =>
        f.role === "superAdmin" ? { ...f, role: "user" } : f
      );
    }
  }, [user?.role]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function selectRole(role) {
    setForm((f) => ({
      ...f,
      role,
      ...(isSkipperRole(role)
        ? { rank: "", unit: "" }
        : { documentId: "", phone: "", birthDate: "" }),
    }));
    setMsg("");
    setErr("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      const payload = isSkipperRole(form.role)
        ? {
            first_name: form.first_name,
            last_name: form.last_name,
            rank: "Nauta",
            unit: "",
            email: form.email,
            role: form.role,
            documentId: form.documentId.trim(),
            phone: form.phone.trim(),
            birthDate: form.birthDate,
          }
        : {
            first_name: form.first_name,
            last_name: form.last_name,
            rank: form.rank,
            unit: form.unit,
            email: form.email,
            role: form.role,
            documentId: "",
            phone: "",
            birthDate: "",
          };
      const data = await createUserAdmin(payload, avatarFile);
      setMsg(data.msg || "Usuario creado");
      setFromRequest(false);
      setRequestNote("");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const showPnnFields = roleUsesPnnFields(form.role);
  const showSkipperFields = isSkipperRole(form.role);

  return (
    <Layout>
      <div className="container-md py-5">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Nuevo usuario</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/usuarios">
            Volver
          </Link>
        </div>

        <div
          className="new-user-role-tabs"
          role="tablist"
          aria-label="Tipo de rol del nuevo usuario"
        >
          {roleOptions.map((o) => {
            const active = form.role === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="tab"
                id={`new-user-role-tab-${o.value}`}
                aria-selected={active}
                className={[
                  "new-user-role-tabs__tab",
                  active ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => selectRole(o.value)}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <div className="card shadow-sm new-user-form-card">
          <div className="card-body p-4">
            {fromRequest ? (
              <div className="alert alert-info py-2" role="status">
                <div className="fw-semibold mb-1">
                  Datos precargados desde una solicitud de cuenta (
                  {userRoleLabel(form.role)})
                </div>
                <p className="mb-0 small">
                  Revisá los campos y confirmá con «Crear y enviar email». El
                  solicitante recibirá el correo de bienvenida.
                </p>
                {requestNote ? (
                  <p className="mb-0 mt-2 small text-break">
                    <span className="text-secondary">Mensaje del solicitante:</span>{" "}
                    {requestNote}
                  </p>
                ) : null}
              </div>
            ) : null}

            {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
            <ErrorAlert message={err} />

            <form
              onSubmit={onSubmit}
              className="row g-3"
              aria-labelledby={`new-user-role-tab-${form.role}`}
            >
              <div className="col-12">
                <p className="new-user-form-card__hint mb-0">
                  Completá los datos para{" "}
                  <strong>
                    {roleOptions.find((o) => o.value === form.role)?.label}
                  </strong>
                  . El email será la credencial de ingreso.
                </p>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-user-first">
                  Nombre
                </label>
                <input
                  id="new-user-first"
                  className="form-control"
                  required
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-user-last">
                  Apellido
                </label>
                <input
                  id="new-user-last"
                  className="form-control"
                  required
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </div>

              {showPnnFields ? (
                <>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="new-user-rank">
                      Grado
                    </label>
                    <select
                      id="new-user-rank"
                      className="form-select"
                      required
                      value={form.rank}
                      onChange={(e) => set("rank", e.target.value)}
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
                    <label className="form-label" htmlFor="new-user-unit">
                      Unidad
                    </label>
                    <UserUnitSelect
                      id="new-user-unit"
                      value={form.unit}
                      onChange={(v) => set("unit", v)}
                      required
                    />
                  </div>
                </>
              ) : null}

              {showSkipperFields ? (
                <>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="new-user-document">
                      DNI / Pasaporte
                    </label>
                    <input
                      id="new-user-document"
                      className="form-control"
                      required
                      value={form.documentId}
                      onChange={(e) => set("documentId", e.target.value)}
                      placeholder="Ej.: 1.234.567-8"
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="new-user-birth">
                      Fecha de nacimiento
                    </label>
                    <input
                      id="new-user-birth"
                      className="form-control"
                      type="date"
                      required
                      value={form.birthDate}
                      onChange={(e) => set("birthDate", e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="new-user-phone">
                      Teléfono
                    </label>
                    <input
                      id="new-user-phone"
                      className="form-control"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="Ej.: 099 123 456"
                      autoComplete="tel"
                    />
                  </div>
                </>
              ) : null}

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-user-email">
                  Email
                </label>
                <input
                  id="new-user-email"
                  className="form-control"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder={
                    showSkipperFields
                      ? "Ej.: nombre@correo.com"
                      : "Ej.: napellido@armada.mil.uy"
                  }
                  autoComplete="email"
                />
              </div>

              <UserAvatarFileInput
                id="new-user-avatar"
                onFileChange={setAvatarFile}
              />
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
                      <span>Enviando…</span>
                    </>
                  ) : (
                    "Crear y enviar email"
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
