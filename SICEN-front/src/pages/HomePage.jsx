import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { useBootstrapTheme } from "../components/ThemeToggle.jsx";
import { useUnitFromApi } from "../hooks/useUnitFromApi.js";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

const SECTION_TITLE_CLASS =
  "h5 text-muted text-uppercase mb-3 pb-2 border-bottom border-secondary-subtle";

const MI_UNIDAD_MENU_IMG_FALLBACK = "/img/unitManagement.jpg";

const ESCUDO_BASE = "/img/ESCUDO-UNIDADES-PNN";
const ESCUDO_PRENA = `${ESCUDO_BASE}/PRENA.png`;

export function HomePage() {
  const { user } = useAuth();
  const bsTheme = useBootstrapTheme();
  const sidebarMenuBtnClass =
    bsTheme === "dark" ? "btn btn-dark" : "btn btn-light";
  const unitDoc = useUnitFromApi(user?.unit);
  const unitCode = user?.unit?.trim() || "";
  const unitCodeUpper = unitCode ? unitCode.toUpperCase() : "";
  const unitDisplay = unitDoc?.name?.trim() || unitCodeUpper || "";
  const unitMenuTitle = (unitDisplay || "Unidad no asignada").toLocaleUpperCase(
    "es-UY"
  );
  const miUnidadMenuImgSrc = unitCode
    ? `/img/${encodeURIComponent(unitCode)}.jpg`
    : MI_UNIDAD_MENU_IMG_FALLBACK;
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

                <div className="row g-2 mt-3 row-cols-3 row-cols-lg-1 row-cols-xl-3">
                  <div className="col d-flex align-items-stretch">
                    <Link
                      className={`${sidebarMenuBtnClass} flex-grow-1 d-flex flex-column align-items-stretch h-100 py-2 px-1 lh-sm`}
                      to="/cambiar-clave"
                    >
                      <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 gap-1 text-center">
                        <i className="bi bi-key fs-5" aria-hidden="true" />
                        <span className="small text-wrap">
                          Cambiar contraseña
                        </span>
                      </div>
                      <span
                        className="d-inline-block border-bottom border-2 border-secondary align-self-center opacity-50 mt-1"
                        style={{ width: "2rem" }}
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                  <div className="col d-flex align-items-stretch">
                    <Link
                      className={`${sidebarMenuBtnClass} flex-grow-1 d-flex flex-column align-items-stretch h-100 py-2 px-1 lh-sm`}
                      to="/actualizar-datos"
                    >
                      <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 gap-1 text-center">
                        <i className="bi bi-person fs-5" aria-hidden="true" />
                        <span className="small text-wrap">
                          Actualizar datos
                        </span>
                      </div>
                      <span
                        className="d-inline-block border-bottom border-2 border-secondary align-self-center opacity-50 mt-1"
                        style={{ width: "2rem" }}
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                  <div className="col d-flex align-items-stretch">
                    <button
                      type="button"
                      className={`${sidebarMenuBtnClass} flex-grow-1 d-flex flex-column align-items-stretch h-100 py-2 px-1 lh-sm`}
                      disabled
                      title="Próximamente"
                    >
                      <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 gap-1 text-center">
                        <i className="bi bi-book fs-5" aria-hidden="true" />
                        <span className="small text-wrap">
                          Manual usuario
                        </span>
                      </div>
                      <span
                        className="d-inline-block border-bottom border-2 border-secondary align-self-center opacity-50 mt-1"
                        style={{ width: "2rem" }}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-9">
            <h3 className="visually-hidden">Menú principal</h3>

            <h4 className={SECTION_TITLE_CLASS}>Menú principal</h4>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-1 row-cols-xl-3 g-3 mb-5">
              <div className="col">
                <div
                  className="centinela-desarrollo-tile position-relative h-100"
                  tabIndex={0}
                  role="status"
                  aria-label="El Centinela. EN DESARROLLO."
                >
                  <div className="card h-100 shadow-sm user-select-none">
                    <img
                      src="/img/centinelaMenu.jpg"
                      alt="El Centinela"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-broadcast me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={ICON_TILE}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">EL CENTINELA</div>
                          <div className="text-muted small">
                            Aplicación de tiempo real ajustada a las necesidades de la PNN.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="centinela-desarrollo-overlay" aria-hidden="true">
                    EN DESARROLLO
                  </div>
                </div>
              </div>

              <div className="col">
                <Link className="text-decoration-none" to="/estado-rector-puertos">
                  <div className="card h-100 shadow-sm">
                    <img
                      src="/img/erpMenu.jpg"
                      alt="Estado Rector de Puertos"
                      className="card-img-top"
                      loading="lazy"
                    />
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className="menu-tile-icon bi bi-globe me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                          style={ICON_TILE}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            ESTADO RECTOR DE PUERTOS
                          </div>
                          <div className="text-muted small">
                            CIALA, estadísticas y gráficos.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col">
                <Link className="text-decoration-none" to="/mi-unidad">
                  <div className="card h-100 shadow-sm">
                    <img
                      src={miUnidadMenuImgSrc}
                      alt="Mi Unidad"
                      className="card-img-top"
                      loading="lazy"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.dataset.fallbackApplied === "1") return;
                        el.dataset.fallbackApplied = "1";
                        el.src = MI_UNIDAD_MENU_IMG_FALLBACK;
                      }}
                    />
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
                            MI UNIDAD
                          </div>
                          <div className="text-muted small text-break">
                            {unitMenuTitle}.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <h4 className={SECTION_TITLE_CLASS}>Áreas de Gestión</h4>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-1 row-cols-xl-3 g-3 mb-5">
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
                          style={ICON_TILE}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE BUQUES
                          </div>
                          <div className="text-muted small">
                            Base de datos de buques deportivos y mercantes.
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
                          style={ICON_TILE}
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
                          style={ICON_TILE}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE MULTAS
                          </div>
                          <div className="text-muted small">
                            Multas de buques y de vehículos terrestres.
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
                          style={ICON_TILE}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE UNIDADES
                          </div>
                          <div className="text-muted small">
                            Base de datos de Unidades de la Prefectura Nacional Naval.
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
                            style={ICON_TILE}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="fw-semibold text-body">
                              GESTIÓN DE USUARIOS
                            </div>
                            <div className="text-muted small">
                              Consultas, altas, bajas, modificaciones y estadísticas.
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
                          style={ICON_TILE}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            GESTIÓN DE USUARIOS
                          </div>
                          <div className="text-muted small">(Solo administradores)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h4 className={SECTION_TITLE_CLASS}>Ayudas al navegante</h4>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-1 row-cols-xl-3 g-3">
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
                          style={ICON_TILE}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body">
                            SISTEMAS EXTERNOS
                          </div>
                          <div className="text-muted small">
                            Aplicaciones de mapas,
                            meteorología externa y otras herramientas.
                          </div>
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
