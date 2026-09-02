import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { WINDY_TOOL_URL } from "../constants/externalTools.js";

const FRAMES = {
  ais: {
    title: "AIS (MarineTraffic)",
    src: "https://www.marinetraffic.com/en/ais/embed/zoom:11/centery:-34.9/centerx:-56.2/maptype:4/shownames:false/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false",
  },
  meteo: {
    title: "Windy",
    subtitle: "Vientos y temperaturas",
    externalUrl: WINDY_TOOL_URL,
    externalOnly: true,
  },
  catastro: {
    title: "Información Catastral",
    subtitle: "GeoCatastro",
    src: "http://visor.catastro.gub.uy/VisorDNC",
    iframeStyle: { height: "70vh", minHeight: "70vh" },
  },
  opensea: {
    title: "Carta Náutica",
    subtitle: "OpenSeaMap",
    src: "https://map.openseamap.org/",
    iframeStyle: { height: "70vh", minHeight: "70vh" },
  },
};

export function ToolEmbedPage() {
  const { slug } = useParams();
  const cfg = FRAMES[slug];

  if (!cfg) {
    return (
      <Layout>
        <div className="container py-4">
          <div className="alert alert-warning mb-3">Herramienta no encontrada.</div>
          <Link className="btn btn-outline-secondary btn-sm" to="/herramientas">
            Volver
          </Link>
        </div>
      </Layout>
    );
  }

  const iframeStyle = {
    width: "100%",
    display: "block",
    border: "none",
    height: 550,
    ...cfg.iframeStyle,
  };

  if (cfg.externalOnly && cfg.externalUrl) {
    return (
      <Layout>
        <div className="container py-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <h3 className="m-0">{cfg.title}</h3>
              {cfg.subtitle ? (
                <div className="text-muted small mt-1">{cfg.subtitle}</div>
              ) : null}
            </div>
            <Link className="btn btn-outline-secondary btn-sm" to="/herramientas">
              Volver
            </Link>
          </div>
          <div className="card shadow-sm">
            <div className="card-body">
              <p className="mb-3">
                Windy no permite mostrarse embebido en otras páginas. Abralo en
                una pestaña nueva para consultar vientos y temperaturas.
              </p>
              <a
                className="btn btn-primary"
                href={cfg.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir Windy
                <i
                  className="bi bi-box-arrow-up-right ms-2"
                  aria-hidden
                />
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">{cfg.title}</h3>
            {cfg.subtitle ? (
              <div className="text-muted small mt-1">{cfg.subtitle}</div>
            ) : null}
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to="/herramientas">
            Volver
          </Link>
        </div>
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <iframe
              src={cfg.src}
              style={iframeStyle}
              title={cfg.title}
              className="d-block border-0 w-100"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
