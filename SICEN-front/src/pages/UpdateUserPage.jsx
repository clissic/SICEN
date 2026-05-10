import { useState } from "react";
import { Link } from "react-router-dom";
import { userForUpdate, userUpdate } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { UserAvatarFileInput } from "../components/UserAvatarFileInput.jsx";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { ADMIN_EDIT_ROLES, normalizeRoleForSelect } from "../constants/userRoles.js";

export function UpdateUserPage() {
  const [id, setId] = useState("");
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function loadUser(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setForm(null);
    setAvatarFile(null);
    try {
      const data = await userForUpdate(id);
      if (!data.ok || !data.userFound) {
        setErr(data.msg || "Usuario no encontrado");
        return;
      }
      const u = data.userFound;
      const r = u.role ?? "user";
      setForm({
        first_name: u.first_name ?? "",
        last_name: u.last_name ?? "",
        rank: u.rank ?? "",
        unit: u.unit ?? "",
        email: u.email ?? "",
        role: normalizeRoleForSelect(r),
        originalRole: r,
        avatar: u.avatar ?? "",
      });
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const { originalRole, avatar: _avatarDrop, ...rest } = form;
      const payload = { ...rest };
      if (originalRole === "superAdmin") {
        payload.role = "superAdmin";
      }
      delete payload.originalRole;
      const data = await userUpdate(id, payload, avatarFile);
      if (data.avatarUrl) {
        setForm((f) => (f ? { ...f, avatar: data.avatarUrl } : f));
      }
      setAvatarFile(null);
      setMsg(data.msg || "Actualizado");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  const isSuperAdminTarget = form?.originalRole === "superAdmin";

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Modificar usuario</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/usuarios">
            Volver
          </Link>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body p-4">
            <form
              onSubmit={loadUser}
              className="row g-2 justify-content-center align-items-end"
            >
              <div className="col-12 col-md-6">
                <label className="form-label">ID del usuario:</label>
                <input
                  className="form-control"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-auto text-center text-md-start">
                <button type="submit" className="btn btn-primary">
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}
        {msg ? <div className="alert alert-success py-2">{msg}</div> : null}

        {form ? (
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={save} className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-control"
                    value={form.first_name}
                    onChange={(e) => set("first_name", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Apellido</label>
                  <input
                    className="form-control"
                    value={form.last_name}
                    onChange={(e) => set("last_name", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Grado</label>
                  <input
                    className="form-control"
                    value={form.rank}
                    onChange={(e) => set("rank", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="edit-user-unit">
                    Unidad
                  </label>
                  <UserUnitSelect
                    id="edit-user-unit"
                    value={form.unit}
                    onChange={(v) => set("unit", v)}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="edit-user-role">
                    Rol
                  </label>
                  {isSuperAdminTarget ? (
                    <>
                      <input
                        id="edit-user-role"
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
                      id="edit-user-role"
                      className="form-select"
                      value={form.role}
                      onChange={(e) => set("role", e.target.value)}
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
                <div className="col-12">
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
                <UserAvatarFileInput
                  id="edit-user-avatar"
                  onFileChange={setAvatarFile}
                />
                <div className="col-12 d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2"
                    disabled={saving}
                    aria-busy={saving}
                  >
                    {saving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          style={{ width: "1em", height: "1em", borderWidth: "0.15em" }}
                          role="status"
                          aria-hidden
                        />
                        <span>Guardando…</span>
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
