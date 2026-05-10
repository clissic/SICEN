import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createUserAdmin } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { UserAvatarFileInput } from "../components/UserAvatarFileInput.jsx";
import { RANK_OPTIONS } from "../constants/ranks.js";
import {
  CREATE_USER_ROLE_OPTIONS_ADMIN,
  CREATE_USER_ROLE_OPTIONS_SUPERADMIN,
} from "../constants/userRoles.js";
import { useAuth } from "../context/AuthContext.jsx";

export function NewUserPage() {
  const { user } = useAuth();
  const roleOptions = useMemo(
    () =>
      user?.role === "superAdmin"
        ? CREATE_USER_ROLE_OPTIONS_SUPERADMIN
        : CREATE_USER_ROLE_OPTIONS_ADMIN,
    [user?.role]
  );

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    rank: "",
    unit: "",
    email: "",
    role: "user",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      const data = await createUserAdmin(form, avatarFile);
      setMsg(data.msg || "Usuario creado");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container-md py-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
              <h3 className="m-0">Nuevo usuario</h3>
              <Link className="btn btn-outline-secondary btn-sm" to="/usuarios">
                Volver
              </Link>
            </div>

            {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
            {err ? <div className="alert alert-danger py-2">{err}</div> : null}

            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  className="form-control"
                  required
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Apellido</label>
                <input
                  className="form-control"
                  required
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Grado</label>
                <select
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
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-user-role">
                  Rol
                </label>
                <select
                  id="new-user-role"
                  className="form-select"
                  required
                  value={form.role}
                  onChange={(e) => set("role", e.target.value)}
                  aria-label="Rol del usuario"
                >
                  {roleOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
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
                        style={{ width: "1em", height: "1em", borderWidth: "0.15em" }}
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
