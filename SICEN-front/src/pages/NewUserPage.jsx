import { useState } from "react";
import { Link } from "react-router-dom";
import { createUserAdmin } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { RANK_OPTIONS } from "../constants/ranks.js";

export function NewUserPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    rank: "",
    unit: "",
    email: "",
    avatar: "",
  });
  const [avatarErr, setAvatarErr] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onAvatarChange(e) {
    setAvatarErr("");
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      set("avatar", "");
      return;
    }

    const isJpeg =
      file.type === "image/jpeg" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg");
    if (!isJpeg) {
      setAvatarErr("El archivo debe ser .jpg / .jpeg");
      e.target.value = "";
      set("avatar", "");
      return;
    }

    const maxBytes = 1024 * 1024; // 1 MB
    if (file.size > maxBytes) {
      setAvatarErr("El archivo supera 1 MB");
      e.target.value = "";
      set("avatar", "");
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("No se pudo leer el archivo"));
      r.readAsDataURL(file);
    });

    set("avatar", dataUrl);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await createUserAdmin(form);
      setMsg(data.msg || "Usuario creado");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
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
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Avatar (archivo .jpg)</label>
                <input
                  className="form-control"
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  onChange={onAvatarChange}
                />
                <div className="form-text">
                  Máx. 1 MB. Recomendado: 500 x 500 px.
                </div>
                {avatarErr ? (
                  <div className="text-danger small mt-1">{avatarErr}</div>
                ) : null}
              </div>
              <div className="col-12 d-grid">
                <button type="submit" className="btn btn-primary">
                  Crear y enviar email
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
