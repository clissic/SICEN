import { useState } from "react";
import { Link } from "react-router-dom";
import { userDelete, userForDelete } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function DeleteUserPage() {
  const [id, setId] = useState("");
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadUser(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setPreview(null);
    try {
      const data = await userForDelete(id);
      if (!data.ok || !data.userFound) {
        setErr(data.msg || "No encontrado");
        return;
      }
      setPreview(data.userFound);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function confirmDelete() {
    setErr("");
    setMsg("");
    try {
      const data = await userDelete(String(preview._id));
      setMsg(data.msg || "Eliminado");
      setPreview(null);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Eliminar usuario</h3>
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

        {preview ? (
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="fw-semibold">
                {preview.rank} {preview.first_name} {preview.last_name}
              </div>
              <div className="text-muted small mb-3">{preview.email}</div>
              <div className="alert alert-warning py-2 mb-3">
                Esta acción no se puede deshacer.
              </div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
