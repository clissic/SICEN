import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, useMap, AttributionControl } from "react-leaflet";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { toggleStoredBootstrapTheme, useBootstrapTheme } from "../components/ThemeToggle.jsx";
import { CentinelaDetailWindow } from "../components/centinela/CentinelaDetailWindow.jsx";
import { AisVesselLayer, AisVesselDetailBody } from "../components/centinela/AisVesselLayer.jsx";
import { SicenPositioningLayer } from "../components/centinela/SicenPositioningLayer.jsx";
import { GraticuleLayer } from "../components/centinela/GraticuleLayer.jsx";
import { GoToPointPanel } from "../components/centinela/GoToPointPanel.jsx";
import { HcSpillLayer, HcMapPickClick, useHcTimeIndex } from "../components/centinela/HcSpillLayer.jsx";
import { HcSpillPanel } from "../components/centinela/HcSpillPanel.jsx";
import {
  SarDriftLayer,
  SarMapPickClick,
  useSarTimeIndex,
} from "../components/centinela/SarDriftLayer.jsx";
import { SarDriftPanel } from "../components/centinela/SarDriftPanel.jsx";
import { MarkerFormModal } from "../components/centinela/MarkerFormModal.jsx";
import { ZoneFormModal } from "../components/centinela/ZoneFormModal.jsx";
import { CentinelaHelpModal } from "../components/centinela/CentinelaHelpModal.jsx";
import {
  CENTINELA_ADD_MARKER_EVENT,
  CENTINELA_ADD_ZONE_EVENT,
  MapClickCoords,
  openMapCoordsPopup,
} from "../components/centinela/MapClickCoords.jsx";
import { UserMarkersLayer } from "../components/centinela/UserMarkersLayer.jsx";
import { UserMarkersPanel } from "../components/centinela/UserMarkersPanel.jsx";
import {
  UserZonesLayer,
  ZoneDraftPreview,
  ZoneMapPickClick,
} from "../components/centinela/UserZonesLayer.jsx";
import { UserZonesPanel } from "../components/centinela/UserZonesPanel.jsx";
import { MapCursorScaleBar } from "../components/centinela/MapCursorScaleBar.jsx";
import { MeasureDistanceLayer } from "../components/centinela/MeasureDistanceLayer.jsx";
import { MeasureDistancePanel } from "../components/centinela/MeasureDistancePanel.jsx";
import { SeamarksLayer } from "../components/centinela/SeamarksLayer.jsx";
import { BathymetryLayer } from "../components/centinela/BathymetryLayer.jsx";
import { CentinelaEnvLegendsPanel } from "../components/centinela/CentinelaEnvLegendsPanel.jsx";
import { CentinelaGebcoAttribution } from "../components/centinela/CentinelaGebcoAttribution.jsx";
import { CentinelaMaritimeBoundariesAttribution } from "../components/centinela/CentinelaMaritimeBoundariesAttribution.jsx";
import { MaritimeBoundariesLayer } from "../components/centinela/MaritimeBoundariesLayer.jsx";
import { CentinelaFiuIuuAttribution } from "../components/centinela/CentinelaFiuIuuAttribution.jsx";
import { CentinelaGfwAttribution } from "../components/centinela/CentinelaGfwAttribution.jsx";
import { CentinelaIntelLayersPanel } from "../components/centinela/CentinelaIntelLayersPanel.jsx";
import { CurrentsLayer } from "../components/centinela/CurrentsLayer.jsx";
import { WavesLayer } from "../components/centinela/WavesLayer.jsx";
import { WindLayer } from "../components/centinela/WindLayer.jsx";
import { ZonesLayer } from "../components/centinela/ZonesLayer.jsx";
import { SkylightEventsLayer } from "../components/centinela/SkylightEventsLayer.jsx";
import { SkylightEventsList } from "../components/centinela/SkylightEventsList.jsx";
import { SkylightFramesLayer } from "../components/centinela/SkylightFramesLayer.jsx";
import { SkylightAisCrossLinks } from "../components/centinela/SkylightAisCrossLinks.jsx";
import { SkylightVesselDossierPanel } from "../components/centinela/SkylightVesselDossierPanel.jsx";
import { SkylightVesselTrackLayer } from "../components/centinela/SkylightVesselTrackLayer.jsx";
import { FiuIuuEventsLayer } from "../components/centinela/FiuIuuEventsLayer.jsx";
import { GfwEventsLayer } from "../components/centinela/GfwEventsLayer.jsx";
import {
  CENTINELA_BREVET_CATEGORIES,
  CENTINELA_BREVET_MAP_CATEGORIES,
} from "../constants/centinelaBrevetCategories.js";
import { CENTINELA_ZONES } from "../constants/centinelaZones.js";
import {
  MARITIME_BOUNDARY_LAYERS,
  MARITIME_BOUNDARY_LAYER_IDS,
  MARITIME_BOUNDARY_REMOTE_IDS,
  MARITIME_BOUNDARY_LOCAL_BY_ID,
} from "../constants/maritimeBoundaryLayers.js";
import {
  getCentinelaBaseTiles,
} from "../constants/centinelaMapTiles.js";
import {
  SKYLIGHT_DEFAULT_LOOKBACK_HOURS,
  SKYLIGHT_LAYER_ITEMS,
} from "../constants/skylightLayers.js";
import { filterVesselsByAisSources } from "../constants/aisLayers.js";
import { FIU_IUU_LAYER_IDS } from "../constants/fiuIuuLayers.js";
import {
  INTEL_GROUPS,
  INTEL_GROUP_IDS,
  INTEL_ITEM_IDS,
  createDefaultIntelVisibility,
  deriveAisSourceVisibility,
  deriveFiuVisibility,
  deriveGfwEventTypes,
  deriveSkylightVisibility,
  intelGroupVisibleItems,
} from "../constants/centinelaIntelLayers.js";
import {
  createMapMarker,
  createMapZone,
  deleteMapMarker,
  deleteMapZone,
  gfwFetchInsights,
  listMapMarkers,
  listMapZones,
  maritimeBoundariesFetch,
  skylightFetchAois,
  skylightFetchVesselDossier,
  updateMapMarker,
  updateMapZone,
} from "../api/client.js";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";
import {
  MAP_MARKER_DEFAULT_COLOR,
  MAP_MARKER_DEFAULT_ICON,
} from "../constants/centinelaMarkerIcons.js";
import {
  collectSkylightEventMmsis,
  filterSkylightEventsInBounds,
} from "../utils/skylightEventHelpers.js";
import {
  buildSyncedZonePolygons,
  matchZonesToSkylightAois,
} from "../utils/skylightZoneAoiSync.js";
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

/** Expone la instancia Leaflet al padre (FABs de zoom fuera del MapContainer). */
function BindMapRef({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

/** Cierra popups Leaflet al abrir la ventana arrastrable de un buque. */
function ClosePopupsOnVesselDetail({ active }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    map.closePopup();
  }, [active, map]);
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
  const mapRef = useRef(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [intelMenuOpen, setIntelMenuOpen] = useState(false);
  const [intelGroupOpen, setIntelGroupOpen] = useState(() =>
    Object.fromEntries(INTEL_GROUP_IDS.map((id) => [id, false]))
  );
  const [intelVisibility, setIntelVisibility] = useState(
    createDefaultIntelVisibility
  );
  const [fiuIuuStatus, setFiuIuuStatus] = useState({
    loading: false,
    error: null,
    eventCount: 0,
    configured: true,
  });
  const [selectedFiuIuuEventId, setSelectedFiuIuuEventId] = useState(null);
  const [gfwStatus, setGfwStatus] = useState({
    loading: false,
    error: null,
    eventCount: 0,
    configured: true,
  });
  const [selectedGfwEventId, setSelectedGfwEventId] = useState(null);
  const [skylightStatus, setSkylightStatus] = useState({
    loading: false,
    error: null,
    eventCount: 0,
    configured: true,
  });
  const [skylightEvents, setSkylightEvents] = useState([]);
  const [skylightBounds, setSkylightBounds] = useState(null);
  const [selectedSkylightEventId, setSelectedSkylightEventId] = useState(null);
  const [skylightListOpen, setSkylightListOpen] = useState(false);
  const [skylightAois, setSkylightAois] = useState([]);
  const [skylightAoiMatch, setSkylightAoiMatch] = useState({
    matches: [],
    byZoneId: {},
  });
  const [skylightAoiError, setSkylightAoiError] = useState(null);
  const [skylightFramesStatus, setSkylightFramesStatus] = useState({
    loading: false,
    error: null,
    frameCount: 0,
  });
  const [selectedSkylightFrameId, setSelectedSkylightFrameId] = useState(null);
  const [mapDetail, setMapDetail] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [vesselDossierPanelOpen, setVesselDossierPanelOpen] = useState(false);
  const [vesselDossier, setVesselDossier] = useState(null);
  const [vesselDossierLoading, setVesselDossierLoading] = useState(false);
  const [vesselDossierError, setVesselDossierError] = useState(null);
  const vesselDossierAbortRef = useRef(null);
  const [sicenPositioningOn, setSicenPositioningOn] = useState(true);
  const [windLayerOn, setWindLayerOn] = useState(false);
  const [envForecastHours, setEnvForecastHours] = useState(0);
  const [measureOn, setMeasureOn] = useState(false);
  const [measurePinned, setMeasurePinned] = useState(false);
  const [goToOpen, setGoToOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hcOpen, setHcOpen] = useState(false);
  const [hcPickMode, setHcPickMode] = useState(false);
  const [hcPickLatLng, setHcPickLatLng] = useState(null);
  const [hcResult, setHcResult] = useState(null);
  const [hcPlaying, setHcPlaying] = useState(false);
  const [hcTimeIndex, setHcTimeIndex] = useHcTimeIndex(hcResult, hcPlaying);
  const [sarOpen, setSarOpen] = useState(false);
  const [sarPickMode, setSarPickMode] = useState(false);
  const [sarPickLatLng, setSarPickLatLng] = useState(null);
  const [sarResult, setSarResult] = useState(null);
  const [sarPlaying, setSarPlaying] = useState(false);
  const [sarTimeIndex, setSarTimeIndex] = useSarTimeIndex(sarResult, sarPlaying);
  const [markersOn, setMarkersOn] = useState(false);
  const [markersListOpen, setMarkersListOpen] = useState(false);
  const [userMarkers, setUserMarkers] = useState([]);
  const [markersLoading, setMarkersLoading] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [markerForm, setMarkerForm] = useState(null);
  const [markerSaving, setMarkerSaving] = useState(false);
  const [markerPickMode, setMarkerPickMode] = useState(false);
  const [markerPendingPoint, setMarkerPendingPoint] = useState(null);
  const [zonesToolOn, setZonesToolOn] = useState(false);
  const [zonesListOpen, setZonesListOpen] = useState(false);
  const [userZones, setUserZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [zoneForm, setZoneForm] = useState(null);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zonePickMode, setZonePickMode] = useState(false);
  const [zonePendingPoint, setZonePendingPoint] = useState(null);
  const [zoneVertexMove, setZoneVertexMove] = useState(null);
  const [zoneDraft, setZoneDraft] = useState(null);
  const [measureMode, setMeasureMode] = useState("distance");
  const [measureUnit, setMeasureUnit] = useState("nm");
  const [measureTotalMeters, setMeasureTotalMeters] = useState(0);
  const [measureRadiusMeters, setMeasureRadiusMeters] = useState(0);
  const [measureResetKey, setMeasureResetKey] = useState(0);
  const [measureUndoKey, setMeasureUndoKey] = useState(0);
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
  const [fondeoZonesMenuOpen, setFondeoZonesMenuOpen] = useState(false);
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
  const [maritimeMenuOpen, setMaritimeMenuOpen] = useState(false);
  const [rdpMenuOpen, setRdpMenuOpen] = useState(false);
  const [maritimeVisibility, setMaritimeVisibility] = useState(() =>
    Object.fromEntries(MARITIME_BOUNDARY_LAYER_IDS.map((id) => [id, false]))
  );
  const [maritimeLayersData, setMaritimeLayersData] = useState(null);
  const [maritimeStatus, setMaritimeStatus] = useState({
    loading: false,
    error: null,
  });

  const skylightVisibility = useMemo(
    () => ({
      ...Object.fromEntries(SKYLIGHT_LAYER_ITEMS.map((l) => [l.id, false])),
      ...deriveSkylightVisibility(intelVisibility),
    }),
    [intelVisibility]
  );
  const fiuIuuVisibility = useMemo(
    () => ({
      ...Object.fromEntries(FIU_IUU_LAYER_IDS.map((id) => [id, false])),
      ...deriveFiuVisibility(intelVisibility),
    }),
    [intelVisibility]
  );
  const aisSourceVisibility = useMemo(
    () => deriveAisSourceVisibility(intelVisibility),
    [intelVisibility]
  );
  const gfwEventTypes = useMemo(
    () => deriveGfwEventTypes(intelVisibility),
    [intelVisibility]
  );
  const aisLayerOn =
    aisSourceVisibility.aisstream || aisSourceVisibility.skylight;

  const { vessels, status, error, connected } = useAisVessels({
    enabled: aisLayerOn,
  });
  const visibleAisVessels = useMemo(
    () => filterVesselsByAisSources(vessels, aisSourceVisibility),
    [vessels, aisSourceVisibility]
  );
  const {
    items: trackingItems,
    error: trackingError,
    connected: trackingConnected,
  } = useSportMovementTrackingStream({ enabled: sicenPositioningOn });

  useEffect(() => {
    /* Al pasar a mobile, cerrar el panel para no tapar el mapa. */
    if (isMobile) setPanelOpen(false);
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
      return "AIS no configurado (AISStream y/o Skylight en el backend)";
    }
    if (error) return error;
    if (status?.connecting && !status?.sources?.skylightOk) {
      return "Conectando a AIS…";
    }
    const n = visibleAisVessels.length;
    const parts = [];
    if (aisSourceVisibility.aisstream) parts.push("AISStream");
    if (aisSourceVisibility.skylight) parts.push("Skylight");
    const srcLabel = parts.length > 0 ? parts.join(" + ") : "AIS";
    if (connected || status?.connected) {
      if (n === 0) {
        return `${srcLabel} — esperando posiciones…`;
      }
      return `${srcLabel} · ${n} buque${n === 1 ? "" : "s"}`;
    }
    if (status?.configured) {
      return "AIS configurado — esperando datos…";
    }
    return "Esperando datos AIS…";
  }, [
    aisLayerOn,
    aisSourceVisibility,
    status,
    error,
    connected,
    visibleAisVessels.length,
  ]);

  const skylightActiveEventTypes = useMemo(() => {
    const types = [];
    for (const item of SKYLIGHT_LAYER_ITEMS) {
      if (item.kind === "filter" || item.kind === "frames") continue;
      if (!skylightVisibility[item.id]) continue;
      for (const t of item.eventTypes) types.push(t);
    }
    return [...new Set(types)];
  }, [skylightVisibility]);

  const skylightDarkOnly = Boolean(skylightVisibility.dark_only);
  const skylightFramesOn = Boolean(skylightVisibility.satellite_frames);
  const skylightAoiLayersOn = Boolean(
    skylightVisibility.aoi_visit || skylightVisibility.speed_range
  );
  const skylightEventsOn =
    skylightActiveEventTypes.length > 0 || skylightDarkOnly;
  const skylightLayerOn = skylightEventsOn || skylightFramesOn;

  const fiuIuuActiveLayerTypes = useMemo(
    () => FIU_IUU_LAYER_IDS.filter((id) => fiuIuuVisibility[id]),
    [fiuIuuVisibility]
  );
  const fiuIuuEventsOn = fiuIuuActiveLayerTypes.length > 0;

  const skylightViewportEvents = useMemo(() => {
    const filtered = filterSkylightEventsInBounds(
      skylightEvents,
      skylightBounds
    );
    return [...filtered].sort((a, b) => {
      const ta = a.startTime ? Date.parse(a.startTime) : 0;
      const tb = b.startTime ? Date.parse(b.startTime) : 0;
      return tb - ta;
    });
  }, [skylightEvents, skylightBounds]);

  const skylightEventMmsiSet = useMemo(
    () => collectSkylightEventMmsis(skylightEvents),
    [skylightEvents]
  );

  const aisMmsiSet = useMemo(() => {
    const set = new Set();
    for (const v of visibleAisVessels || []) {
      const mmsi = String(v.mmsi ?? "").trim();
      if (/^\d{5,9}$/.test(mmsi)) set.add(mmsi);
    }
    return set;
  }, [visibleAisVessels]);

  const matchedAisSkylightMmsis = useMemo(() => {
    const set = new Set();
    for (const mmsi of skylightEventMmsiSet) {
      if (aisMmsiSet.has(mmsi)) set.add(mmsi);
    }
    return set;
  }, [skylightEventMmsiSet, aisMmsiSet]);

  const openMapDetail = useCallback((detail) => {
    if (!detail) return;
    setMapDetail(detail);
  }, []);

  const closeMapDetail = useCallback(() => {
    setMapDetail(null);
    setSelectedFiuIuuEventId(null);
    setSelectedGfwEventId(null);
    setSelectedSkylightEventId(null);
  }, []);

  const openVesselDossier = useCallback((payload) => {
    const mmsi = String(payload?.mmsi ?? "").trim();
    if (!/^\d{5,9}$/.test(mmsi)) return;
    setSelectedVessel({
      mmsi,
      name: payload?.name?.trim() || null,
      lat: Number.isFinite(Number(payload?.lat)) ? Number(payload.lat) : null,
      lon: Number.isFinite(Number(payload?.lon)) ? Number(payload.lon) : null,
      speedKts: Number.isFinite(Number(payload?.speedKts))
        ? Number(payload.speedKts)
        : Number.isFinite(Number(payload?.sog))
          ? Number(payload.sog)
          : null,
      heading: Number.isFinite(Number(payload?.heading))
        ? Number(payload.heading)
        : Number.isFinite(Number(payload?.cog))
          ? Number(payload.cog)
          : null,
    });
    setVesselDossierPanelOpen(true);
  }, []);

  const minimizeVesselDossier = useCallback(() => {
    setVesselDossierPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!selectedVessel?.mmsi) {
      setVesselDossier(null);
      setVesselDossierError(null);
      setVesselDossierLoading(false);
      return undefined;
    }

    let cancelled = false;
    vesselDossierAbortRef.current?.abort();
    const ac = new AbortController();
    vesselDossierAbortRef.current = ac;

    (async () => {
      setVesselDossierLoading(true);
      setVesselDossierError(null);
      try {
        const [data, gfw] = await Promise.all([
          skylightFetchVesselDossier(
            {
              mmsi: selectedVessel.mmsi,
              lat: selectedVessel.lat,
              lon: selectedVessel.lon,
              speedKts: selectedVessel.speedKts,
              heading: selectedVessel.heading,
              lookbackHours: SKYLIGHT_DEFAULT_LOOKBACK_HOURS,
            },
            { signal: ac.signal }
          ),
          gfwFetchInsights(
            { mmsi: selectedVessel.mmsi },
            { signal: ac.signal }
          ).catch(() => null),
        ]);
        if (cancelled) return;
        setVesselDossier({
          ...data,
          gfwInsights: gfw || null,
        });
        setVesselDossierLoading(false);
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        setVesselDossier(null);
        setVesselDossierError(
          e?.message || e?.msg || "No se pudo cargar el dossier del buque."
        );
        setVesselDossierLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selectedVessel]);

  useEffect(() => {
    if (!skylightLayerOn) {
      setSkylightEvents([]);
      setSelectedSkylightEventId(null);
      setSelectedSkylightFrameId(null);
      setSkylightListOpen(false);
    }
  }, [skylightLayerOn]);

  useEffect(() => {
    if (!skylightAoiLayersOn) {
      setSkylightAois([]);
      setSkylightAoiMatch({ matches: [], byZoneId: {} });
      setSkylightAoiError(null);
      return undefined;
    }

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const data = await skylightFetchAois(
          { limit: 100 },
          { signal: ac.signal }
        );
        if (cancelled) return;
        const aois = Array.isArray(data?.aois) ? data.aois : [];
        setSkylightAois(aois);
        setSkylightAoiMatch(matchZonesToSkylightAois(CENTINELA_ZONES, aois));
        setSkylightAoiError(null);
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        setSkylightAois([]);
        setSkylightAoiMatch({ matches: [], byZoneId: {} });
        setSkylightAoiError(
          e?.message || e?.msg || "No se pudieron sincronizar las AOIs."
        );
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [skylightAoiLayersOn]);

  const visibleZoneIds = useMemo(
    () =>
      CENTINELA_ZONES.filter((z) => zoneVisibility[z.id]).map((z) => z.id),
    [zoneVisibility]
  );

  const skylightAoiIdsForQuery = useMemo(() => {
    if (!skylightAoiLayersOn) return [];
    const byZoneId = skylightAoiMatch.byZoneId || {};
    const fromVisible = visibleZoneIds
      .map((id) => byZoneId[id])
      .filter(Boolean);
    if (fromVisible.length > 0) return [...new Set(fromVisible)];
    return [...new Set(Object.values(byZoneId).filter(Boolean))];
  }, [skylightAoiLayersOn, skylightAoiMatch, visibleZoneIds]);

  const skylightSyncedZones = useMemo(() => {
    if (!skylightAoiLayersOn) return [];
    const zonesForSync =
      visibleZoneIds.length > 0
        ? CENTINELA_ZONES.filter((z) => visibleZoneIds.includes(z.id))
        : CENTINELA_ZONES;
    return buildSyncedZonePolygons(
      zonesForSync,
      skylightAois,
      skylightAoiMatch.byZoneId
    );
  }, [
    skylightAoiLayersOn,
    visibleZoneIds,
    skylightAois,
    skylightAoiMatch,
  ]);

  function toggleAllIntel(checked) {
    setIntelVisibility((prev) => {
      const next = { ...prev };
      for (const id of INTEL_ITEM_IDS) next[id] = checked;
      return next;
    });
  }

  function toggleIntelGroupItems(groupId, checked) {
    const group = INTEL_GROUPS.find((g) => g.id === groupId);
    const items = intelGroupVisibleItems(group);
    setIntelVisibility((prev) => {
      const next = { ...prev };
      for (const item of items) next[item.id] = checked;
      return next;
    });
  }

  function toggleIntelItem(id) {
    setIntelVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  const gfwEventsOn = gfwEventTypes.length > 0;
  const gfwStatusLine = useMemo(() => {
    if (!gfwEventsOn) return "";
    if (gfwStatus.error) return gfwStatus.error;
    if (gfwStatus.loading) return "Consultando GFW…";
    const n = gfwStatus.eventCount || 0;
    return n === 0
      ? "GFW: sin eventos en la vista"
      : `GFW: ${n} evento${n === 1 ? "" : "s"}`;
  }, [gfwEventsOn, gfwStatus]);

  const fiuIuuStatusLine = useMemo(() => {
    if (!fiuIuuEventsOn) return "Capas IUU LAC desactivadas";
    if (fiuIuuStatus.error) return fiuIuuStatus.error;
    if (fiuIuuStatus.loading) return "Consultando FIU IUU…";
    const n = fiuIuuStatus.eventCount || 0;
    if (n === 0) {
      return "Sin eventos en la vista (hotspots LAC)";
    }
    return `${n} evento${n === 1 ? "" : "s"} · Windward vía FIU`;
  }, [fiuIuuEventsOn, fiuIuuStatus]);

  const skylightStatusLine = useMemo(() => {
    if (!skylightLayerOn) return "Capas Skylight desactivadas";
    if (skylightStatus.error) return skylightStatus.error;
    if (skylightFramesStatus.error) return skylightFramesStatus.error;
    if (skylightAoiError) return skylightAoiError;
    if (skylightStatus.loading || skylightFramesStatus.loading) {
      return "Consultando Skylight…";
    }
    const parts = [];
    if (skylightEventsOn) {
      const n = skylightStatus.eventCount || 0;
      parts.push(
        n === 0
          ? "sin eventos"
          : `${n} evento${n === 1 ? "" : "s"}`
      );
    }
    if (skylightFramesOn) {
      const n = skylightFramesStatus.frameCount || 0;
      parts.push(
        n === 0
          ? "sin pasadas"
          : `${n} pasada${n === 1 ? "" : "s"}`
      );
    }
    if (skylightAoiLayersOn) {
      const m = skylightAoiMatch.matches?.length || 0;
      parts.push(
        m === 0
          ? "AOIs sin emparejar"
          : `${m} zona${m === 1 ? "" : "s"}↔AOI`
      );
    }
    if (parts.length === 0) return "Skylight activo";
    return `${parts.join(" · ")} · 7 días`;
  }, [
    skylightLayerOn,
    skylightStatus,
    skylightFramesStatus,
    skylightAoiError,
    skylightEventsOn,
    skylightFramesOn,
    skylightAoiLayersOn,
    skylightAoiMatch,
  ]);

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
      if (Array.isArray(c.rings) && c.rings.length) {
        zones.push(c);
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

  const visibleMaritimeCount = useMemo(
    () =>
      MARITIME_BOUNDARY_LAYER_IDS.filter((id) => maritimeVisibility[id]).length,
    [maritimeVisibility]
  );
  const maritimeAllOn = MARITIME_BOUNDARY_LAYER_IDS.every(
    (id) => maritimeVisibility[id]
  );
  const maritimeSomeOn = MARITIME_BOUNDARY_LAYER_IDS.some(
    (id) => maritimeVisibility[id]
  );

  function toggleMaritimeVisibility(id) {
    setMaritimeVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAllMaritime(checked) {
    setMaritimeVisibility(
      Object.fromEntries(MARITIME_BOUNDARY_LAYER_IDS.map((id) => [id, checked]))
    );
  }

  const visibleMaritimeZones = useMemo(() => {
    const zones = [];
    if (maritimeLayersData?.layers) {
      for (const id of MARITIME_BOUNDARY_REMOTE_IDS) {
        if (!maritimeVisibility[id]) continue;
        const layer = maritimeLayersData.layers[id];
        if (Array.isArray(layer?.zones)) zones.push(...layer.zones);
      }
    }
    for (const id of Object.keys(MARITIME_BOUNDARY_LOCAL_BY_ID)) {
      if (!maritimeVisibility[id]) continue;
      const local = MARITIME_BOUNDARY_LOCAL_BY_ID[id];
      if (!Array.isArray(local?.positions) || local.positions.length < 3) {
        continue;
      }
      zones.push({
        id: local.id,
        name: local.label,
        color: local.color,
        borderColor: local.borderColor,
        fillOpacity: local.fillOpacity ?? 0.12,
        infoText: local.infoText,
        positions: local.positions,
      });
    }
    return zones;
  }, [maritimeLayersData, maritimeVisibility]);

  useEffect(() => {
    const needed = MARITIME_BOUNDARY_REMOTE_IDS.filter(
      (id) => maritimeVisibility[id]
    );
    if (!needed.length) return undefined;

    const missing = needed.filter((id) => !maritimeLayersData?.layers?.[id]);
    if (!missing.length) return undefined;

    let cancelled = false;
    setMaritimeStatus({ loading: true, error: null });
    maritimeBoundariesFetch(missing)
      .then((res) => {
        if (cancelled) return;
        setMaritimeLayersData((prev) => ({
          ...(prev || {}),
          layers: {
            ...(prev?.layers || {}),
            ...(res?.layers || {}),
          },
          attribution: res?.attribution || prev?.attribution,
          source: res?.source || prev?.source,
        }));
        setMaritimeStatus({ loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setMaritimeStatus({
          loading: false,
          error:
            e?.message ||
            "No se pudieron cargar los límites marítimos (MarineRegions).",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [maritimeVisibility, maritimeLayersData]);

  const zonasSectionTotal =
    CENTINELA_ZONES.length +
    CENTINELA_BREVET_MAP_CATEGORIES.length +
    MARITIME_BOUNDARY_LAYER_IDS.length;
  const zonasSectionOnCount =
    visibleZones.length + visibleBrevetCount + visibleMaritimeCount;
  const zonasSectionAllOn = zonesAllOn && brevetsAllOn && maritimeAllOn;
  const zonasSectionSomeOn = zonesSomeOn || brevetsSomeOn || maritimeSomeOn;

  function toggleAllZonasSection(checked) {
    toggleAllZones(checked);
    toggleAllBrevets(checked);
    toggleAllMaritime(checked);
  }

  async function refreshUserMarkers() {
    setMarkersLoading(true);
    try {
      const res = await listMapMarkers();
      setUserMarkers(Array.isArray(res?.markers) ? res.markers : []);
    } catch (e) {
      setUserMarkers([]);
      console.error(e);
    } finally {
      setMarkersLoading(false);
    }
  }

  useEffect(() => {
    if (!markersOn) {
      setMarkersListOpen(false);
      setSelectedMarkerId(null);
      return undefined;
    }
    void refreshUserMarkers();
    return undefined;
  }, [markersOn]);

  useEffect(() => {
    function onAddMarker(e) {
      const lat = Number(e?.detail?.lat);
      const lng = Number(e?.detail?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!markersOn) setMarkersOn(true);
      setMarkerPickMode(false);
      setMarkerPendingPoint(null);
      setMarkerForm({
        mode: "create",
        initial: {
          lat,
          lng,
          name: "",
          icon: MAP_MARKER_DEFAULT_ICON,
          color: MAP_MARKER_DEFAULT_COLOR,
        },
      });
    }
    window.addEventListener(CENTINELA_ADD_MARKER_EVENT, onAddMarker);
    return () => {
      window.removeEventListener(CENTINELA_ADD_MARKER_EVENT, onAddMarker);
    };
  }, [markersOn]);

  useEffect(() => {
    function onAddZone(e) {
      const lat = Number(e?.detail?.lat);
      const lng = Number(e?.detail?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setZonesToolOn(true);
      setZonesListOpen(false);
      setMarkerPickMode(false);
      setZonePendingPoint(null);
      setZoneVertexMove(null);
      setZoneDraft(null);
      setZonePickMode(true);
      setZoneForm({
        mode: "create",
        initial: {
          name: "",
          color: MAP_MARKER_DEFAULT_COLOR,
          positions: [[lat, lng]],
        },
      });
    }
    window.addEventListener(CENTINELA_ADD_ZONE_EVENT, onAddZone);
    return () => {
      window.removeEventListener(CENTINELA_ADD_ZONE_EVENT, onAddZone);
    };
  }, []);

  async function handleSaveMarker(payload) {
    setMarkerSaving(true);
    try {
      if (markerForm?.mode === "edit" && markerForm?.initial?._id) {
        await updateMapMarker(markerForm.initial._id, payload);
      } else {
        await createMapMarker(payload);
      }
      closeMarkerForm();
      if (!markersOn) setMarkersOn(true);
      else await refreshUserMarkers();
    } catch (e) {
      throw e;
    } finally {
      setMarkerSaving(false);
    }
  }

  function closeMarkerForm() {
    setMarkerForm(null);
    setMarkerPickMode(false);
    setMarkerPendingPoint(null);
  }

  async function handleDeleteMarker(m) {
    const id = m?._id || m?.id;
    if (!id) return;
    const result = await confirmDelete({
      resource: "marcador",
      summaryHtml: `<ul class="mb-2 ps-3"><li><strong>Nombre:</strong> ${escapeHtml(
        m.name || "—"
      )}</li></ul>`,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deleteMapMarker(id);
      notifyDeleteSuccess(res?.msg || "Marcador eliminado.");
      if (String(selectedMarkerId) === String(id)) setSelectedMarkerId(null);
      await refreshUserMarkers();
    } catch (err) {
      notifyDeleteError(err, "No se pudo eliminar el marcador.");
    }
  }

  async function handleToggleMarkerHidden(m) {
    const id = m?._id || m?.id;
    if (!id) return;
    const nextHidden = !m.hidden;
    try {
      await updateMapMarker(id, { hidden: nextHidden });
      setUserMarkers((list) =>
        list.map((item) =>
          String(item._id || item.id) === String(id)
            ? { ...item, hidden: nextHidden }
            : item
        )
      );
    } catch (e) {
      console.error(e);
    }
  }

  function flyToMarker(m) {
    const map = mapRef.current;
    if (!map || !Number.isFinite(m?.lat) || !Number.isFinite(m?.lng)) return;
    setSelectedMarkerId(m._id || m.id || null);
    map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }

  async function refreshUserZones() {
    setZonesLoading(true);
    try {
      const res = await listMapZones();
      setUserZones(Array.isArray(res?.zones) ? res.zones : []);
    } catch (e) {
      setUserZones([]);
      console.error(e);
    } finally {
      setZonesLoading(false);
    }
  }

  useEffect(() => {
    if (!zonesToolOn) {
      setZonesListOpen(false);
      setSelectedZoneId(null);
      return undefined;
    }
    void refreshUserZones();
    return undefined;
  }, [zonesToolOn]);

  function closeZoneForm() {
    setZoneForm(null);
    setZonePickMode(false);
    setZonePendingPoint(null);
    setZoneVertexMove(null);
    setZoneDraft(null);
  }

  async function handleSaveZone(payload) {
    setZoneSaving(true);
    try {
      if (zoneForm?.mode === "edit" && zoneForm?.initial?._id) {
        await updateMapZone(zoneForm.initial._id, payload);
      } else {
        await createMapZone(payload);
      }
      closeZoneForm();
      if (!zonesToolOn) setZonesToolOn(true);
      else await refreshUserZones();
    } catch (e) {
      throw e;
    } finally {
      setZoneSaving(false);
    }
  }

  async function handleDeleteZone(z) {
    const id = z?._id || z?.id;
    if (!id) return;
    const result = await confirmDelete({
      resource: "zona",
      summaryHtml: `<ul class="mb-2 ps-3"><li><strong>Nombre:</strong> ${escapeHtml(
        z.name || "—"
      )}</li></ul>`,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deleteMapZone(id);
      notifyDeleteSuccess(res?.msg || "Zona eliminada.");
      if (String(selectedZoneId) === String(id)) setSelectedZoneId(null);
      await refreshUserZones();
    } catch (err) {
      notifyDeleteError(err, "No se pudo eliminar la zona.");
    }
  }

  async function handleToggleZoneHidden(z) {
    const id = z?._id || z?.id;
    if (!id) return;
    const nextHidden = !z.hidden;
    try {
      await updateMapZone(id, { hidden: nextHidden });
      setUserZones((list) =>
        list.map((item) =>
          String(item._id || item.id) === String(id)
            ? { ...item, hidden: nextHidden }
            : item
        )
      );
    } catch (e) {
      console.error(e);
    }
  }

  function fitToZone(z) {
    const map = mapRef.current;
    const pts = Array.isArray(z?.positions) ? z.positions : [];
    if (!map || pts.length < 1) return;
    setSelectedZoneId(z._id || z.id || null);
    const latlngs = pts
      .map((p) => [Number(p?.[0]), Number(p?.[1])])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (latlngs.length === 0) return;
    map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 14 });
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
          attributionControl={false}
        >
          <AttributionControl prefix={false} position="bottomright" />
          <MapInvalidateSize />
          <BindMapRef mapRef={mapRef} />
          <ClosePopupsOnVesselDetail active={Boolean(mapDetail)} />
          <MapClickCoords
            enabled={
              !(measureOn && !measurePinned) &&
              !hcPickMode &&
              !sarPickMode &&
              !zonePickMode &&
              !markerPickMode
            }
            windLayerOn={windLayerOn}
            currentsLayerOn={currentsLayerOn}
            wavesLayerOn={wavesLayerOn}
            envForecastHoursOffset={envForecastHours}
            bathymetryLayerOn={bathymetryOn}
          />
          <ZoneMapPickClick
            active={zonePickMode || markerPickMode}
            onPick={(ll) => {
              const point = { ...ll, t: Date.now() };
              if (zonePickMode) setZonePendingPoint(point);
              else if (markerPickMode) {
                setMarkerPendingPoint(point);
                setMarkerPickMode(false);
              }
            }}
          />
          <HcMapPickClick
            active={hcPickMode}
            onPick={(ll) => {
              setHcPickLatLng(ll);
              setHcPickMode(false);
            }}
          />
          <HcSpillLayer
            enabled={Boolean(hcResult)}
            result={hcResult}
            timeIndex={hcTimeIndex}
          />
          <SarMapPickClick
            active={sarPickMode}
            onPick={(ll) => {
              setSarPickLatLng(ll);
              setSarPickMode(false);
            }}
          />
          <SarDriftLayer
            enabled={Boolean(sarResult)}
            result={sarResult}
            timeIndex={sarTimeIndex}
          />
          <MapCursorScaleBar
            enabled
            showCursorCoords={!isMobile}
          />
          {measureOn || measurePinned ? (
            <MeasureDistanceLayer
              active={measureOn && !measurePinned}
              pinned={measurePinned}
              mode={measureMode}
              unit={measureUnit}
              resetKey={measureResetKey}
              undoKey={measureUndoKey}
              onTotalMetersChange={setMeasureTotalMeters}
              onRadiusMetersChange={setMeasureRadiusMeters}
            />
          ) : null}
          {markersOn ? (
            <UserMarkersLayer
              markers={userMarkers}
              selectedId={selectedMarkerId}
              onSelect={flyToMarker}
              onEdit={(m) => {
                setMarkerPickMode(false);
                setMarkerPendingPoint(null);
                setMarkerForm({
                  mode: "edit",
                  initial: m,
                });
              }}
              onDelete={(m) => {
                void handleDeleteMarker(m);
              }}
            />
          ) : null}
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
          <CentinelaMaritimeBoundariesAttribution
            visible={MARITIME_BOUNDARY_REMOTE_IDS.some(
              (id) => maritimeVisibility[id]
            )}
          />
          {sicenPositioningOn ? (
            <SicenPositioningLayer
              items={trackingItems}
              onOpenDetail={openMapDetail}
            />
          ) : null}
          <GraticuleLayer enabled={graticuleOn} />
          <SeamarksLayer enabled={seamarksOn} lightenLabels={isDark} />
          <ZonesLayer zones={visibleZones} />
          <ZonesLayer zones={visibleBrevetZones} />
          <MaritimeBoundariesLayer
            enabled={visibleMaritimeCount > 0}
            zones={visibleMaritimeZones}
          />
          {zonesToolOn ? <UserZonesLayer zones={userZones} /> : null}
          {zoneForm && zoneDraft?.vertices?.length ? (
            <ZoneDraftPreview
              vertices={zoneDraft.vertices}
              color={zoneDraft.color}
              onVertexDragEnd={(index, lat, lng) => {
                setZoneVertexMove({ index, lat, lng, t: Date.now() });
              }}
            />
          ) : null}
          {skylightSyncedZones.length > 0 ? (
            <ZonesLayer zones={skylightSyncedZones} />
          ) : null}
          {aisLayerOn ? (
            <AisVesselLayer
              vessels={visibleAisVessels}
              matchedMmsis={matchedAisSkylightMmsis}
              selectedMmsi={selectedVessel?.mmsi ?? null}
              onSelectVessel={(v) => {
                const mmsi = String(v.mmsi);
                openMapDetail({
                  id: `ais:${mmsi}`,
                  title: v.name?.trim() || `MMSI ${mmsi}`,
                  body: (
                    <AisVesselDetailBody
                      vessel={v}
                      matched={matchedAisSkylightMmsis.has(mmsi)}
                      onOpenDossier={(vessel) =>
                        openVesselDossier({
                          mmsi: vessel.mmsi,
                          name: vessel.name,
                          lat: vessel.lat,
                          lon: vessel.lon,
                          sog: vessel.sog,
                          heading: vessel.heading ?? vessel.cog,
                        })
                      }
                    />
                  ),
                });
              }}
            />
          ) : null}
          <SkylightEventsLayer
            enabled={skylightEventsOn}
            eventTypes={skylightActiveEventTypes}
            darkOnly={skylightDarkOnly}
            aoiIds={skylightAoiIdsForQuery}
            selectedEventId={selectedSkylightEventId}
            matchedAisMmsis={matchedAisSkylightMmsis}
            selectedMmsi={selectedVessel?.mmsi ?? null}
            onStatusChange={setSkylightStatus}
            onEventsChange={setSkylightEvents}
            onBoundsChange={setSkylightBounds}
            onSelectEvent={setSelectedSkylightEventId}
            onOpenVesselDossier={openVesselDossier}
            onOpenDetail={openMapDetail}
          />
          {aisLayerOn && skylightEventsOn ? (
            <SkylightAisCrossLinks
              vessels={visibleAisVessels}
              events={skylightEvents}
              matchedMmsis={matchedAisSkylightMmsis}
              selectedMmsi={selectedVessel?.mmsi ?? null}
            />
          ) : null}
          <SkylightVesselTrackLayer
            dossier={vesselDossier}
            onOpenDetail={openMapDetail}
          />
          <SkylightFramesLayer
            enabled={skylightFramesOn}
            onStatusChange={setSkylightFramesStatus}
            selectedFrameId={selectedSkylightFrameId}
            onSelectFrame={setSelectedSkylightFrameId}
          />
          <FiuIuuEventsLayer
            enabled={fiuIuuEventsOn}
            layerTypes={fiuIuuActiveLayerTypes}
            selectedEventId={selectedFiuIuuEventId}
            onStatusChange={setFiuIuuStatus}
            onSelectEvent={setSelectedFiuIuuEventId}
            onOpenDetail={openMapDetail}
          />
          <GfwEventsLayer
            enabled={gfwEventsOn}
            eventTypes={gfwEventTypes}
            selectedEventId={selectedGfwEventId}
            onStatusChange={setGfwStatus}
            onSelectEvent={setSelectedGfwEventId}
            onOpenDetail={openMapDetail}
          />
          <CentinelaFiuIuuAttribution visible={fiuIuuEventsOn} />
          <CentinelaGfwAttribution
            visible={gfwEventsOn || aisLayerOn}
          />
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

      <CentinelaDetailWindow
        open={Boolean(mapDetail)}
        title={mapDetail?.title || "Detalle"}
        onClose={closeMapDetail}
      >
        {mapDetail?.body}
      </CentinelaDetailWindow>

      <div
        className={[
          "centinela-env-legends",
          markerForm || zoneForm ? "centinela-env-legends--form-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CentinelaEnvLegendsPanel
          bathymetryOn={bathymetryOn}
          windLayerOn={windLayerOn}
          currentsLayerOn={currentsLayerOn}
          wavesLayerOn={wavesLayerOn}
          forecastHours={envForecastHours}
          onForecastHoursChange={setEnvForecastHours}
        />
        {measureOn ? (
          <MeasureDistancePanel
            unit={measureUnit}
            onUnitChange={setMeasureUnit}
            mode={measureMode}
            onModeChange={setMeasureMode}
            totalMeters={measureTotalMeters}
            pinned={measurePinned}
            onUndo={() => setMeasureUndoKey((k) => k + 1)}
            onReset={() => {
              setMeasureResetKey((k) => k + 1);
              setMeasureTotalMeters(0);
              setMeasureRadiusMeters(0);
              setMeasurePinned(false);
            }}
            onPin={() => setMeasurePinned((p) => !p)}
            onClose={() => {
              setMeasureOn(false);
              setMeasurePinned(false);
              setMeasureTotalMeters(0);
              setMeasureRadiusMeters(0);
              setMeasureMode("distance");
              setMeasureResetKey((k) => k + 1);
            }}
          />
        ) : null}
        {goToOpen ? (
          <GoToPointPanel
            onClose={() => setGoToOpen(false)}
            onGo={({ lat, lng }) => {
              const map = mapRef.current;
              if (!map) return;
              setGoToOpen(false);
              const targetZoom = Math.max(map.getZoom(), 11);
              const center = map.getCenter();
              const alreadyThere =
                Math.abs(center.lat - lat) < 1e-7 &&
                Math.abs(center.lng - lng) < 1e-7 &&
                map.getZoom() === targetZoom;

              const openPopup = () => {
                openMapCoordsPopup(map, lat, lng, {
                  windLayerOn,
                  currentsLayerOn,
                  wavesLayerOn,
                  bathymetryLayerOn: bathymetryOn,
                  envForecastHoursOffset: envForecastHours,
                });
              };

              if (alreadyThere) {
                openPopup();
                return;
              }
              map.once("moveend", openPopup);
              map.flyTo([lat, lng], targetZoom);
            }}
          />
        ) : null}
        {hcOpen ? (
          <HcSpillPanel
            pickLatLng={hcPickLatLng}
            pickActive={hcPickMode}
            onPickRequest={() => setHcPickMode(true)}
            result={hcResult}
            onResult={(r) => {
              setHcResult(r);
              const lat = r?.meta?.releaseLat;
              const lon = r?.meta?.releaseLon;
              const map = mapRef.current;
              if (map && Number.isFinite(lat) && Number.isFinite(lon)) {
                map.flyTo([lat, lon], Math.max(map.getZoom(), 9));
              }
            }}
            onClear={() => {
              setHcResult(null);
              setHcPlaying(false);
              setHcPickLatLng(null);
              setHcPickMode(false);
            }}
            onClose={() => {
              setHcOpen(false);
              setHcPickMode(false);
              setHcResult(null);
              setHcPlaying(false);
              setHcPickLatLng(null);
            }}
            timeIndex={hcTimeIndex}
            onTimeIndexChange={setHcTimeIndex}
            playing={hcPlaying}
            onPlayingChange={setHcPlaying}
          />
        ) : null}
        {sarOpen ? (
          <SarDriftPanel
            pickLatLng={sarPickLatLng}
            pickActive={sarPickMode}
            onPickRequest={() => setSarPickMode(true)}
            result={sarResult}
            onResult={(r) => {
              setSarResult(r);
              const lat = r?.meta?.releaseLat;
              const lon = r?.meta?.releaseLon;
              const map = mapRef.current;
              if (map && Number.isFinite(lat) && Number.isFinite(lon)) {
                map.flyTo([lat, lon], Math.max(map.getZoom(), 9));
              }
            }}
            onClear={() => {
              setSarResult(null);
              setSarPlaying(false);
              setSarPickLatLng(null);
              setSarPickMode(false);
            }}
            onClose={() => {
              setSarOpen(false);
              setSarPickMode(false);
              setSarResult(null);
              setSarPlaying(false);
              setSarPickLatLng(null);
            }}
            timeIndex={sarTimeIndex}
            onTimeIndexChange={setSarTimeIndex}
            playing={sarPlaying}
            onPlayingChange={setSarPlaying}
          />
        ) : null}
        {markerForm ? (
          <MarkerFormModal
            mode={markerForm.mode}
            initial={markerForm.initial}
            saving={markerSaving}
            pickMode={markerPickMode}
            pendingMapPoint={markerPendingPoint}
            onConsumeMapPoint={() => setMarkerPendingPoint(null)}
            onTogglePickMode={(next) => {
              const on = Boolean(next);
              setMarkerPickMode(on);
              if (on) {
                setZonePickMode(false);
                setMeasureOn(false);
                setHcPickMode(false);
                setSarPickMode(false);
              }
            }}
            onClose={closeMarkerForm}
            onSave={handleSaveMarker}
          />
        ) : null}
        {zoneForm ? (
          <ZoneFormModal
            mode={zoneForm.mode}
            initial={zoneForm.initial}
            saving={zoneSaving}
            pickMode={zonePickMode}
            pendingMapPoint={zonePendingPoint}
            onConsumeMapPoint={() => setZonePendingPoint(null)}
            pendingVertexMove={zoneVertexMove}
            onConsumeVertexMove={() => setZoneVertexMove(null)}
            onTogglePickMode={(next) => {
              const on = Boolean(next);
              setZonePickMode(on);
              if (on) {
                setMarkerPickMode(false);
                setMeasureOn(false);
                setHcPickMode(false);
                setSarPickMode(false);
              }
            }}
            onClose={closeZoneForm}
            onSave={handleSaveZone}
            onPointsChange={(draft) => setZoneDraft(draft)}
          />
        ) : null}
      </div>

      {skylightEventsOn && skylightListOpen ? (
        <SkylightEventsList
          visible
          events={skylightViewportEvents}
          selectedEventId={selectedSkylightEventId}
          loading={skylightStatus.loading}
          totalLoaded={skylightEvents.length}
          onSelect={setSelectedSkylightEventId}
          onClose={() => setSkylightListOpen(false)}
          isMobile={isMobile}
          besideFab={Boolean(selectedVessel?.mmsi)}
        />
      ) : null}

      {skylightEventsOn ? (
        <button
          type="button"
          className={[
            "centinela-skylight-list-fab",
            skylightListOpen ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setSkylightListOpen((open) => !open)}
          aria-pressed={skylightListOpen}
          aria-label={
            skylightListOpen
              ? "Ocultar lista de eventos Skylight"
              : "Mostrar lista de eventos Skylight"
          }
        >
          <i className="bi bi-list-ul" aria-hidden />
          {skylightViewportEvents.length > 0 ? (
            <span className="centinela-skylight-list-fab__badge">
              {skylightViewportEvents.length > 99
                ? "99+"
                : skylightViewportEvents.length}
            </span>
          ) : null}
        </button>
      ) : null}

      {markersOn && markersListOpen ? (
        <UserMarkersPanel
          visible
          markers={userMarkers}
          loading={markersLoading}
          selectedId={selectedMarkerId}
          isMobile={isMobile}
          besideFab
          onClose={() => {
            setMarkersListOpen(false);
            setMarkersOn(false);
            setSelectedMarkerId(null);
          }}
          onNew={() => {
            setMarkerPickMode(true);
            setMarkerPendingPoint(null);
            setMarkerForm({
              mode: "create",
              initial: {
                name: "",
                icon: MAP_MARKER_DEFAULT_ICON,
                color: MAP_MARKER_DEFAULT_COLOR,
              },
            });
          }}
          onEdit={(m) => {
            setMarkerPickMode(false);
            setMarkerPendingPoint(null);
            setMarkerForm({
              mode: "edit",
              initial: m,
            });
          }}
          onDelete={(m) => {
            void handleDeleteMarker(m);
          }}
          onToggleHidden={(m) => {
            void handleToggleMarkerHidden(m);
          }}
          onSelect={flyToMarker}
        />
      ) : null}

      {markersOn ? (
        <button
          type="button"
          className={[
            "centinela-skylight-list-fab",
            "centinela-markers-list-fab",
            skylightEventsOn ? "centinela-markers-list-fab--offset" : "",
            markersListOpen ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setMarkersListOpen((open) => !open)}
          aria-pressed={markersListOpen}
          aria-label={
            markersListOpen
              ? "Ocultar mis marcadores"
              : "Mostrar mis marcadores"
          }
        >
          <i className="bi bi-bookmark-star" aria-hidden />
          {userMarkers.length > 0 ? (
            <span className="centinela-skylight-list-fab__badge">
              {userMarkers.length > 99 ? "99+" : userMarkers.length}
            </span>
          ) : null}
        </button>
      ) : null}

      {zonesToolOn && zonesListOpen ? (
        <UserZonesPanel
          visible
          zones={userZones}
          loading={zonesLoading}
          selectedId={selectedZoneId}
          isMobile={isMobile}
          besideFab
          onClose={() => {
            setZonesListOpen(false);
            setZonesToolOn(false);
            setSelectedZoneId(null);
            closeZoneForm();
          }}
          onNew={() => {
            setZonePendingPoint(null);
            setZoneDraft(null);
            setZonePickMode(true);
            setMarkerPickMode(false);
            setZoneForm({
              mode: "create",
              initial: {
                name: "",
                color: MAP_MARKER_DEFAULT_COLOR,
                positions: [],
              },
            });
          }}
          onEdit={(z) => {
            setZonePickMode(false);
            setZonePendingPoint(null);
            setZoneForm({
              mode: "edit",
              initial: z,
            });
          }}
          onDelete={(z) => {
            void handleDeleteZone(z);
          }}
          onToggleHidden={(z) => {
            void handleToggleZoneHidden(z);
          }}
          onSelect={fitToZone}
        />
      ) : null}

      {zonesToolOn ? (
        <button
          type="button"
          className={[
            "centinela-skylight-list-fab",
            "centinela-zones-list-fab",
            markersOn && skylightEventsOn
              ? "centinela-zones-list-fab--offset-2"
              : markersOn || skylightEventsOn
                ? "centinela-zones-list-fab--offset"
                : "",
            zonesListOpen ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setZonesListOpen((open) => !open)}
          aria-pressed={zonesListOpen}
          aria-label={
            zonesListOpen ? "Ocultar mis zonas" : "Mostrar mis zonas"
          }
        >
          <i className="bi bi-pentagon" aria-hidden />
          {userZones.length > 0 ? (
            <span className="centinela-skylight-list-fab__badge">
              {userZones.length > 99 ? "99+" : userZones.length}
            </span>
          ) : null}
        </button>
      ) : null}

      <SkylightVesselDossierPanel
        visible={Boolean(selectedVessel?.mmsi) && vesselDossierPanelOpen}
        mmsi={selectedVessel?.mmsi}
        name={selectedVessel?.name}
        loading={vesselDossierLoading}
        error={vesselDossierError}
        dossier={vesselDossier}
        aisLinked={
          selectedVessel?.mmsi
            ? matchedAisSkylightMmsis.has(String(selectedVessel.mmsi))
            : false
        }
        onClose={minimizeVesselDossier}
        onSelectRelatedEvent={setSelectedSkylightEventId}
        isMobile={isMobile}
        besideFab
      />

      {selectedVessel?.mmsi ? (
        <button
          type="button"
          className={[
            "centinela-skylight-list-fab",
            "centinela-vessel-dossier-fab",
            skylightEventsOn ? "centinela-vessel-dossier-fab--offset" : "",
            vesselDossierPanelOpen ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setVesselDossierPanelOpen((open) => !open)}
          aria-pressed={vesselDossierPanelOpen}
          aria-label={
            vesselDossierPanelOpen
              ? `Ocultar historial de ${
                  selectedVessel.name?.trim() || `MMSI ${selectedVessel.mmsi}`
                }`
              : `Mostrar historial de ${
                  selectedVessel.name?.trim() || `MMSI ${selectedVessel.mmsi}`
                }`
          }
        >
          <i className="bi bi-clock-history" aria-hidden />
        </button>
      ) : null}

      <div className="centinela-fab-stack">
        <Link
          className="centinela-fab"
          to="/home"
          aria-label="Inicio"
        >
          <i className="bi bi-house" aria-hidden />
        </Link>
        <button
          type="button"
          className="centinela-fab"
          onClick={toggleStoredBootstrapTheme}
          aria-label={
            isDark
              ? "Cambiar a modo claro"
              : "Cambiar a modo oscuro"
          }
        >
          <i
            className={isDark ? "bi bi-moon" : "bi bi-sun"}
            aria-hidden
          />
        </button>
        <button
          type="button"
          className={["centinela-fab", panelOpen ? "is-active" : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-controls="centinela-layers-panel"
          aria-label={
            panelOpen
              ? isMobile
                ? "Cerrar menú de capas"
                : "Achicar panel de capas"
              : isMobile
                ? "Abrir menú de capas"
                : "Expandir panel de capas"
          }
        >
          <i className="bi bi-layers" aria-hidden />
        </button>
        <button
          type="button"
          className={["centinela-fab", helpOpen ? "is-active" : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setHelpOpen(true)}
          aria-pressed={helpOpen}
          aria-label="Manual de El Centinela"
        >
          <i className="bi bi-book" aria-hidden />
        </button>
        <div className="centinela-fab-zoom" role="group" aria-label="Zoom del mapa">
          <button
            type="button"
            className="centinela-fab-zoom__btn"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Acercar"
          >
            <i className="bi bi-plus-lg" aria-hidden />
          </button>
          <button
            type="button"
            className="centinela-fab-zoom__btn"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Alejar"
          >
            <i className="bi bi-dash-lg" aria-hidden />
          </button>
        </div>
      </div>

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
        <div className="centinela-glass__body">
        <div className="centinela-glass__header">
          <div className="min-w-0">
            <h1 className="centinela-glass__title">El Centinela</h1>
            <p className="centinela-glass__subtitle">
              Interfaz con capas. No sustituye una carta oficial para
              navegación.
            </p>
          </div>
          <button
            type="button"
            className="centinela-glass__collapse"
            onClick={() => setPanelOpen(false)}
            aria-label={isMobile ? "Cerrar menú" : "Achicar panel de capas"}
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
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
          <CentinelaIntelLayersPanel
            intelVisibility={intelVisibility}
            intelMenuOpen={intelMenuOpen}
            onToggleMenu={() => setIntelMenuOpen((o) => !o)}
            groupOpen={intelGroupOpen}
            onToggleGroup={(id) =>
              setIntelGroupOpen((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            onToggleAll={toggleAllIntel}
            onToggleGroupItems={toggleIntelGroupItems}
            onToggleItem={toggleIntelItem}
            aisStatusLine={statusLine}
            gfwStatusLine={[gfwStatusLine, fiuIuuStatusLine, skylightStatusLine]
              .filter(Boolean)
              .join(" · ")}
          />

          <div className="centinela-zones">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={zonasSectionAllOn}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        zonasSectionSomeOn && !zonasSectionAllOn;
                    }
                  }}
                  onChange={(e) => toggleAllZonasSection(e.target.checked)}
                  aria-label="Mostrar u ocultar todas las zonas, brevets y límites marítimos"
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
                  {zonasSectionOnCount}/{zonasSectionTotal}
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
                <div className="centinela-skylight-subgroup">
                  <div className="centinela-zones__header centinela-skylight-subgroup__header">
                    <label className="centinela-zones__master">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={zonesAllOn}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = zonesSomeOn && !zonesAllOn;
                          }
                        }}
                        onChange={(e) => toggleAllZones(e.target.checked)}
                        aria-label="Mostrar u ocultar fondeo y otros servicios"
                      />
                    </label>
                    <button
                      type="button"
                      className="centinela-zones__toggle"
                      aria-expanded={fondeoZonesMenuOpen}
                      aria-controls="centinela-fondeo-zones-list"
                      onClick={() => setFondeoZonesMenuOpen((o) => !o)}
                    >
                      <i
                        className={`bi ${
                          fondeoZonesMenuOpen
                            ? "bi-chevron-down"
                            : "bi-chevron-right"
                        }`}
                        aria-hidden
                      />
                      <span>Fondeo y otros servicios</span>
                      <span className="centinela-zones__count">
                        {visibleZones.length}/{CENTINELA_ZONES.length}
                      </span>
                    </button>
                  </div>
                  {fondeoZonesMenuOpen ? (
                    <div
                      id="centinela-fondeo-zones-list"
                      className="centinela-zones__list centinela-skylight-subgroup__list"
                      role="group"
                      aria-label="Fondeo y otros servicios"
                    >
                      {CENTINELA_ZONES.map((z) => (
                        <label
                          key={z.id}
                          className="centinela-page__layer-item"
                        >
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

                <div className="centinela-skylight-subgroup">
                  <div className="centinela-zones__header centinela-skylight-subgroup__header">
                    <label className="centinela-zones__master">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={brevetsAllOn}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              brevetsSomeOn && !brevetsAllOn;
                          }
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
                          brevetsMenuOpen
                            ? "bi-chevron-down"
                            : "bi-chevron-right"
                        }`}
                        aria-hidden
                      />
                      <span>Brevets deportivos</span>
                      <span className="centinela-zones__count">
                        {visibleBrevetCount}/
                        {CENTINELA_BREVET_MAP_CATEGORIES.length}
                      </span>
                    </button>
                  </div>
                  {brevetsMenuOpen ? (
                    <div
                      id="centinela-brevets-list"
                      className="centinela-zones__list centinela-skylight-subgroup__list"
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
                                  data-sicen-popover-touch="click"
                                  role="img"
                                  aria-label={`Información de ${c.name}`}
                                >
                                  <i
                                    className="bi bi-info-circle"
                                    aria-hidden
                                  />
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
                            data-sicen-popover-touch="click"
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
                                onClick={() =>
                                  setBrevetCMenuOpen((o) => !o)
                                }
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
                                        label={
                                          SPORT_PORT_SECTOR_LABELS[sector]
                                        }
                                      >
                                        {(
                                          SPORT_PORTS_BY_SECTOR[sector] || []
                                        ).map((port) => (
                                          <option
                                            key={port.id}
                                            value={port.id}
                                          >
                                            {port.name} ({port.radiusNm} MN)
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={c.id}
                            className="centinela-brevet-row-wrap"
                          >
                            {row}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="centinela-skylight-subgroup">
                  <div className="centinela-zones__header centinela-skylight-subgroup__header">
                    <label className="centinela-zones__master">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={maritimeAllOn}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              maritimeSomeOn && !maritimeAllOn;
                          }
                        }}
                        onChange={(e) => toggleAllMaritime(e.target.checked)}
                        aria-label="Mostrar u ocultar límites marítimos"
                      />
                    </label>
                    <button
                      type="button"
                      className="centinela-zones__toggle"
                      aria-expanded={maritimeMenuOpen}
                      aria-controls="centinela-maritime-list"
                      onClick={() => setMaritimeMenuOpen((o) => !o)}
                    >
                      <i
                        className={`bi ${
                          maritimeMenuOpen
                            ? "bi-chevron-down"
                            : "bi-chevron-right"
                        }`}
                        aria-hidden
                      />
                      <span>Límites marítimos</span>
                      <span className="centinela-zones__count">
                        {visibleMaritimeCount}/{MARITIME_BOUNDARY_LAYER_IDS.length}
                      </span>
                    </button>
                  </div>
                  {maritimeMenuOpen ? (
                    <div
                      id="centinela-maritime-list"
                      className="centinela-zones__list centinela-skylight-subgroup__list"
                      role="group"
                      aria-label="Límites marítimos"
                    >
                      {MARITIME_BOUNDARY_LAYERS.map((layer) => {
                        const infoIcon = layer.infoText ? (
                          <span
                            className="centinela-brevet-info-icon"
                            data-sicen-popover={layer.infoText}
                            data-sicen-popover-placement="top"
                            data-sicen-popover-touch="click"
                            role="img"
                            aria-label={`Información de ${layer.label}`}
                          >
                            <i className="bi bi-info-circle" aria-hidden />
                          </span>
                        ) : null;

                        const childIds = (layer.children || []).map((c) => c.id);
                        const childrenOn = childIds.filter(
                          (id) => maritimeVisibility[id]
                        ).length;

                        const row = (
                          <div className="centinela-brevet-row">
                            <label className="centinela-brevet-row__check">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={Boolean(maritimeVisibility[layer.id])}
                                onChange={() =>
                                  toggleMaritimeVisibility(layer.id)
                                }
                                aria-label={`Mostrar u ocultar ${layer.label}`}
                              />
                            </label>
                            {infoIcon}
                            {layer.expandable ? (
                              <button
                                type="button"
                                className="centinela-brevet-row__name-btn"
                                aria-expanded={rdpMenuOpen}
                                aria-controls="centinela-rdp-children"
                                onClick={() => setRdpMenuOpen((o) => !o)}
                              >
                                <span>{layer.label}</span>
                                <i
                                  className={`bi ${
                                    rdpMenuOpen
                                      ? "bi-chevron-down"
                                      : "bi-chevron-right"
                                  }`}
                                  aria-hidden
                                />
                                {childIds.length ? (
                                  <span className="centinela-zones__count">
                                    {childrenOn}/{childIds.length}
                                  </span>
                                ) : null}
                              </button>
                            ) : (
                              <span className="centinela-brevet-row__name">
                                {layer.label}
                              </span>
                            )}
                          </div>
                        );

                        if (layer.expandable) {
                          return (
                            <div
                              key={layer.id}
                              className="centinela-brevet-c"
                            >
                              {row}
                              {rdpMenuOpen ? (
                                <div
                                  id="centinela-rdp-children"
                                  className="centinela-brevet-c__picker"
                                  role="group"
                                  aria-label={`${layer.label}: subcapas`}
                                >
                                  {(layer.children || []).map((child) => (
                                    <div
                                      key={child.id}
                                      className="centinela-brevet-row-wrap"
                                    >
                                      <div className="centinela-brevet-row">
                                        <label className="centinela-brevet-row__check">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={Boolean(
                                              maritimeVisibility[child.id]
                                            )}
                                            onChange={() =>
                                              toggleMaritimeVisibility(child.id)
                                            }
                                            aria-label={`Mostrar u ocultar ${child.label}`}
                                          />
                                        </label>
                                        {child.infoText ? (
                                          <span
                                            className="centinela-brevet-info-icon"
                                            data-sicen-popover={child.infoText}
                                            data-sicen-popover-placement="top"
                                            data-sicen-popover-touch="click"
                                            role="img"
                                            aria-label={`Información de ${child.label}`}
                                          >
                                            <i
                                              className="bi bi-info-circle"
                                              aria-hidden
                                            />
                                          </span>
                                        ) : null}
                                        <span className="centinela-brevet-row__name">
                                          {child.label}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={layer.id}
                            className="centinela-brevet-row-wrap"
                          >
                            {row}
                          </div>
                        );
                      })}
                      {maritimeStatus.loading ? (
                        <p className="small mb-0 opacity-75 px-1">
                          Cargando límites…
                        </p>
                      ) : null}
                      {maritimeStatus.error ? (
                        <p className="small text-danger mb-0 px-1">
                          {maritimeStatus.error}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {aisLayerOn && error ? (
          <ErrorAlert
            message={error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        {skylightEventsOn && skylightStatus.error ? (
          <ErrorAlert
            message={skylightStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}
        {fiuIuuEventsOn && fiuIuuStatus.error ? (
          <ErrorAlert
            message={fiuIuuStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}
        {gfwEventsOn && gfwStatus.error ? (
          <ErrorAlert
            message={gfwStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        {skylightFramesOn && skylightFramesStatus.error ? (
          <ErrorAlert
            message={skylightFramesStatus.error}
            className="alert alert-danger py-2 small mb-0"
          />
        ) : null}

        {skylightAoiLayersOn && skylightAoiError ? (
          <ErrorAlert
            message={skylightAoiError}
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
          <div className="centinela-page__layers-title">Medio marino</div>
          <div className="centinela-glass__marine-row">
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover={
                bathymetryOn
                  ? bathymetryStatus.error
                    ? bathymetryStatus.error
                    : bathymetryStatus.loading
                      ? "Cargando batimetría…"
                      : "Batimetría"
                  : "Batimetría"
              }
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  bathymetryOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={bathymetryOn}
                aria-label="Batimetría"
                onClick={() => setBathymetryOn((on) => !on)}
              >
                <i className="bi bi-moisture" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover={windLayerOn ? windStatusLine : "Viento"}
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  windLayerOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={windLayerOn}
                aria-label="Viento"
                onClick={() => setWindLayerOn((on) => !on)}
              >
                <i className="bi bi-wind" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover={
                currentsLayerOn ? currentsStatusLine : "Corrientes"
              }
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  currentsLayerOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={currentsLayerOn}
                aria-label="Corrientes"
                onClick={() => setCurrentsLayerOn((on) => !on)}
              >
                <i className="bi bi-water" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover={wavesLayerOn ? wavesStatusLine : "Olas"}
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  wavesLayerOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={wavesLayerOn}
                aria-label="Olas"
                onClick={() => setWavesLayerOn((on) => !on)}
              >
                <i className="bi bi-tsunami" aria-hidden />
              </button>
            </span>
          </div>

          <div className="centinela-page__layers-title">Herramientas</div>
          <div className="centinela-glass__sim-row">
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Simular incidente de HC"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  hcOpen ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={hcOpen}
                aria-label="Simular incidente de HC"
                onClick={() => {
                  setHcOpen((open) => {
                    const next = !open;
                    if (next) {
                      setPanelOpen(false);
                      setSarOpen(false);
                      setSarPickMode(false);
                    } else {
                      setHcPickMode(false);
                    }
                    return next;
                  });
                }}
              >
                <i className="bi bi-droplet-half" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Simular deriva SAR"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  sarOpen ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={sarOpen}
                aria-label="Simular deriva SAR"
                onClick={() => {
                  setSarOpen((open) => {
                    const next = !open;
                    if (next) {
                      setPanelOpen(false);
                      setHcOpen(false);
                      setHcPickMode(false);
                    } else {
                      setSarPickMode(false);
                    }
                    return next;
                  });
                }}
              >
                <i className="bi bi-compass" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Ir a un punto (DMS)"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  goToOpen ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={goToOpen}
                aria-label="Ir a un punto"
                onClick={() => {
                  setGoToOpen((open) => {
                    const next = !open;
                    if (next) setPanelOpen(false);
                    return next;
                  });
                }}
              >
                <i className="bi bi-geo-alt" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Mis marcadores"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  markersOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={markersOn}
                aria-label="Mis marcadores"
                onClick={() => {
                  setMarkersOn((on) => {
                    const next = !on;
                    if (next) {
                      setPanelOpen(false);
                    } else {
                      setMarkersListOpen(false);
                      setSelectedMarkerId(null);
                      closeMarkerForm();
                    }
                    return next;
                  });
                }}
              >
                <i className="bi bi-bookmark-star" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Mis zonas"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  zonesToolOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={zonesToolOn}
                aria-label="Mis zonas"
                onClick={() => {
                  setZonesToolOn((on) => {
                    const next = !on;
                    if (next) {
                      setPanelOpen(false);
                    } else {
                      setZonesListOpen(false);
                      setSelectedZoneId(null);
                      closeZoneForm();
                    }
                    return next;
                  });
                }}
              >
                <i className="bi bi-pentagon" aria-hidden />
              </button>
            </span>
            <span
              className="centinela-glass__action-wrap"
              data-sicen-popover="Medir distancias y radios"
              data-sicen-popover-placement="top"
            >
              <button
                type="button"
                className={[
                  "centinela-glass__action-btn",
                  measureOn || measurePinned ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={measureOn || measurePinned}
                aria-label="Medir distancias y radios"
                onClick={() => {
                  if (measureOn) {
                    setMeasureOn(false);
                    setMeasurePinned(false);
                    setMeasureTotalMeters(0);
                    setMeasureRadiusMeters(0);
                    setMeasureMode("distance");
                    setMeasureResetKey((k) => k + 1);
                    return;
                  }
                  if (measurePinned) {
                    setMeasurePinned(false);
                    setMeasureOn(true);
                    setPanelOpen(false);
                    return;
                  }
                  setMeasureOn(true);
                  setPanelOpen(false);
                }}
              >
                <i className="bi bi-rulers" aria-hidden />
              </button>
            </span>
          </div>
        </div>
        </div>
      </aside>

      <CentinelaHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
