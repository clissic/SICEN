import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usersGetAll } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };
const PAGE_SIZE = 5;
const OSERP_STATE_NAME = "Oficial Supervisor por el Estado Rector de Puertos";

/** Normaliza para búsqueda: minúsculas y sin diacríticos. */
function normalizeForSearch(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Devuelve el subdocumento del estado OSERP del usuario (o null). */
function oserpState(u) {
  if (!u || !Array.isArray(u.states)) return null;
  return (
    u.states.find(
      (s) => s && String(s.name).trim() === OSERP_STATE_NAME && s.isActive
    ) || null
  );
}

/** Fecha legible (dd/mm/aaaa) o guion. */
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function OserpActiveList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    usersGetAll()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.payload) ? data.payload : [];
        const oserp = list.filter((u) => oserpState(u));
        oserp.sort((a, b) => {
          const la = `${a.last_name || ""} ${a.first_name || ""}`.toLowerCase();
          const lb = `${b.last_name || ""} ${b.first_name || ""}`.toLowerCase();
          return la.localeCompare(lb, "es");
        });
        setUsers(oserp);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "No se pudieron cargar los OSERP habilitados.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query).trim();
    if (!q) return users;
    const terms = q.split(/\s+/).filter(Boolean);
    return users.filter((u) => {
      const haystack = normalizeForSearch(
        `${u.rank ?? ""} ${u.first_name ?? ""} ${u.last_name ?? ""} ${u.unit ?? ""} ${u.email ?? ""}`
      );
      return terms.every((t) => haystack.includes(t));
    });
  }, [users, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : startIdx + 1;
  const toN = startIdx + pageItems.length;

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h5 className="card-title d-flex align-items-center gap-2 mb-3">
          OSERP habilitados
        </h5>

        <div className="input-group input-group-sm mb-3">
          <span className="input-group-text" aria-hidden>
            <i className="bi bi-search" />
          </span>
          <input
            type="search"
            className="form-control"
            placeholder="Buscar por nombre, apellido, grado, unidad o email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar OSERP habilitados"
            autoComplete="off"
          />
        </div>

        {loading ? (
          <p className="text-muted mb-0">Cargando OSERP habilitados…</p>
        ) : error ? (
          <ErrorAlert message={error} className="alert alert-danger mb-0" />
        ) : users.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            No hay usuarios habilitados como OSERP.
          </div>
        ) : filtered.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            Ningún OSERP coincide con «{query.trim()}».
          </div>
        ) : (
          <>
            <p className="small text-muted mb-2">
              Mostrando {fromN}–{toN} de {filtered.length}
              {query.trim() ? ` (filtrado de ${users.length})` : ""}
            </p>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Grado</th>
                    <th scope="col">Unidad</th>
                    <th scope="col">Email</th>
                    <th scope="col">Habilitado</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((u) => {
                    const st = oserpState(u);
                    const fn = String(u.first_name || "").trim();
                    const ln = String(u.last_name || "").trim();
                    const fullName = `${ln}${fn ? `, ${fn}` : ""}`.trim();
                    return (
                      <tr key={String(u._id || u.email)}>
                        <td className="fw-medium">{fullName || "—"}</td>
                        <td>{String(u.rank || "").trim() || "—"}</td>
                        <td>{String(u.unit || "").trim() || "—"}</td>
                        <td className="text-break">{u.email || "—"}</td>
                        <td>{formatDate(st?.lastModify)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <nav
                className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"
                aria-label="Paginación de OSERP habilitados"
              >
                <span className="small text-muted">
                  Página {currentPage} de {totalPages}
                </span>
                <ul className="pagination pagination-sm mb-0">
                  <li
                    className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                    >
                      Anterior
                    </button>
                  </li>
                  <li
                    className={`page-item ${
                      currentPage >= totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setPage(Math.min(totalPages, currentPage + 1))
                      }
                    >
                      Siguiente
                    </button>
                  </li>
                </ul>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function OserpMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">OSERP</h3>
            <p className="text-muted small mb-0 mt-1">
              Gestión de Oficiales Supervisores por el Estado Rector de Puertos.
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos"
          >
            Estado Rector de Puertos
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 align-items-stretch">
          <div className="col">
            <Link
              className="text-decoration-none"
              to="/estado-rector-puertos/oserp/alta"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/OSERPupdown.jpg"
                  alt="Altas y bajas de OSERP"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-person-fill-gear me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">ALTAS / BAJAS</div>
                      <div className="text-muted small">
                        Dar de alta o de baja usuarios como OSERP.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="col">
            <Link
              className="text-decoration-none"
              to="/estado-rector-puertos/oserp/codigos-reglamentos"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/OSERPcodes.jpg"
                  alt="Códigos y reglamentos"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-journals me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">
                        CÓDIGOS Y REGLAMENTOS
                      </div>
                      <div className="text-muted small">
                        Documentación útil para el OSERP.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="col">
            <Link
              className="text-decoration-none"
              to="/estado-rector-puertos/oserp/asistente-deficiencias"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/OSERPassistant.jpg"
                  alt="Asistente de deficiencias"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-robot me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">
                        ASISTENTE DE DEFICIENCIAS
                      </div>
                      <div className="text-muted small">
                        Asistente especializado para buscar las diferentes
                        deficiencias según la necesidad del OSERP.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <OserpActiveList />
      </div>
    </Layout>
  );
}
