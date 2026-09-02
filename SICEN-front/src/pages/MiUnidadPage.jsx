import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { useUnitFromApi } from "../hooks/useUnitFromApi.js";
import { MI_UNIDAD_DIVISIONS } from "../constants/miUnidadDivisions.js";
import { MI_UNIDAD_AREAS } from "../constants/miUnidadAreas.js";
import {
  isEmpreUnit,
  MI_UNIDAD_EMPRE_AREA_SLUGS,
  MI_UNIDAD_EMPRE_DIVISIONES,
} from "../constants/miUnidadEmpreDivisiones.js";

const ESCUDO_BASE = "/img/ESCUDO-UNIDADES-PNN";
const ESCUDO_PRENA = `${ESCUDO_BASE}/PRENA.png`;

export function MiUnidadPage() {
  const { user } = useAuth();
  const unitCode = user?.unit?.trim() || "";
  const unitCodeUpper = unitCode ? unitCode.toUpperCase() : "";
  const unitMeta = useUnitFromApi(user?.unit);

  const displayName = unitMeta?.name?.trim() || unitCodeUpper || "";
  const isEmpre = isEmpreUnit(unitCodeUpper);
  const areasToShow = isEmpre
    ? MI_UNIDAD_AREAS.filter((a) => MI_UNIDAD_EMPRE_AREA_SLUGS.includes(a.slug))
    : MI_UNIDAD_AREAS;
  const escudoSrc = unitMeta?.shieldRelativeUrl?.trim()
    ? unitMeta.shieldRelativeUrl
    : unitCodeUpper
      ? `${ESCUDO_BASE}/${encodeURIComponent(unitCodeUpper)}.png`
      : ESCUDO_PRENA;

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Mi Unidad</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="card shadow-sm mb-4 mi-unidad-resumen">
          <div className="card-body">
            {unitCodeUpper ? (
              <div className="d-flex align-items-stretch gap-3">
                <div
                  className="flex-shrink-0 align-self-stretch"
                  style={{ width: "4.5rem" }}
                >
                  <img
                    src={escudoSrc}
                    alt={`Escudo ${unitCodeUpper || "PRENA"}`}
                    className="h-100 w-100 object-fit-contain"
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.src.endsWith("/PRENA.png") || el.src.endsWith("PRENA.png")) {
                        const wrap = el.parentElement;
                        if (wrap) wrap.style.display = "none";
                        return;
                      }
                      el.src = ESCUDO_PRENA;
                    }}
                  />
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h2 className="fw-semibold mb-1">{displayName}</h2>
                  {unitCode ? (
                    <>
                      <p className="text-muted small mb-1 text-break">
                        {unitMeta?.address?.trim() || "—"}
                      </p>
                      <div className="text-muted small mb-0 d-flex flex-wrap align-items-baseline column-gap-3 row-gap-1">
                        <span className="text-nowrap">
                          Tel. {unitMeta?.phone?.trim() || "—"}
                        </span>
                        <span className="text-break">
                          <span className="me-1">Sala de radio:</span>
                          {unitMeta?.emailRadio?.trim() ? (
                            <a
                              href={`mailto:${unitMeta.emailRadio.trim()}`}
                              className="link-secondary"
                            >
                              {unitMeta.emailRadio.trim()}
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-muted mb-0">
                No tiene una unidad asignada en el sistema. Solicite la
                actualización de datos a un administrador si corresponde.
              </p>
            )}
          </div>
        </div>

        <h4 className="h6 text-muted text-uppercase mb-3">Divisiones</h4>
        {isEmpre ? (
          <div className="row row-cols-1 row-cols-md-3 g-3">
            {MI_UNIDAD_EMPRE_DIVISIONES.map((d) => (
              <div key={d.slug} className="col">
                <Link
                  className="text-decoration-none"
                  to={`/mi-unidad/${d.slug}`}
                >
                  <div className="card h-100 shadow-sm">
                  {d.imageSrc ? (
                    <img
                      src={d.imageSrc}
                      alt={d.title}
                      className="card-img-top"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="card-img-top mi-unidad-empre-img-placeholder"
                      aria-hidden
                    />
                  )}
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <i
                        className={`menu-tile-icon bi ${d.iconClass} me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0`}
                        style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="fw-semibold text-body text-break">
                          {d.title}
                        </div>
                        <div className="text-muted small text-break mt-1">
                          {d.subtitle}
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-3 g-3">
            {MI_UNIDAD_DIVISIONS.map((d) => (
              <div key={d.slug} className="col">
                <Link
                  className="text-decoration-none"
                  to={`/mi-unidad/${d.slug}`}
                >
                  <div className="card h-100 shadow-sm">
                    {d.imageSrc ? (
                      <img
                        src={d.imageSrc}
                        alt={d.title}
                        className="card-img-top"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className={`menu-tile-icon bi ${d.iconClass} me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0`}
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body text-break">
                            {d.title}
                          </div>
                          <div className="text-muted small text-break mt-1">
                            {d.subtitle}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        <h4 className="h6 text-muted text-uppercase mb-3 mt-4">
          Áreas de interés
        </h4>
        <div className="row row-cols-1 row-cols-md-3 g-3">
          {areasToShow.map((a) => (
            <div key={a.slug} className="col">
              <Link
                className="text-decoration-none"
                to={`/mi-unidad/areas/${a.slug}`}
              >
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <i
                        className={`menu-tile-icon bi ${a.iconClass} me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0`}
                        style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="fw-semibold text-body text-break">
                          {a.title}
                        </div>
                        <div className="text-muted small text-break mt-1">
                          {a.subtitle}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}