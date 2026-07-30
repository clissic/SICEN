import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usersPaginated } from "../api/client.js";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { RANK_OPTIONS } from "../constants/ranks.js";

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Todos los roles" },
  { value: "user", label: "Usuario" },
  { value: "admin", label: "Administrador" },
  { value: "superAdmin", label: "Super administrador" },
];

export function AllUsersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [debouncedFirst, setDebouncedFirst] = useState("");
  const [debouncedLast, setDebouncedLast] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFirst(firstNameInput.trim()), 400);
    return () => clearTimeout(t);
  }, [firstNameInput]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLast(lastNameInput.trim()), 400);
    return () => clearTimeout(t);
  }, [lastNameInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedFirst, debouncedLast]);

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setLoading(true);

    const params = { currentPage: page, pageSize: 10 };
    if (debouncedFirst) params.first_name = debouncedFirst;
    if (debouncedLast) params.last_name = debouncedLast;
    if (rankFilter.trim()) params.rank = rankFilter.trim();
    if (unitFilter.trim()) params.unit = unitFilter.trim();
    if (roleFilter.trim()) params.role = roleFilter.trim();

    usersPaginated(params)
      .then((r) => {
        if (!cancelled) setData(r.payload);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedFirst, debouncedLast, rankFilter, unitFilter, roleFilter]);

  const rows = data?.paginatedUsers ?? [];

  function onRankChange(e) {
    setRankFilter(e.target.value);
    setPage(1);
  }

  function onUnitChange(v) {
    setUnitFilter(v);
    setPage(1);
  }

  function onRoleChange(e) {
    setRoleFilter(e.target.value);
    setPage(1);
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <h3 className="m-0">Usuarios</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/usuarios">
            Volver
          </Link>
        </div>

        <ErrorAlert message={err} />

        <div className="card shadow-sm mb-3">
          <div className="card-body py-3">
            <div className="row g-2 g-md-3 align-items-end">
              <div className="col-12 col-md-6 col-xl-4">
                <label className="form-label small mb-1" htmlFor="filter-first-name">
                  Nombre
                </label>
                <input
                  id="filter-first-name"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Filtrar por nombre…"
                  value={firstNameInput}
                  onChange={(e) => setFirstNameInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="col-12 col-md-6 col-xl-4">
                <label className="form-label small mb-1" htmlFor="filter-last-name">
                  Apellido
                </label>
                <input
                  id="filter-last-name"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Filtrar por apellido…"
                  value={lastNameInput}
                  onChange={(e) => setLastNameInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="col-12 col-md-6 col-xl-4">
                <label className="form-label small mb-1" htmlFor="filter-rank">
                  Grado
                </label>
                <select
                  id="filter-rank"
                  className="form-select form-select-sm"
                  value={rankFilter}
                  onChange={onRankChange}
                  aria-label="Filtrar por grado"
                >
                  <option value="">Todos los grados</option>
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6 col-xl-4">
                <label className="form-label small mb-1" htmlFor="filter-unit">
                  Unidad
                </label>
                <UserUnitSelect
                  id="filter-unit"
                  value={unitFilter}
                  onChange={onUnitChange}
                  className="form-select form-select-sm"
                  emptyOptionLabel="Todas las unidades"
                />
              </div>
              <div className="col-12 col-md-6 col-xl-4">
                <label className="form-label small mb-1" htmlFor="filter-role">
                  Rol
                </label>
                <select
                  id="filter-role"
                  className="form-select form-select-sm"
                  value={roleFilter}
                  onChange={onRoleChange}
                  aria-label="Filtrar por rol"
                >
                  {ROLE_FILTER_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="text-muted small mb-2">
          Total <strong>{data?.totalDocs ?? "—"}</strong> · Pág.{" "}
          <strong>{data?.page ?? page}</strong> /{" "}
          <strong>{data?.totalPages ?? "—"}</strong>
          {loading ? <span className="ms-2">Cargando…</span> : null}
        </div>

        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Grado</th>
                  <th>Unidad</th>
                  <th>Email</th>
                  <th>Rol</th>
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
                    <td>{r.unit ? String(r.unit) : "—"}</td>
                    <td>{r.email}</td>
                    <td>{r.role}</td>
                  </tr>
                ))}
                {rows.length === 0 && !loading ? (
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
                disabled={!data?.hasPrevPage || loading}
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
                disabled={!data?.hasNextPage || loading}
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
