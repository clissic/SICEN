import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { useBootstrapTheme } from "../components/ThemeToggle.jsx";
import { useUnitFromApi } from "../hooks/useUnitFromApi.js";
import { UserStateBadges } from "../components/UserStateBadges.jsx";
import { MainMenuLink } from "../components/MainMenuLink.jsx";
import { userRoleLabel, isSkipperRole } from "../constants/userRoles.js";
import {
  skipperMovementStatus,
  skipperReportArrival,
  skipperTrackingStatus,
} from "../api/client.js";
import { SkipperReportArrivalModal } from "../components/SkipperReportArrivalModal.jsx";
import {
  stopSportMovementPositionEmitter,
  useSportMovementPositionEmitter,
} from "../hooks/useSportMovementPositionEmitter.js";

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
  const isSkipper = isSkipperRole(user?.role);
  const [skipperStatus, setSkipperStatus] = useState(null);
  const [skipperStatusLoading, setSkipperStatusLoading] = useState(isSkipper);
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [arrivalModalOpen, setArrivalModalOpen] = useState(false);
  const [arrivalSaving, setArrivalSaving] = useState(false);

  useSportMovementPositionEmitter({
    enabled: Boolean(trackingStatus?.shouldEmit),
    movementId: trackingStatus?.movementId,
  });

  const loadSkipperStatus = useCallback(async () => {
    if (!isSkipper) return;
    setSkipperStatusLoading(true);
    try {
      const [data, tracking] = await Promise.all([
        skipperMovementStatus(),
        skipperTrackingStatus().catch(() => null),
      ]);
      setSkipperStatus(data);
      setTrackingStatus(tracking);
    } catch {
      setSkipperStatus(null);
      setTrackingStatus(null);
    } finally {
      setSkipperStatusLoading(false);
    }
  }, [isSkipper]);

  useEffect(() => {
    loadSkipperStatus();
  }, [loadSkipperStatus]);

  async function handleReportArrival(payload) {
    const movementId = skipperStatus?.movement?._id;
    if (!movementId) return;
    setArrivalSaving(true);
    try {
      stopSportMovementPositionEmitter();
      const data = await skipperReportArrival(movementId, payload);
      setArrivalModalOpen(false);
      await Swal.fire({
        icon: "success",
        title: "Arribo informado",
        text:
          data?.msg ||
          "Se notificó a las prefecturas involucradas.",
        confirmButtonText: "Aceptar",
      });
      await loadSkipperStatus();
    } finally {
      setArrivalSaving(false);
    }
  }

  const canRequestDispatch =
    !skipperStatusLoading && skipperStatus?.canRequestDispatch !== false;
  const hasPendingDispatch =
    !skipperStatusLoading && skipperStatus?.canCancelDispatchRequest === true;
  const canReportArrival =
    !skipperStatusLoading && skipperStatus?.canReportArrival === true;
  const shouldEmitGps =
    !skipperStatusLoading && trackingStatus?.shouldEmit === true;

  return (
    <Layout>
      <div className="container py-4">
        {shouldEmitGps ? (
          <div
            className="alert alert-info d-flex align-items-center gap-2 mb-3"
            role="status"
          >
            <i className="bi bi-geo-alt-fill" aria-hidden />
            <span>
              Seguimiento GPS activo — SICEN está registrando la posición de su
              buque mientras navega. Mantenga esta sesión abierta si puede.
            </span>
          </div>
        ) : null}
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
                    <Link
                      className={`${sidebarMenuBtnClass} flex-grow-1 d-flex flex-column align-items-stretch h-100 py-2 px-1 lh-sm`}
                      to="/manual-usuario"
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
                    </Link>
                  </div>
                </div>

                <UserStateBadges states={user?.states} />

                <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-xl-start mt-3">
                  <p className="mb-0">Rol:</p>
                  <span className="badge text-bg-secondary">
                    {userRoleLabel(user?.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-9">
            <h3 className="visually-hidden">Menú principal</h3>

            {isSkipper ? (
              <>
                <h4 className={SECTION_TITLE_CLASS}>Menú principal</h4>
                <div className="row row-cols-1 row-cols-md-2 g-3 mb-5">
                  <div className="col">
                    {canRequestDispatch ? (
                      <MainMenuLink
                        className="text-decoration-none"
                        to="/skipper/solicitar-despacho"
                      >
                        <div className="card h-100 shadow-sm">
                          <img
                            src="/img/salidasDepo.png"
                            alt="Solicitar despacho"
                            className="card-img-top"
                            loading="lazy"
                          />
                          <div className="card-body">
                            <div className="d-flex align-items-start gap-2">
                              <i
                                className="menu-tile-icon bi bi-send-check me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                                style={ICON_TILE}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <div className="fw-semibold text-body">
                                  SOLICITAR DESPACHO
                                </div>
                                <div className="text-muted small">
                                  {hasPendingDispatch
                                    ? "Tiene una solicitud pendiente. Puede gestionarla o cancelarla."
                                    : "Solicite autorización de salida a la prefectura de despacho."}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </MainMenuLink>
                    ) : (
                      <div
                        className="card h-100 shadow-sm opacity-50"
                        data-sicen-popover="Ya tiene un despacho autorizado en curso."
                      >
                        <img
                          src="/img/salidasDepo.png"
                          alt=""
                          className="card-img-top"
                          loading="lazy"
                        />
                        <div className="card-body">
                          <div className="d-flex align-items-start gap-2">
                            <i
                              className="menu-tile-icon bi bi-send-check me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                              style={ICON_TILE}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <div className="fw-semibold text-body">
                                SOLICITAR DESPACHO
                              </div>
                              <div className="text-muted small">
                                No disponible mientras el despacho esté
                                autorizado y en tránsito.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col">
                    {canReportArrival ? (
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none p-0 border-0 w-100 text-start h-100"
                        onClick={() => setArrivalModalOpen(true)}
                      >
                        <div className="card h-100 shadow-sm">
                          <img
                            src="/img/ingresosDepo.png"
                            alt="Informar arribo"
                            className="card-img-top"
                            loading="lazy"
                          />
                          <div className="card-body">
                            <div className="d-flex align-items-start gap-2">
                              <i
                                className="menu-tile-icon bi bi-flag-fill me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                                style={ICON_TILE}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <div className="fw-semibold text-body">
                                  INFORMAR ARRIBO
                                </div>
                                <div className="text-muted small">
                                  Informe el arribo y notifique a las
                                  prefecturas involucradas.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div
                        className="card h-100 shadow-sm opacity-50"
                        data-sicen-popover="Disponible cuando la prefectura autorice su despacho."
                      >
                        <img
                          src="/img/ingresosDepo.png"
                          alt=""
                          className="card-img-top"
                          loading="lazy"
                        />
                        <div className="card-body">
                          <div className="d-flex align-items-start gap-2">
                            <i
                              className="menu-tile-icon bi bi-flag-fill me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                              style={ICON_TILE}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <div className="fw-semibold text-body">
                                INFORMAR ARRIBO
                              </div>
                              <div className="text-muted small">
                                Aguarde la autorización del despacho.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <h4 className={SECTION_TITLE_CLASS}>Áreas de Gestión</h4>
                <div className="row row-cols-1 row-cols-md-2 g-3 mb-5">
                  <div className="col">
                    <MainMenuLink
                      className="text-decoration-none"
                      to="/skipper/mi-documentacion"
                    >
                      <div className="card h-100 shadow-sm">
                        <img
                          src="/img/ppldb.jpg"
                          alt="Mi documentación"
                          className="card-img-top"
                          loading="lazy"
                        />
                        <div className="card-body">
                          <div className="d-flex align-items-start gap-2">
                            <i
                              className="menu-tile-icon bi bi-person-vcard me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                              style={ICON_TILE}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <div className="fw-semibold text-body">
                                MI DOCUMENTACIÓN
                              </div>
                              <div className="text-muted small">
                                Brevet, certificados y documentación náutica
                                asociada a su perfil.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MainMenuLink>
                  </div>
                  <div className="col">
                    <MainMenuLink
                      className="text-decoration-none"
                      to="/skipper/mis-barcos"
                    >
                      <div className="card h-100 shadow-sm">
                        <img
                          src="/img/shipdb.jpg"
                          alt="Mis barcos"
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
                                MIS BARCOS
                              </div>
                              <div className="text-muted small">
                                Embarcaciones deportivas registradas a su
                                nombre.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MainMenuLink>
                  </div>
                </div>

                <h4 className={SECTION_TITLE_CLASS}>Ayudas al navegante</h4>
                <div className="row row-cols-1 row-cols-md-2 g-3 mb-5">
                  <div className="col">
                    <MainMenuLink
                      className="text-decoration-none"
                      to="/herramientas"
                    >
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
                                Aplicaciones de mapas, meteorología externa y
                                otras herramientas.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MainMenuLink>
                  </div>
                </div>

                <SkipperReportArrivalModal
                  open={arrivalModalOpen}
                  movement={skipperStatus?.movement}
                  onClose={() => setArrivalModalOpen(false)}
                  onSubmit={handleReportArrival}
                  saving={arrivalSaving}
                />
              </>
            ) : (
              <>
            <h4 className={SECTION_TITLE_CLASS}>Menú principal</h4>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-1 row-cols-xl-3 g-3 mb-5">
              <div className="col">
                <MainMenuLink className="text-decoration-none" to="/centinela">
                  <div className="card h-100 shadow-sm">
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
                </MainMenuLink>
              </div>

              <div className="col">
                <MainMenuLink className="text-decoration-none" to="/estado-rector-puertos">
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
                </MainMenuLink>
              </div>

              <div className="col">
                <MainMenuLink className="text-decoration-none" to="/mi-unidad">
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
                </MainMenuLink>
              </div>
            </div>

            <h4 className={SECTION_TITLE_CLASS}>Áreas de Gestión</h4>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-1 row-cols-xl-3 g-3 mb-5">
              <div className="col">
                <MainMenuLink className="text-decoration-none" to="/base-buques">
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
                            GESTIÓN DE BUQUES MERCANTES Y DEPORTIVOS
                          </div>
                          <div className="text-muted small">
                            Base de datos de buques deportivos y mercantes.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </MainMenuLink>
              </div>

              <div className="col">
                <MainMenuLink className="text-decoration-none" to="/base-gente-mar">
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
                            GESTIÓN DE GENTE DE MAR Y NAUTAS
                          </div>
                          <div className="text-muted small">
                            Base de datos de gente de mar y nautas.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </MainMenuLink>
              </div>

              <div className="col">
                <MainMenuLink className="text-decoration-none" to="/multas">
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
                </MainMenuLink>
              </div>

              <div className="col">
                <MainMenuLink className="text-decoration-none" to="/gestion-unidades">
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
                </MainMenuLink>
              </div>

              <div className="col">
                {isAdmin ? (
                  <MainMenuLink className="text-decoration-none" to="/usuarios">
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
                  </MainMenuLink>
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
                          <div className="text-muted small">Acceso solo para administradores.</div>
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
                <MainMenuLink className="text-decoration-none" to="/herramientas">
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
                </MainMenuLink>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
