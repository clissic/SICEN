import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

const FRAMES = {
  ais: {
    title: "AIS (MarineTraffic)",
    src: "https://www.marinetraffic.com/en/ais/embed/zoom:11/centery:-34.9/centerx:-56.2/maptype:4/shownames:false/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false",
  },
  meteo: {
    title: "Windy",
    src: "https://windy.app/map/#c=-34.8925,-56.22437&z=11",
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

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">{cfg.title}</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/herramientas">
            Volver
          </Link>
        </div>
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <iframe
              src={cfg.src}
              width="100%"
              height="550"
              title={cfg.title}
              className="d-block border-0"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
