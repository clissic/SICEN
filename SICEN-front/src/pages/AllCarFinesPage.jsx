import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { carFinesPaginated } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function AllCarFinesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    carFinesPaginated({ currentPage: page, pageSize: 5, sort: "desc" })
      .then((r) => {
        if (!alive) return;
        setData(r.payload);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e.message);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page]);

  const fines = data?.paginatedFines ?? [];

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <h3 className="m-0">Consulta de multas vehiculares</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas/vehiculos">
            Volver
          </Link>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}

        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="text-muted small">
            Total: <strong>{data?.totalDocs ?? "—"}</strong> · Página{" "}
            <strong>{data?.page ?? page}</strong> /{" "}
            <strong>{data?.totalPages ?? "—"}</strong> · 5 por página
          </div>
          {loading ? <span className="badge text-bg-light border">Cargando…</span> : null}
        </div>

        {fines.length === 0 && !loading && !err ? (
          <div className="alert alert-secondary py-2 mb-3">
            No hay multas para mostrar.
          </div>
        ) : null}

        <div className="row g-3">
          {fines.map((r) => (
            <div key={r._id} className="col-12">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div className="d-flex align-items-baseline gap-2">
                      <span className="fs-4 fw-semibold">{r.fine_number}</span>
                      <span className="text-muted small">Multa</span>
                    </div>
                    <span className="badge text-bg-light border">
                      {r.fine_status || "sin estado"}
                    </span>
                  </div>

                  <hr className="my-3" />

                  <div className="row g-2 small">
                    <div className="col-12 col-md-6">
                      <div className="text-muted">Fecha</div>
                      <div>
                        {r.fine_date || "—"}
                        {r.fine_time ? ` — ${r.fine_time}` : ""}
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-muted">Autor</div>
                      <div>{r.fine_author || "—"}</div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="text-muted">Vehículo</div>
                      <div>
                        {r.car_brand || "—"} {r.car_model || ""}
                        {r.car_reg_number ? ` — ${r.car_reg_number}` : ""}
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-muted">Titular</div>
                      <div>
                        {r.owner_name || "—"}
                        {r.owner_ci ? ` (${r.owner_ci})` : ""}
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="text-muted">Artículo</div>
                      <div>{r.fine_article || "—"}</div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="text-muted">Importe</div>
                      <div>{r.fine_amount ?? "—"}</div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="text-muted">Extra</div>
                      <div>{r.fine_extra_amount ?? "—"}</div>
                    </div>

                    {r.owner_tel || r.owner_dir ? (
                      <div className="col-12">
                        <div className="text-muted">Contacto</div>
                        <div>
                          {r.owner_tel ? r.owner_tel : ""}
                          {r.owner_tel && r.owner_dir ? " — " : ""}
                          {r.owner_dir ? r.owner_dir : ""}
                        </div>
                      </div>
                    ) : null}

                    {r.fine_proves ? (
                      <div className="col-12">
                        <div className="text-muted">Pruebas</div>
                        <div className="text-truncate">{r.fine_proves}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <nav className="mt-3" aria-label="Paginación de multas vehiculares">
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
