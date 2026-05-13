import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

const SECTION_TITLE_CLASS =
  "h5 text-muted text-uppercase mb-3 pb-2 border-bottom border-secondary-subtle";

export function ToolsMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <h3 className="m-0">Sistemas externos</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <h4 className={SECTION_TITLE_CLASS}>Aplicaciones de mapas</h4>
        <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-5">
          <div className="col">
            <Link className="text-decoration-none" to="/herramientas/ais">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/aisTool.jpg"
                  alt="AIS"
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
                      <div className="fw-semibold">
                        Sistema de Identificación Automática
                      </div>
                      <div className="text-muted small">Interfaz de MarineTraffic.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/herramientas/meteo">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/windyTool.jpg"
                  alt="Vientos y temperaturas Windy"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-cloud-sun me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">Vientos y Temperaturas</div>
                      <div className="text-muted small">Interfaz de Windy.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/herramientas/catastro">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/catastroTool.jpg"
                  alt="Información Catastral"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-map me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">Información Catastral</div>
                      <div className="text-muted small">Interfaz de GeoCatastro.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/herramientas/opensea">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/openSeaMap.jpg"
                  alt="Carta náutica OpenSeaMap"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-water me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">Carta Náutica</div>
                      <div className="text-muted small">Interfaz de OpenSeaMap.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <h4 className={SECTION_TITLE_CLASS}>Información Meteorológica</h4>
        <div className="row row-cols-1 row-cols-md-3 g-3 mb-5">
          <div className="col">
            <a
              className="text-decoration-none"
              href="https://meteo.armada.mil.uy/"
              target="_blank"
              rel="noreferrer"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/sohmaWeatherTool.jpg"
                  alt="Estaciones Meteorológicas del SOHMA"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-cloud-sun me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">
                        Estaciones Meteorológicas del SOHMA
                      </div>
                      <div className="text-muted small">Provisto por la Armada Nacional.</div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
          <div className="col">
            <a
              className="text-decoration-none"
              href="https://weather.tst.katoennatie.com.uy/"
              target="_blank"
              rel="noreferrer"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/tcpWeatherTool.jpg"
                  alt="Estaciones Meteorológicas de TCP"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-cloud-sun me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">
                        Estaciones Meteorológicas de TCP
                      </div>
                      <div className="text-muted small">
                        Provisto por Katoen Natie Terminal.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
          <div className="col">
            <a
              className="text-decoration-none"
              href="https://weather.openportguide.de/cgi-bin/weather.pl/weather.png?var=meteogram&nx=614&ny=750&lat=-34.9&lon=-56.216666666&lang=es&unit=metric&label=MONTEVIDEO"
              target="_blank"
              rel="noreferrer"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/weatherForecastTool.jpg"
                  alt="Meteograma Montevideo"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-cloud-sun me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">Meteograma Montevideo</div>
                      <div className="text-muted small">
                        Previsiones para 10 días.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>

        <h4 className={SECTION_TITLE_CLASS}>Otras herramientas</h4>
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-2 g-3">
          <div className="col">
            <a
              className="text-decoration-none"
              href="https://anteltv.com.uy/camaras"
              target="_blank"
              rel="noreferrer"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/cameraTool.jpg"
                  alt="Cámaras públicas"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-camera-video me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">Cámaras públicas</div>
                      <div className="text-muted small">Provistas por AntelTV.</div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
          <div className="col">
            <a
              className="text-decoration-none"
              href="https://www.anp.com.uy/inicio/puertos/montevideo/sistemas/consultas-sobre-arribos/consulta-de-arribos"
              target="_blank"
              rel="noreferrer"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/arriveTool.jpg"
                  alt="Consulta arribos ANP"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-calendar-check me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold">Consulta arribos</div>
                      <div className="text-muted small">
                        Sistema de la Administración Nacional de Puertos.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
