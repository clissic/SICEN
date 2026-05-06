import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usersPaginated } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function AllUsersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    usersPaginated({ currentPage: page, pageSize: 10 })
      .then((r) => setData(r.payload))
      .catch((e) => setErr(e.message));
  }, [page]);

  const rows = data?.paginatedUsers ?? [];

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <h3 className="m-0">Usuarios</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/usuarios">
            Volver
          </Link>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}

        <div className="text-muted small mb-2">
          Total <strong>{data?.totalDocs ?? "—"}</strong> · Pág.{" "}
          <strong>{data?.page ?? page}</strong> /{" "}
          <strong>{data?.totalPages ?? "—"}</strong>
        </div>

        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Grado</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Multas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td className="small text-muted">{String(r._id)}</td>
                    <td>
                      {r.first_name} {r.last_name}
                    </td>
                    <td>{r.rank}</td>
                    <td>{r.email}</td>
                    <td>{r.role}</td>
                    <td>{r.fines}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No hay usuarios para mostrar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <nav className="mt-3" aria-label="Paginación de usuarios">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${!data?.hasPrevPage ? "disabled" : ""}`}>
              <button
                className="page-link"
                type="button"
                onClick={() => setPage(data.prevPage)}
                disabled={!data?.hasPrevPage}
              >
                Anterior
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                {data?.page ?? page} / {data?.totalPages ?? "—"}
              </span>
            </li>
            <li className={`page-item ${!data?.hasNextPage ? "disabled" : ""}`}>
              <button
                className="page-link"
                type="button"
                onClick={() => setPage(data.nextPage)}
                disabled={!data?.hasNextPage}
              >
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </Layout>
  );
}
