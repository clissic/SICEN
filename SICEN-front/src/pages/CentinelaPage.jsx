import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { ThemeToggle, useBootstrapTheme } from "../components/ThemeToggle.jsx";
import { AisVesselLayer } from "../components/centinela/AisVesselLayer.jsx";
import { SicenPositioningLayer } from "../components/centinela/SicenPositioningLayer.jsx";
import { GraticuleLayer } from "../components/centinela/GraticuleLayer.jsx";
import { MapClickCoords } from "../components/centinela/MapClickCoords.jsx";
import { SeamarksLayer } from "../components/centinela/SeamarksLayer.jsx";
import { BathymetryLayer } from "../components/centinela/BathymetryLayer.jsx";
import { CentinelaEnvLegendsPanel } from "../components/centinela/CentinelaEnvLegendsPanel.jsx";
import { CentinelaGebcoAttribution } from "../components/centinela/CentinelaGebcoAttribution.jsx";
import { CurrentsLayer } from "../components/centinela/CurrentsLayer.jsx";
import { WavesLayer } from "../components/centinela/WavesLayer.jsx";
import { WindLayer } from "../components/centinela/WindLayer.jsx";
import { ZonesLayer } from "../components/centinela/ZonesLayer.jsx";
import {
  CENTINELA_BREVET_CATEGORIES,
  CENTINELA_BREVET_MAP_CATEGORIES,
} from "../constants/centinelaBrevetCategories.js";
import { CENTINELA_ZONES } from "../constants/centinelaZones.js";
import {
  getCentinelaBaseTiles,
} from "../constants/centinelaMapTiles.js";
import {
  getSportPortById,
  sportPortsBySector,
  SPORT_PORT_SECTOR_LABELS,
  SPORT_PORT_SECTOR_ORDER,
} from "../constants/sportPorts.js";
import { useAisVessels } from "../hooks/useAisVessels.js";
import { useSportMovementTrackingStream } from "../hooks/useSportMovementTrackingStream.js";
import { useDocumentSicenPopovers } from "../hooks/useDocumentSicenPopovers.js";
import { circlePolygonLatLon } from "../utils/mergeCirclesPolygon.js";
import "leaflet/dist/leaflet.css";

const SPORT_PORTS_BY_SECTOR = sportPortsBySector();

const MONTEVIDEO = [-34.9, -56.2];
const DEFAULT_ZOOM = 11;
const MOBILE_MQ = "(max-width: 767.98px)";

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
  const base = getCentinelaBaseTiles(isDark);
  const isMobile = useIsMobile();
  useDocumentSicenPopovers();

  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== "undefined"
      ? !window.matchMedia(MOBILE_MQ).matches
      : true
  );
  const [aisLayerOn, setAisLayerOn] = useState(false);
  const [sicenPositioningOn, setSicenPositioningOn] = useState(true);
  const [windLayerOn, setWindLayerOn] = useState(false);
  const [envForecastHours, setEnvForecastHours] = useState(0);
  const [windStatus, setWindStatus] = useState({
    loading: false,
    error: null,
    pointCount: 0,
    time: null,
  });
  const [currentsLayerOn, setCurrentsLayerOn] = useState(false);
  const [currentsStatus, setCurrentsStatus] = useState({
    loading: false,
    error: null,
    pointCount: 0,
    time: null,
  });
  const [wavesLayerOn, setWavesLayerOn] = useState(false);
  const [wavesStatus, setWavesStatus] = useState({
    loading: false,
    error: null,
    pointCount: 0,
    time: null,
  });
  const [seamarksOn, setSeamarksOn] = useState(true);
  const [bathymetryOn, setBathymetryOn] = useState(false);
  const [bathymetryStatus, setBathymetryStatus] = useState({
    loading: false,
    error: null,
    pointCount: 0,
  });
  const [graticuleOn, setGraticuleOn] = useState(true);
  const [zonesMenuOpen, setZonesMenuOpen] = useState(false);
  const [zoneVisibility, setZoneVisibility] = useState(() =>
    Object.fromEntries(CENTINELA_ZONES.map((z) => [z.id, false]))
  );
  const [brevetsMenuOpen, setBrevetsMenuOpen] = useState(false);
  const [brevetVisibility, setBrevetVisibility] = useState(() =>
    Object.fromEntries(
      CENTINELA_BREVET_MAP_CATEGORIES.map((c) => [c.id, false])
    )
  );
  const [brevetCMenuOpen, setBrevetCMenuOpen] = useState(false);
  const [selectedBrevetCPortId, setSelectedBrevetCPortId] = useState("");

  const { vessels, status, error, connected } = useAisVessels({
    enabled: aisLayerOn,
  });
  const {
    items: trackingItems,
    error: trackingError,
    connected: trackingConnected,
  } = useSportMovementTrackingStream({ enabled: sicenPositioningOn });

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

  const windStatusLine = useMemo(() => {
    if (!windLayerOn) return "Capa de viento desactivada";
    if (windStatus.error) return windStatus.error;
    if (windStatus.loading) return "Consultando viento…";
    if (windStatus.pointCount > 0) {
      const n = windStatus.pointCount;
      let line = `${n} punto${n === 1 ? "" : "s"} en pantalla`;
      if (windStatus.time) {
        try {
          const t = new Date(windStatus.time).toLocaleString("es-UY", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          line += ` · ${t}`;
        } catch {
          /* ignore */
        }
      }
      return line;
    }
    return "Sin datos de viento";
  }, [windLayerOn, windStatus]);

  const currentsStatusLine = useMemo(() => {
    if (!currentsLayerOn) return "Capa de corrientes desactivada";
    if (currentsStatus.error) return currentsStatus.error;
    if (currentsStatus.loading) return "Consultando corrientes…";
    if (currentsStatus.pointCount > 0) {
      const n = currentsStatus.pointCount;
      let line = `${n} punto${n === 1 ? "" : "s"} en pantalla`;
      if (currentsStatus.time) {
        try {
          const t = new Date(currentsStatus.time).toLocaleString("es-UY", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          line += ` · ${t}`;
        } catch {
          /* ignore */
        }
      }
      return line;
    }
    return "Sin datos de corrientes";
  }, [currentsLayerOn, currentsStatus]);

  const wavesStatusLine = useMemo(() => {
    if (!wavesLayerOn) return "Capa de oleaje desactivada";
    if (wavesStatus.error) return wavesStatus.error;
    if (wavesStatus.loading) return "Consultando oleaje…";
    if (wavesStatus.pointCount > 0) {
      const n = wavesStatus.pointCount;
      let line = `${n} punto${n === 1 ? "" : "s"} en pantalla`;
      if (wavesStatus.time) {
        try {
          const t = new Date(wavesStatus.time).toLocaleString("es-UY", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          line += ` · ${t}`;
        } catch {
          /* ignore */
        }
      }
      return line;
    }
    return "Sin datos de oleaje";
  }, [wavesLayerOn, wavesStatus]);

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

  const sicenPositioningStatusLine = useMemo(() => {
    if (!sicenPositioningOn) return "Capa desactivada";
    if (trackingError) return trackingError;
    const n = trackingItems.length;
    if (n === 0) {
      return trackingConnected
        ? "Sin movimientos en seguimiento activo"
        : "Conectando seguimiento SICEN…";
    }
    return `${n} buque${n === 1 ? "" : "s"} en seguimiento · en vivo`;
  }, [
    sicenPositioningOn,
    trackingError,
    trackingItems.length,
    trackingConnected,
  ]);

  const visibleZones = useMemo(
    () => CENTINELA_ZONES.filter((z) => zoneVisibility[z.id]),
    [zoneVisibility]
  );

  const selectedBrevetCPort = useMemo(
    () => getSportPortById(selectedBrevetCPortId),
    [selectedBrevetCPortId]
  );

  const visibleBrevetZones = useMemo(() => {
    const zones = [];
    for (const c of CENTINELA_BREVET_MAP_CATEGORIES) {
      if (!brevetVisibility[c.id]) continue;
      if (c.portPicker) {
        if (!selectedBrevetCPort) continue;
        zones.push({
          id: `brevet-c-${selectedBrevetCPort.id}`,
          name: `Categoría C · ${selectedBrevetCPort.name} (${selectedBrevetCPort.radiusNm} MN)`,
          color: c.color,
          borderColor: c.borderColor,
          infoText: c.infoText,
          positions: circlePolygonLatLon(
            [selectedBrevetCPort.lat, selectedBrevetCPort.lon],
            selectedBrevetCPort.radiusNm
          ),
        });
        continue;
      }
      if (Array.isArray(c.positions) && c.positions.length >= 3) {
        zones.push(c);
      }
    }
    return zones;
  }, [brevetVisibility, selectedBrevetCPort]);

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

  const visibleBrevetCount = useMemo(
    () =>
      CENTINELA_BREVET_MAP_CATEGORIES.filter((c) => brevetVisibility[c.id])
        .length,
    [brevetVisibility]
  );

  function toggleBrevetVisibility(id) {
    setBrevetVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const brevetsAllOn = CENTINELA_BREVET_MAP_CATEGORIES.every(
    (c) => brevetVisibility[c.id]
  );
  const brevetsSomeOn = CENTINELA_BREVET_MAP_CATEGORIES.some(
    (c) => brevetVisibility[c.id]
  );

  function toggleAllBrevets(checked) {
    setBrevetVisibility(
      Object.fromEntries(
        CENTINELA_BREVET_MAP_CATEGORIES.map((c) => [c.id, checked])
      )
    );
  }

  const panelClass = [
    "centinela-glass",
    panelOpen ? "is-open" : "is-collapsed",
    isMobile ? "centinela-glass--drawer" : "centinela-glass--float",
  ].join(" ");

  return (
    <div className="centinela-page">
      <img
        className="centinela-page__brand"
        src="/img/Logo-PNN-Blanco.png"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="centinela-page__map">
        <MapContainer
          center={MONTEVIDEO}
          zoom={DEFAULT_ZOOM}
          className="centinela-map"
          zoomControl={false}
          attributionControl
        >
          <MapInvalidateSize />
          <MapClickCoords
            windLayerOn={windLayerOn}
            currentsLayerOn={currentsLayerOn}
            wavesLayerOn={wavesLayerOn}
            envForecastHoursOffset={envForecastHours}
            bathymetryLayerOn={bathymetryOn}
          />
          <ZoomControl position="topright" />
          <TileLayer
            key={isDark ? "dark" : "light"}
            attribution={base.attribution}
            url={base.url}
            maxZoom={19}
          />

          <BathymetryLayer
            enabled={bathymetryOn}
            onStatusChange={setBathymetryStatus}
          />
          <CentinelaGebcoAttribution visible={bathymetryOn} />
          {sicenPositioningOn ? (
            <SicenPositioningLayer items={trackingItems} />
          ) : null}
          <GraticuleLayer enabled={graticuleOn} />
          <SeamarksLayer enabled={seamarksOn} />
          <ZonesLayer zones={visibleZones} />
          <ZonesLayer zones={visibleBrevetZones} />
          {aisLayerOn ? <AisVesselLayer vessels={vessels} /> : null}
          <WavesLayer
            enabled={wavesLayerOn}
            forecastHoursOffset={envForecastHours}
            isDark={isDark}
            onStatusChange={setWavesStatus}
          />
          <CurrentsLayer
            enabled={currentsLayerOn}
            forecastHoursOffset={envForecastHours}
            isDark={isDark}
            onStatusChange={setCurrentsStatus}
          />
          <WindLayer
            enabled={windLayerOn}
            forecastHoursOffset={envForecastHours}
            isDark={isDark}
            onStatusChange={setWindStatus}
          />
        </MapContainer>
      </div>

      <div className="centinela-env-legends">
        <CentinelaEnvLegendsPanel
          bathymetryOn={bathymetryOn}
          windLayerOn={windLayerOn}
          currentsLayerOn={currentsLayerOn}
          wavesLayerOn={wavesLayerOn}
          forecastHours={envForecastHours}
          onForecastHoursChange={setEnvForecastHours}
        />
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
        <button
          type="button"
          className="centinela-glass__collapse"
          onClick={() => setPanelOpen(false)}
          aria-label={isMobile ? "Cerrar menú" : "Achicar panel de capas"}
        >
          <i
            className={isMobile ? "bi bi-x-lg" : "bi bi-chevron-left"}
            aria-hidden
          />
        </button>
        <div className="centinela-glass__body">
        <div className="centinela-glass__header">
          <div className="min-w-0">
            <h1 className="centinela-glass__title">El Centinela</h1>
            <p className="centinela-glass__subtitle">
              Interfaz con capas. No sustituye una carta oficial para
              navegación.
            </p>
          </div>
          <div className="centinela-glass__actions">
            <ThemeToggle />
          </div>
        </div>

        <div>
          <div className="centinela-page__layers-title">Capas</div>
          <div className="centinela-ais-layer">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={sicenPositioningOn}
                  onChange={(e) => setSicenPositioningOn(e.target.checked)}
                  aria-label="Mostrar u ocultar Posicionamiento SICEN"
                />
              </label>
              <div className="centinela-ais-layer__body">
                <span className="centinela-ais-layer__name">
                  Posicionamiento SICEN
                </span>
                <span
                  className="centinela-zones__count centinela-ais-layer__status"
                  data-sicen-popover={sicenPositioningStatusLine}
                  data-sicen-popover-placement="top"
                >
                  {sicenPositioningStatusLine}
                </span>
              </div>
            </div>
          </div>
          <label className="centinela-page__layer-item">
            <input
              type="checkbox"
              className="form-check-input"
              checked={graticuleOn}
              onChange={(e) => setGraticuleOn(e.target.checked)}
            />
            <span>Coordenadas</span>
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
              checked={bathymetryOn}
              onChange={(e) => setBathymetryOn(e.target.checked)}
            />
            <span>Batimetría</span>
          </label>
          <div className="centinela-ais-layer">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={windLayerOn}
                  onChange={(e) => setWindLayerOn(e.target.checked)}
                  aria-label="Mostrar u ocultar capa de viento"
                />
              </label>
              <div className="centinela-ais-layer__body">
                <span className="centinela-ais-layer__name">Viento</span>
                <span
                  className="centinela-zones__count centinela-ais-layer__status"
                  data-sicen-popover={windStatusLine}
                  data-sicen-popover-placement="top"
                >
                  {windStatusLine}
                </span>
              </div>
            </div>
          </div>
          <div className="centinela-ais-layer">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={currentsLayerOn}
                  onChange={(e) => setCurrentsLayerOn(e.target.checked)}
                  aria-label="Mostrar u ocultar capa de corrientes"
                />
              </label>
              <div className="centinela-ais-layer__body">
                <span className="centinela-ais-layer__name">Corrientes</span>
                <span
                  className="centinela-zones__count centinela-ais-layer__status"
                  data-sicen-popover={currentsStatusLine}
                  data-sicen-popover-placement="top"
                >
                  {currentsStatusLine}
                </span>
              </div>
            </div>
          </div>
          <div className="centinela-ais-layer">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={wavesLayerOn}
                  onChange={(e) => setWavesLayerOn(e.target.checked)}
                  aria-label="Mostrar u ocultar capa de oleaje"
                />
              </label>
              <div className="centinela-ais-layer__body">
                <span className="centinela-ais-layer__name">Olas</span>
                <span
                  className="centinela-zones__count centinela-ais-layer__status"
                  data-sicen-popover={wavesStatusLine}
                  data-sicen-popover-placement="top"
                >
                  {wavesStatusLine}
                </span>
              </div>
            </div>
          </div>
          <div className="centinela-ais-layer">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={aisLayerOn}
                  onChange={(e) => setAisLayerOn(e.target.checked)}
                  aria-label="Mostrar u ocultar capa AIS"
                />
              </label>
              <div className="centinela-ais-layer__body">
                <span className="centinela-ais-layer__name">
                  AIS{" "}
                  <span
                    className="centinela-ais-layer__experimental"
                    data-sicen-popover="El feed libre (AISStream) tiene poca cobertura en Montevideo; la mayor parte de los blancos suele verse del lado argentino del Río."
                    data-sicen-popover-placement="top"
                    role="button"
                    tabIndex={0}
                    aria-label="Información sobre cobertura AIS experimental"
                  >
                    EXPERIMENTAL
                  </span>
                </span>
                <span
                  className="centinela-zones__count centinela-ais-layer__status"
                  data-sicen-popover={statusLine}
                  data-sicen-popover-placement="top"
                >
                  {statusLine}
                </span>
              </div>
            </div>
          </div>

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

          <div className="centinela-zones">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={brevetsAllOn}
                  ref={(el) => {
                    if (el) el.indeterminate = brevetsSomeOn && !brevetsAllOn;
                  }}
                  onChange={(e) => toggleAllBrevets(e.target.checked)}
                  aria-label="Mostrar u ocultar todos los brevets deportivos"
                />
              </label>
              <button
                type="button"
                className="centinela-zones__toggle"
                aria-expanded={brevetsMenuOpen}
                aria-controls="centinela-brevets-list"
                onClick={() => setBrevetsMenuOpen((o) => !o)}
              >
                <i
                  className={`bi ${
                    brevetsMenuOpen ? "bi-chevron-down" : "bi-chevron-right"
                  }`}
                  aria-hidden
                />
                <span>Brevets deportivos</span>
                <span className="centinela-zones__count">
                  {visibleBrevetCount}/{CENTINELA_BREVET_MAP_CATEGORIES.length}
                </span>
              </button>
            </div>
            {brevetsMenuOpen ? (
              <div
                id="centinela-brevets-list"
                className="centinela-zones__list"
                role="group"
                aria-label="Categorías de brevets deportivos"
              >
                {CENTINELA_BREVET_CATEGORIES.map((c) => {
                  if (c.infoOnly) {
                    return (
                      <div key={c.id} className="centinela-brevet-info">
                        {c.infoText ? (
                          <span
                            className="centinela-brevet-info-icon"
                            data-sicen-popover={c.infoText}
                            data-sicen-popover-placement="top"
                            role="img"
                            aria-label={`Información de ${c.name}`}
                          >
                            <i className="bi bi-info-circle" aria-hidden />
                          </span>
                        ) : null}
                        <span>{c.name}</span>
                      </div>
                    );
                  }

                  const infoIcon = c.infoText ? (
                    <span
                      className="centinela-brevet-info-icon"
                      data-sicen-popover={c.infoText}
                      data-sicen-popover-placement="top"
                      role="img"
                      aria-label={`Información de ${c.name}`}
                    >
                      <i className="bi bi-info-circle" aria-hidden />
                    </span>
                  ) : null;

                  const row = (
                    <div className="centinela-brevet-row">
                      <label className="centinela-brevet-row__check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={Boolean(brevetVisibility[c.id])}
                          onChange={() => toggleBrevetVisibility(c.id)}
                          aria-label={`Mostrar u ocultar ${c.name}`}
                        />
                      </label>
                      {infoIcon}
                      {c.portPicker ? (
                        <button
                          type="button"
                          className="centinela-brevet-row__name-btn"
                          aria-expanded={brevetCMenuOpen}
                          aria-controls="centinela-brevet-c-ports"
                          onClick={() => setBrevetCMenuOpen((o) => !o)}
                        >
                          <span>{c.name}</span>
                          <i
                            className={`bi ${
                              brevetCMenuOpen
                                ? "bi-chevron-down"
                                : "bi-chevron-right"
                            }`}
                            aria-hidden
                          />
                          {selectedBrevetCPort ? (
                            <span className="centinela-zones__count">
                              {selectedBrevetCPort.name}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <span className="centinela-brevet-row__name">
                          {c.name}
                        </span>
                      )}
                    </div>
                  );

                  if (c.portPicker) {
                    return (
                      <div key={c.id} className="centinela-brevet-c">
                        {row}
                        {brevetCMenuOpen ? (
                          <div
                            id="centinela-brevet-c-ports"
                            className="centinela-brevet-c__picker"
                          >
                            <label
                              className="centinela-brevet-c__label"
                              htmlFor="centinela-brevet-c-select"
                            >
                              Puerto
                            </label>
                            <select
                              id="centinela-brevet-c-select"
                              className="form-select form-select-sm centinela-brevet-c__select"
                              value={selectedBrevetCPortId}
                              onChange={(e) =>
                                setSelectedBrevetCPortId(e.target.value)
                              }
                            >
                              <option value="">Elegí un puerto…</option>
                              {SPORT_PORT_SECTOR_ORDER.map((sector) => (
                                <optgroup
                                  key={sector}
                                  label={SPORT_PORT_SECTOR_LABELS[sector]}
                                >
                                  {(SPORT_PORTS_BY_SECTOR[sector] || []).map(
                                    (port) => (
                                      <option key={port.id} value={port.id}>
                                        {port.name} ({port.radiusNm} MN)
                                      </option>
                                    )
                                  )}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <div key={c.id} className="centinela-brevet-row-wrap">
                      {row}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {error && aisLayerOn ? (
          <ErrorAlert
            message={error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        {windStatus.error && windLayerOn ? (
          <ErrorAlert
            message={windStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        {currentsStatus.error && currentsLayerOn ? (
          <ErrorAlert
            message={currentsStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        {wavesStatus.error && wavesLayerOn ? (
          <ErrorAlert
            message={wavesStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        {bathymetryStatus.error && bathymetryOn ? (
          <ErrorAlert
            message={bathymetryStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        <div className="centinela-glass__footer-actions">
          <div className="centinela-glass__sim-row">
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Simular incidente de HC"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className="centinela-glass__action-btn"
                disabled
                aria-disabled="true"
                aria-label="Simular incidente de HC"
              >
                <i className="bi bi-droplet-half" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Pronosticar deriva de objeto"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className="centinela-glass__action-btn"
                disabled
                aria-disabled="true"
                aria-label="Pronosticar deriva de objeto"
              >
                <i className="bi bi-compass" aria-hidden />
              </button>
            </span>
          </div>
          <Link className="centinela-glass__home" to="/home">
            <i className="bi bi-house" aria-hidden />
            Inicio
          </Link>
        </div>
        </div>
      </aside>
    </div>
  );
}
