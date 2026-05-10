import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { useUnitFromApi } from "../hooks/useUnitFromApi.js";

const ESCUDO_BASE = "/img/ESCUDO-UNIDADES-PNN";
const ESCUDO_PRENA = `${ESCUDO_BASE}/PRENA.png`;

export function HomePage() {
  const { user } = useAuth();
  const unitDoc = useUnitFromApi(user?.unit);
  const unitCode = user?.unit?.trim() || "";
  const unitCodeUpper = unitCode ? unitCode.toUpperCase() : "";
  const unitDisplay = unitDoc?.name?.trim() || unitCodeUpper || "";
  const unitMenuTitle = (unitDisplay || "Unidad no asignada").toLocaleUpperCase(
    "es-UY"
  );
  const escudoSrc = unitDoc?.shieldRelativeUrl?.trim()
    ? unitDoc.shieldRelativeUrl
    : unitCodeUpper
      ? `${ESCUDO_BASE}/${encodeURIComponent(unitCodeUpper)}.png`
      : ESCUDO_PRENA;
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  return (
    <Layout>
      <div className="container py-4">
        <div className="row g-3">
          <div className="col-12 col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-column flex-xl-row align-items-center align-items-xl-center gap-3">
                  <img
                    src={user?.avatar}
                    alt="perfil"
                    width="72"
                    height="72"
                    className="rounded-circle object-fit-cover border flex-shrink-0"
                    onError={(e) => {
                      e.target.src = "/img/avatar.png";
                    }}
                  />
                  <div className="flex-grow-1 w-100 text-center text-xl-start">
                    <div className="fw-semibold">
                      <sub className="m-0">{user?.rank}</sub>
                      <h4>{user?.first_name} {user?.last_name}</h4>
                    </div>
                    <div className="text-muted small">
                      <span className="text-body">
                        {unitDisplay || "—"}
                      </span>
                    </div>
                    <div className="text-muted small">{user?.email}</div>
                  </div>
                </div>

                <hr />

                <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-xl-start">
                  <span className="badge text-bg-secondary">
                    Rol: {user?.role ?? "—"}
                  </span>
                </div>

                <div className="d-grid gap-2 mt-3">
                  <Link className="btn btn-outline-primary" to="/cambiar-clave">
                    CAMBIAR CONTRASEÑA
                  </Link>
                  <Link className="btn btn-outline-secondary" to="/actualizar-datos">
                    ACTUALIZAR DATOS
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="m-0">Mi Unidad</h3>
              </div>

              <Link className="text-decoration-none" to="/mi-unidad">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <span
                        className="menu-tile-icon me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0 d-inline-flex align-items-center justify-content-center"
                        style={{
                          width: "2.15rem",
                          height: "2.15rem",
                          marginTop: "0.15rem",
                        }}
                        aria-hidden
                      >
                        <img
                          src={escudoSrc}
                          alt=""
                          className="w-100 h-100 object-fit-contain escudo-contraste-claro"
                          loading="lazy"
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (
                              el.src.endsWith("/PRENA.png") ||
                              el.src.endsWith("PRENA.png")
                            ) {
                              el.style.display = "none";
                              return;
                            }
                            el.src = ESCUDO_PRENA;
                          }}
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="fw-semibold text-body text-break">
                          {unitMenuTitle}
                        </div>
                        <div className="text-muted small">
                          Gestión según divisiones y áreas de interés de la Unidad.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="col-12 col-lg-9">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h3 className="m-0">Menú principal</h3>
            </div>

            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
              <div className="col">
                <Link className="text-decoration-none" to="/base-buques">
                  <div className="card h-100 shadow-sm">
                    <img
                      src="/img/shipdb.jpg"
                      alt="Gestión de buques"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-life-preserver me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE BUQUES
                          </div>
                          <div className="text-muted small">
                            Base de datos de buques.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col">
                <Link className="text-decoration-none" to="/base-gente-mar">
                  <div className="card h-100 shadow-sm">
                    <img
                      src="/img/ppldb.jpg"
                      alt="Gestión de gente de mar"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-person-badge me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE GENTE DE MAR
                          </div>
                          <div className="text-muted small">
                            Base de datos de gente de mar.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col">
                <Link className="text-decoration-none" to="/multas">
                  <div className="card h-100 shadow-sm">
                    <img
                      src="/img/finesMenu.jpg"
                      alt="Gestión de multas"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-journal-text me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE MULTAS
                          </div>
                          <div className="text-muted small">
                            Multas de buques o de vehículos terrestres.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col">
                <Link className="text-decoration-none" to="/gestion-unidades">
                  <div className="card h-100 shadow-sm">
                    <img
                      src="/img/unitManagement.jpg"
                      alt="Gestión de unidades"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-buildings me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE UNIDADES
                          </div>
                          <div className="text-muted small">
                            Base de datos de unidades.
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
                      <img
                        src="/img/users.jpg"
                        alt="Gestión de usuarios"
                        className="card-img-top"
                        loading="lazy"
                      />
                      <div className="card-body">
                        <div className="d-flex align-items-start gap-2">
                          <i
                            className="menu-tile-icon bi bi-people me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                            style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="fw-semibold text-body">
                              GESTIÓN DE USUARIOS
                            </div>
                            <div className="text-muted small">
                              Alta, listado, edición y borrado.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="card h-100 shadow-sm opacity-50">
                    <img
                      src="/img/users.jpg"
                      alt="Gestión de usuarios"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-people me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
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
                    <img
                      src="/img/extSys.jpg"
                      alt="Sistemas externos"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-tools me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            SISTEMAS EXTERNOS
                          </div>
                          <div className="text-muted small">Acceso rápido a MarineTraffic, Windy y cámaras de AntelTV.</div>
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
