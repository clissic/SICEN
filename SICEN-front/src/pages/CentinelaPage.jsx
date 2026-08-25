import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { ThemeToggle, useBootstrapTheme } from "../components/ThemeToggle.jsx";
import { AisVesselLayer } from "../components/centinela/AisVesselLayer.jsx";
import { GraticuleLayer } from "../components/centinela/GraticuleLayer.jsx";
import { MapClickCoords } from "../components/centinela/MapClickCoords.jsx";
import { SeamarksLayer } from "../components/centinela/SeamarksLayer.jsx";
import { ZonesLayer } from "../components/centinela/ZonesLayer.jsx";
import { CENTINELA_ZONES } from "../constants/centinelaZones.js";
import { useAisVessels } from "../hooks/useAisVessels.js";
import "leaflet/dist/leaflet.css";

const MONTEVIDEO = [-34.9, -56.2];
const DEFAULT_ZOOM = 11;
const MOBILE_MQ = "(max-width: 767.98px)";

const BASE_TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize());
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_MQ).matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export function CentinelaPage() {
  const bsTheme = useBootstrapTheme();
  const isDark = bsTheme === "dark";
  const base = isDark ? BASE_TILES.dark : BASE_TILES.light;
  const isMobile = useIsMobile();

  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== "undefined"
      ? !window.matchMedia(MOBILE_MQ).matches
      : true
  );
  const [aisLayerOn, setAisLayerOn] = useState(true);
  const [seamarksOn, setSeamarksOn] = useState(true);
  const [graticuleOn, setGraticuleOn] = useState(true);
  const [zonesMenuOpen, setZonesMenuOpen] = useState(false);
  const [zoneVisibility, setZoneVisibility] = useState(() =>
    Object.fromEntries(CENTINELA_ZONES.map((z) => [z.id, true]))
  );

  const { vessels, status, error, connected } = useAisVessels({
    enabled: aisLayerOn,
  });

  useEffect(() => {
    /* Al pasar a mobile, cerrar el panel para no tapar el mapa. */
    if (isMobile) setPanelOpen(false);
    else setPanelOpen(true);
  }, [isMobile]);

  useEffect(() => {
    if (!panelOpen || !isMobile) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [panelOpen, isMobile]);

  const statusLine = useMemo(() => {
    if (!aisLayerOn) return "Capa AIS desactivada";
    if (status && status.configured === false) {
      return "AIS no configurado (definí AIS_STREAM_API_KEY en el backend)";
    }
    if (error) return error;
    if (status?.connecting) return "Conectando a AIS…";
    if (connected || status?.connected) {
      const n = vessels.length;
      if (n === 0) {
        return "AIS en vivo — esperando posiciones en la zona…";
      }
      return `AIS en vivo · ${n} buque${n === 1 ? "" : "s"}`;
    }
    if (status?.configured) {
      return "AIS conectado — esperando posiciones en la zona…";
    }
    return "Esperando datos AIS…";
  }, [aisLayerOn, status, error, connected, vessels.length]);

  const visibleZones = useMemo(
    () => CENTINELA_ZONES.filter((z) => zoneVisibility[z.id]),
    [zoneVisibility]
  );

  function toggleZoneVisibility(id) {
    setZoneVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const zonesAllOn = CENTINELA_ZONES.every((z) => zoneVisibility[z.id]);
  const zonesSomeOn = CENTINELA_ZONES.some((z) => zoneVisibility[z.id]);

  function toggleAllZones(checked) {
    setZoneVisibility(
      Object.fromEntries(CENTINELA_ZONES.map((z) => [z.id, checked]))
    );
  }

  const panelClass = [
    "centinela-glass",
    panelOpen ? "is-open" : "is-collapsed",
    isMobile ? "centinela-glass--drawer" : "centinela-glass--float",
  ].join(" ");

  return (
    <div className="centinela-page">
      <div className="centinela-page__map">
        <MapContainer
          center={MONTEVIDEO}
          zoom={DEFAULT_ZOOM}
          className="centinela-map"
          zoomControl={false}
          attributionControl
        >
          <MapInvalidateSize />
          <MapClickCoords />
          <ZoomControl position="topright" />
          <TileLayer
            key={isDark ? "dark" : "light"}
            attribution={base.attribution}
            url={base.url}
            maxZoom={19}
          />

          <GraticuleLayer enabled={graticuleOn} />
          <SeamarksLayer enabled={seamarksOn} />
          <ZonesLayer zones={visibleZones} />
          {aisLayerOn ? <AisVesselLayer vessels={vessels} /> : null}
        </MapContainer>
      </div>

      {!panelOpen ? (
        <button
          type="button"
          className="centinela-fab"
          onClick={() => setPanelOpen(true)}
          aria-expanded={false}
          aria-controls="centinela-layers-panel"
          aria-label={
            isMobile
              ? "Abrir menú de capas"
              : "Expandir panel de capas"
          }
        >
          <i className="bi bi-layers" aria-hidden />
        </button>
      ) : null}

      {panelOpen && isMobile ? (
        <button
          type="button"
          className="centinela-drawer-backdrop"
          aria-label="Cerrar menú de capas"
          onClick={() => setPanelOpen(false)}
        />
      ) : null}

      <aside
        id="centinela-layers-panel"
        className={panelClass}
        aria-label="Capas y controles de El Centinela"
        aria-hidden={!panelOpen}
        inert={!panelOpen ? true : undefined}
      >
        <div className="centinela-glass__header">
          <div className="min-w-0">
            <h1 className="centinela-glass__title">El Centinela</h1>
            <p className="centinela-glass__subtitle">
              Interfaz con capas. No sustituye una carta oficial para
              navegación.
            </p>
          </div>
          <div className="centinela-glass__actions">
            <button
              type="button"
              className="centinela-glass__collapse"
              onClick={() => setPanelOpen(false)}
              aria-label={
                isMobile ? "Cerrar menú" : "Achicar panel de capas"
              }
            >
              <i
                className={
                  isMobile ? "bi bi-x-lg" : "bi bi-chevron-left"
                }
                aria-hidden
              />
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div>
          <div className="centinela-page__layers-title">Capas</div>
          <label className="centinela-page__layer-item">
            <input
              type="checkbox"
              className="form-check-input"
              checked={graticuleOn}
              onChange={(e) => setGraticuleOn(e.target.checked)}
            />
            <span>Grilla (coordenadas)</span>
          </label>
          <label className="centinela-page__layer-item">
            <input
              type="checkbox"
              className="form-check-input"
              checked={seamarksOn}
              onChange={(e) => setSeamarksOn(e.target.checked)}
            />
            <span>Seamarks OSM</span>
          </label>
          <label className="centinela-page__layer-item">
            <input
              type="checkbox"
              className="form-check-input"
              checked={aisLayerOn}
              onChange={(e) => setAisLayerOn(e.target.checked)}
            />
            <span>AIS (experimental)</span>
          </label>

          <div className="centinela-zones">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={zonesAllOn}
                  ref={(el) => {
                    if (el) el.indeterminate = zonesSomeOn && !zonesAllOn;
                  }}
                  onChange={(e) => toggleAllZones(e.target.checked)}
                  aria-label="Mostrar u ocultar todas las zonas"
                />
              </label>
              <button
                type="button"
                className="centinela-zones__toggle"
                aria-expanded={zonesMenuOpen}
                aria-controls="centinela-zones-list"
                onClick={() => setZonesMenuOpen((o) => !o)}
              >
                <i
                  className={`bi ${
                    zonesMenuOpen ? "bi-chevron-down" : "bi-chevron-right"
                  }`}
                  aria-hidden
                />
                <span>Zonas</span>
                <span className="centinela-zones__count">
                  {visibleZones.length}/{CENTINELA_ZONES.length}
                </span>
              </button>
            </div>
            {zonesMenuOpen ? (
              <div
                id="centinela-zones-list"
                className="centinela-zones__list"
                role="group"
                aria-label="Zonas del mapa"
              >
                {CENTINELA_ZONES.map((z) => (
                  <label key={z.id} className="centinela-page__layer-item">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={Boolean(zoneVisibility[z.id])}
                      onChange={() => toggleZoneVisibility(z.id)}
                    />
                    <span>{z.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="centinela-page__status">{statusLine}</div>
        <p className="centinela-page__hint mb-0">
          El feed libre (AISStream) tiene poca cobertura en Montevideo; la mayor
          parte de los blancos suele verse del lado argentino del Río.
        </p>
        {error && aisLayerOn ? (
          <ErrorAlert
            message={error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        <Link className="centinela-glass__home" to="/home">
          <i className="bi bi-house" aria-hidden />
          Inicio
        </Link>
      </aside>
    </div>
  );
}
