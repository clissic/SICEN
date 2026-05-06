import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { carFinesMine } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function UserFinesPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    carFinesMine()
      .then((d) => setRows(d.payload || []))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Mis multas</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Volver
          </Link>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}

        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Artículo</th>
                  <th>Monto</th>
                  <th>Matrícula</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.fine_number}</td>
                    <td>{r.fine_date}</td>
                    <td>{r.fine_article}</td>
                    <td>{r.fine_amount}</td>
                    <td>{r.car_reg_number}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No hay multas para mostrar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
