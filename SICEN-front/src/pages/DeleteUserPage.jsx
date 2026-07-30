import { useState } from "react";
import { Link } from "react-router-dom";
import { userDelete, userForDelete } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";

export function DeleteUserPage() {
  const [id, setId] = useState("");
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    if (!preview) return;
    const fullName = [preview.rank, preview.first_name, preview.last_name]
      .filter((p) => String(p ?? "").trim())
      .join(" ");
    const email = String(preview.email ?? "").trim();
    const result = await confirmDelete({
      resource: "usuario",
      summaryHtml: `
        <p class="mb-2">Se eliminará permanentemente el usuario:</p>
        <ul class="mb-2 ps-3">
          ${fullName ? `<li><strong>${escapeHtml(fullName)}</strong></li>` : ""}
          ${email ? `<li class="small text-muted">${escapeHtml(email)}</li>` : ""}
        </ul>
      `,
    });
    if (!result.isConfirmed) return;

    setDeleting(true);
    setErr("");
    try {
      const data = await userDelete(String(preview._id));
      setPreview(null);
      setId("");
      setMsg(data.msg || "Usuario eliminado correctamente.");
      await notifyDeleteSuccess(data.msg);
    } catch (ex) {
      await notifyDeleteError(ex, "No se pudo eliminar el usuario.");
    } finally {
      setDeleting(false);
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

        <ErrorAlert message={err} />
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
                className="btn btn-danger d-inline-flex align-items-center gap-2"
                onClick={handleDelete}
                disabled={deleting}
                aria-busy={deleting}
              >
                {deleting ? (
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
                    <span>Eliminando…</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3" aria-hidden />
                    <span>Confirmar eliminación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
