import { useState } from "react";
import { Link } from "react-router-dom";
import { carFineDelete, carFineForDelete } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function DeleteCarFinePage() {
  const [num, setNum] = useState("");
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadFine(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setPreview(null);
    try {
      const data = await carFineForDelete(num);
      if (!data.ok || !data.carFine) {
        setErr(data.msg || "No encontrada");
        return;
      }
      setPreview(data.carFine);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function confirmDelete() {
    setErr("");
    setMsg("");
    try {
      const data = await carFineDelete(preview.fine_number);
      setMsg(data.msg || "Eliminada");
      setPreview(null);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <Layout>
      <div className="container-md py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Eliminar multa</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas/vehiculos">
            Volver
          </Link>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body p-4">
            <form onSubmit={loadFine} className="row g-2 align-items-end">
              <div className="col-12 col-sm-6">
                <label className="form-label">N° multa</label>
                <input
                  className="form-control"
                  type="number"
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-sm-auto">
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
              <div className="mb-2">
                <div className="fw-semibold">
                  Multa N° {preview.fine_number}
                </div>
                <div className="text-muted small">
                  Matrícula: {preview.car_reg_number || "—"}
                </div>
              </div>
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
