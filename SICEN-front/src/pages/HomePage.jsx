import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";

export function HomePage() {
  const { user } = useAuth();
  const finesQuantity = user?.fines?.length ?? 0;
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  return (
    <Layout>
      <div className="container py-4">
        <div className="row g-3">
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={user?.avatar}
                    alt="perfil"
                    width="72"
                    height="72"
                    className="rounded-circle object-fit-cover border"
                    onError={(e) => {
                      e.target.src = "/img/avatar.png";
                    }}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-semibold">
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div className="text-muted small">{user?.rank}</div>
                    <div className="text-muted small">{user?.email}</div>
                  </div>
                </div>

                <hr />

                <div className="d-flex flex-wrap gap-2">
                  <span className="badge text-bg-secondary">
                    Rol: {user?.role ?? "—"}
                  </span>
                  <span className="badge text-bg-light border text-body">
                    Multas realizadas: {finesQuantity}
                  </span>
                </div>

                <div className="d-grid gap-2 mt-3">
                  <Link className="btn btn-outline-primary" to="/mis-multas">
                    MIS MULTAS
                  </Link>
                  <Link className="btn btn-outline-secondary" to="/cambiar-clave">
                    CAMBIAR CONTRASEÑA
                  </Link>
                  <Link className="btn btn-outline-secondary" to="/actualizar-datos">
                    ACTUALIZAR DATOS
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-8">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h3 className="m-0">Menú principal</h3>
            </div>

            <div className="row row-cols-1 row-cols-md-2 g-3">
              <div className="col">
                <Link className="text-decoration-none" to="/multas">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="bi bi-journal-text me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE MULTAS
                          </div>
                          <div className="text-muted small">
                            Multas de buques o de vehículos terrestres
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col">
                {isAdmin ? (
                  <Link className="text-decoration-none" to="/usuarios">
                    <div className="card h-100 shadow-sm">
                      <div className="card-body">
                        <div className="d-flex align-items-start gap-2">
                          <i
                            className="bi bi-people me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                            style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="fw-semibold text-body">
                              GESTIÓN DE USUARIOS
                            </div>
                            <div className="text-muted small">
                              Alta, listado, edición y borrado
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="card h-100 shadow-sm opacity-50">
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="bi bi-people me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE USUARIOS
                          </div>
                          <div className="text-muted small">(solo admin)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="col">
                <Link className="text-decoration-none" to="/herramientas">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="bi bi-tools me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            HERRAMIENTAS DE PUERTO
                          </div>
                          <div className="text-muted small">Accesos rápidos</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
