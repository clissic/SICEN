import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, useMap, AttributionControl } from "react-leaflet";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { toggleStoredBootstrapTheme, useBootstrapTheme } from "../components/ThemeToggle.jsx";
import { CentinelaDetailWindow, clientAnchorFromMapLatLng } from "../components/centinela/CentinelaDetailWindow.jsx";
import { AisVesselLayer, AisVesselDetailBody } from "../components/centinela/AisVesselLayer.jsx";
import { CentinelaVesselSearch } from "../components/centinela/CentinelaVesselSearch.jsx";
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
import { CentinelaFloatingToolWindow } from "../components/centinela/CentinelaFloatingToolWindow.jsx";
import { CentinelaMarineToolsBar } from "../components/centinela/CentinelaMarineToolsBar.jsx";
import {
  CENTINELA_ADD_MARKER_EVENT,
  CENTINELA_ADD_MEASUREMENT_EVENT,
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
import { UserMeasurementsLayer } from "../components/centinela/UserMeasurementsLayer.jsx";
import { UserMeasurementsPanel } from "../components/centinela/UserMeasurementsPanel.jsx";
import { CentinelaLabelsOptions } from "../components/centinela/CentinelaLabelsPanel.jsx";
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
import { FiuIuuEventsLayer, FiuIuuEventDetailBody, fiuIuuEventTitle } from "../components/centinela/FiuIuuEventsLayer.jsx";
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
  createMapMeasurement,
  createMapZone,
  deleteMapMarker,
  deleteMapMeasurement,
  deleteMapZone,
  gfwFetchInsights,
  listMapMarkers,
  listMapMeasurements,
  listMapZones,
  maritimeBoundariesFetch,
  skylightFetchAois,
  skylightFetchVesselDossier,
  updateMapMarker,
  updateMapMeasurement,
  updateMapZone,
} from "../api/client.js";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";
import {
  pickVesselTrackColor,
  vesselDisplayLabel,
} from "../utils/vesselTrackColors.js";
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
import {
  canSaveMeasurementSnapshot,
  normalizeMeasurementSnapshot,
} from "../utils/measureSnapshot.js";
import {
  formatMeasureDistanceParts,
} from "../utils/geoMeasure.js";
import { useAisVessels } from "../hooks/useAisVessels.js";
import { useSportMovementTrackingStream } from "../hooks/useSportMovementTrackingStream.js";
import { useDocumentSicenPopovers } from "../hooks/useDocumentSicenPopovers.js";
import { circlePolygonLatLon } from "../utils/mergeCirclesPolygon.js";
import "leaflet/dist/leaflet.css";

const SPORT_PORTS_BY_SECTOR = sportPortsBySector();
const MONTEVIDEO = [-34.9, -56.2];
const DEFAULT_ZOOM = 11;

const LABEL_MENU_KEYS = [
  { id: "ais", label: "AIS" },
  { id: "markers", label: "Marcadores" },
  { id: "zones", label: "Zonas" },
  { id: "distances", label: "Distancias" },
];
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
  const [mapDetails, setMapDetails] = useState([]);
  const [focusedDetailId, setFocusedDetailId] = useState(null);
  /** Sesiones de Historial / predicción (varios buques, color de trazo propio). */
  const [vesselDossiers, setVesselDossiers] = useState([]);
  const [focusedDossierMmsi, setFocusedDossierMmsi] = useState(null);
  const vesselDossierAbortRef = useRef(new Map());
  const [labelVisibility, setLabelVisibility] = useState({
    ais: false,
    markers: false,
    zones: false,
    distances: false,
  });
  const [labelsMenuOpen, setLabelsMenuOpen] = useState(false);
  /** Desplegable Capas → Herramientas (marcadores / zonas / mediciones). */
  const [toolsLayersMenuOpen, setToolsLayersMenuOpen] = useState(false);
  const [sicenPositioningOn, setSicenPositioningOn] = useState(true);
  const [windLayerOn, setWindLayerOn] = useState(false);
  const [envForecastHours, setEnvForecastHours] = useState(0);
  const [measureOn, setMeasureOn] = useState(false);
  const [measurePinned, setMeasurePinned] = useState(false);
  /** Capa/lista de mediciones en mapa (Capas); el panel de dibujo solo desde el dock. */
  const [measureToolOn, setMeasureToolOn] = useState(false);
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
  const [measureName, setMeasureName] = useState("");
  const [measureSaving, setMeasureSaving] = useState(false);
  const [measureEditingId, setMeasureEditingId] = useState(null);
  const [measureLoadKey, setMeasureLoadKey] = useState(0);
  const [measureLoadSnapshot, setMeasureLoadSnapshot] = useState(null);
  const [measurementsListOpen, setMeasurementsListOpen] = useState(false);
  const [userMeasurements, setUserMeasurements] = useState([]);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState(null);
  const measureSnapshotApiRef = useRef(null);
  /** Herramientas con ventana minimizada (punto en dock, sin resalte activo). */
  const [minimizedToolIds, setMinimizedToolIds] = useState(() => new Set());
  /** Ventana flotante (o panel mobile) con focus. */
  const [focusedToolId, setFocusedToolId] = useState(null);
  const BOTTOM_TOOL_IDS = useMemo(
    () => ["measure", "goto", "hc", "sar", "marker", "zone"],
    []
  );
  const FLOAT_TOOL_POS = useMemo(
    () => ({
      measure: { x: 72, y: 88 },
      goto: { x: 116, y: 128 },
      hc: { x: 160, y: 168 },
      sar: { x: 204, y: 148 },
      marker: { x: 96, y: 208 },
      zone: { x: 140, y: 248 },
    }),
    []
  );
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

  useEffect(() => {
    if (!aisLayerOn) {
      setLabelVisibility((v) => (v.ais ? { ...v, ais: false } : v));
    }
  }, [aisLayerOn]);

  useEffect(() => {
    if (!markersOn) {
      setLabelVisibility((v) => (v.markers ? { ...v, markers: false } : v));
    }
  }, [markersOn]);

  useEffect(() => {
    if (!zonesToolOn) {
      setLabelVisibility((v) => (v.zones ? { ...v, zones: false } : v));
    }
  }, [zonesToolOn]);

  const measureToolActive = measureToolOn;
  const measurePanelOpen = measureOn || measurePinned;

  const isToolMinimized = useCallback(
    (id) => minimizedToolIds.has(id),
    [minimizedToolIds]
  );
  const isToolWindowVisible = useCallback(
    (id) => !minimizedToolIds.has(id),
    [minimizedToolIds]
  );

  const expandToolWindow = useCallback(
    (id) => {
      setMinimizedToolIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        if (isMobile) {
          for (const other of BOTTOM_TOOL_IDS) {
            if (other !== id) next.add(other);
          }
        }
        return next;
      });
      setFocusedToolId(id);
      setFocusedDetailId(null);
    },
    [BOTTOM_TOOL_IDS, isMobile]
  );

  const minimizeToolWindow = useCallback((id) => {
    setMinimizedToolIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setFocusedToolId((cur) => (cur === id ? null : cur));
  }, []);

  const toggleToolWindowMinimized = useCallback(
    (id) => {
      if (minimizedToolIds.has(id)) {
        expandToolWindow(id);
        return;
      }
      minimizeToolWindow(id);
    },
    [expandToolWindow, minimizeToolWindow, minimizedToolIds]
  );

  const measureExpanded =
    isToolWindowVisible("measure") && focusedToolId === "measure";
  const zoneExpanded =
    isToolWindowVisible("zone") && focusedToolId === "zone";
  const markerExpanded =
    isToolWindowVisible("marker") && focusedToolId === "marker";
  const hcExpanded = isToolWindowVisible("hc") && focusedToolId === "hc";
  const sarExpanded = isToolWindowVisible("sar") && focusedToolId === "sar";

  const measureMapInteractive = measureExpanded;
  const zoneMapPickActive = zoneExpanded && zonePickMode;
  const markerMapPickActive = markerExpanded && markerPickMode;
  const hcMapPickActive = hcExpanded && hcPickMode;
  const sarMapPickActive = sarExpanded && sarPickMode;
  const mapToolCaptureActive =
    (measureExpanded && measureOn && !measurePinned) ||
    zoneMapPickActive ||
    markerMapPickActive ||
    hcMapPickActive ||
    sarMapPickActive;

  const closeMeasurePanel = useCallback(() => {
    setMeasureOn(false);
    setMeasurePinned(false);
    setMeasureTotalMeters(0);
    setMeasureRadiusMeters(0);
    setMeasureMode("distance");
    setMeasureResetKey((k) => k + 1);
    setMeasureEditingId(null);
    setMeasureName("");
    setMeasureLoadSnapshot(null);
  }, []);

  const openMeasurePanel = useCallback(() => {
    setMeasureToolOn(true);
    setMeasureOn(true);
    expandToolWindow("measure");
  }, [expandToolWindow]);

  const handleToolDockClick = useCallback(
    (id, { isOn, turnOn, turnOff }) => {
      if (!isOn) {
        turnOn();
        expandToolWindow(id);
        return;
      }
      if (isToolMinimized(id)) {
        expandToolWindow(id);
        return;
      }
      if (focusedToolId !== id) {
        setFocusedToolId(id);
        setFocusedDetailId(null);
        return;
      }
      turnOff();
    },
    [expandToolWindow, focusedToolId, isToolMinimized]
  );

  const prevBottomToolsRef = useRef([]);
  useEffect(() => {
    const open = [];
    if (measurePanelOpen) open.push("measure");
    if (goToOpen) open.push("goto");
    if (hcOpen) open.push("hc");
    if (sarOpen) open.push("sar");
    if (markerForm) open.push("marker");
    if (zoneForm) open.push("zone");
    const newlyOpened = open.find(
      (id) => !prevBottomToolsRef.current.includes(id)
    );
    const closed = prevBottomToolsRef.current.filter(
      (id) => !open.includes(id)
    );
    prevBottomToolsRef.current = open;

    if (closed.length) {
      setMinimizedToolIds((prev) => {
        const next = new Set(prev);
        for (const id of closed) next.delete(id);
        return next;
      });
    }

    if (newlyOpened) {
      expandToolWindow(newlyOpened);
    }
  }, [
    measurePanelOpen,
    goToOpen,
    hcOpen,
    sarOpen,
    markerForm,
    zoneForm,
    expandToolWindow,
  ]);

  useEffect(() => {
    const open = [];
    if (measurePanelOpen) open.push("measure");
    if (goToOpen) open.push("goto");
    if (hcOpen) open.push("hc");
    if (sarOpen) open.push("sar");
    if (markerForm) open.push("marker");
    if (zoneForm) open.push("zone");
    setFocusedToolId((cur) => {
      if (cur && open.includes(cur) && !minimizedToolIds.has(cur)) return cur;
      // No auto-asignar otra herramienta: el foco puede estar en una ficha de detalle.
      return null;
    });
  }, [
    measurePanelOpen,
    goToOpen,
    hcOpen,
    sarOpen,
    markerForm,
    zoneForm,
    minimizedToolIds,
  ]);

  useEffect(() => {
    if (!measureToolActive) {
      setLabelVisibility((v) =>
        v.distances ? { ...v, distances: false } : v
      );
      setMeasurementsListOpen(false);
      setSelectedMeasurementId(null);
      setMeasureEditingId(null);
      setMeasureName("");
      setMeasureLoadSnapshot(null);
      closeMeasurePanel();
    }
  }, [measureToolActive, closeMeasurePanel]);

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
    if (!detail?.id) return;
    setMapDetails((prev) => {
      const idx = prev.findIndex((d) => d.id === detail.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], ...detail };
        return next;
      }
      return [...prev, detail];
    });
    setFocusedDetailId(detail.id);
    setFocusedToolId(null);
  }, []);

  const focusMapDetail = useCallback((id) => {
    if (!id) return;
    setFocusedDetailId(id);
    setFocusedToolId(null);
  }, []);

  const focusToolWindow = useCallback((id) => {
    if (!id) return;
    setFocusedToolId(id);
    setFocusedDetailId(null);
  }, []);

  const removeVesselDossierSession = useCallback((mmsi) => {
    const key = String(mmsi || "").trim();
    if (!key) return;
    const ac = vesselDossierAbortRef.current.get(key);
    ac?.abort();
    vesselDossierAbortRef.current.delete(key);
    setVesselDossiers((prev) => {
      const next = prev.filter((s) => s.mmsi !== key);
      setFocusedDossierMmsi((focused) => {
        if (focused !== key) return focused;
        return next[next.length - 1]?.mmsi ?? null;
      });
      return next;
    });
  }, []);

  const closeMapDetail = useCallback(
    (detailId) => {
      const id = detailId || focusedDetailId;
      if (!id) {
        setMapDetails([]);
        setFocusedDetailId(null);
        return;
      }
      setMapDetails((prev) => {
        const next = prev.filter((d) => d.id !== id);
        setFocusedDetailId((focused) => {
          if (focused !== id) return focused;
          return next[next.length - 1]?.id ?? null;
        });
        return next;
      });
      if (id.startsWith("skylight:")) {
        const eventId = id.slice("skylight:".length);
        setSelectedSkylightEventId((cur) => (cur === eventId ? null : cur));
      } else if (id.startsWith("fiuIuu:")) {
        const eventId = id.slice("fiuIuu:".length);
        setSelectedFiuIuuEventId((cur) => (cur === eventId ? null : cur));
      } else if (id.startsWith("gfw:")) {
        const eventId = id.slice("gfw:".length);
        setSelectedGfwEventId((cur) => (cur === eventId ? null : cur));
      } else if (id.startsWith("ais:")) {
        removeVesselDossierSession(id.slice("ais:".length));
      }
    },
    [focusedDetailId, removeVesselDossierSession]
  );

  const openVesselDossier = useCallback(
    (payload) => {
      const mmsi = String(payload?.mmsi ?? "").trim();
      if (!/^\d{5,9}$/.test(mmsi)) return;

      const name = payload?.name?.trim() || null;
      const imo =
        payload?.imo != null && Number(payload.imo) > 0
          ? Number(payload.imo)
          : null;
      const lat = Number.isFinite(Number(payload?.lat))
        ? Number(payload.lat)
        : null;
      const lon = Number.isFinite(Number(payload?.lon))
        ? Number(payload.lon)
        : null;
      const speedKts = Number.isFinite(Number(payload?.speedKts))
        ? Number(payload.speedKts)
        : Number.isFinite(Number(payload?.sog))
          ? Number(payload.sog)
          : null;
      const heading = Number.isFinite(Number(payload?.heading))
        ? Number(payload.heading)
        : Number.isFinite(Number(payload?.cog))
          ? Number(payload.cog)
          : null;

      setVesselDossiers((prev) => {
        const existing = prev.find((s) => s.mmsi === mmsi);
        if (existing) {
          return prev.map((s) =>
            s.mmsi === mmsi
              ? {
                  ...s,
                  name: name || s.name,
                  imo: imo ?? s.imo,
                  lat: lat ?? s.lat,
                  lon: lon ?? s.lon,
                  speedKts: speedKts ?? s.speedKts,
                  heading: heading ?? s.heading,
                  panelOpen: true,
                }
              : s
          );
        }
        const color = pickVesselTrackColor(prev.map((s) => s.color));
        return [
          ...prev,
          {
            mmsi,
            name,
            imo,
            lat,
            lon,
            speedKts,
            heading,
            color,
            panelOpen: true,
            dossier: null,
            loading: true,
            error: null,
          },
        ];
      });
      setFocusedDossierMmsi(mmsi);
      if (isMobile) setPanelOpen(false);

      const prevAc = vesselDossierAbortRef.current.get(mmsi);
      prevAc?.abort();
      const ac = new AbortController();
      vesselDossierAbortRef.current.set(mmsi, ac);

      (async () => {
        setVesselDossiers((prev) =>
          prev.map((s) =>
            s.mmsi === mmsi ? { ...s, loading: true, error: null } : s
          )
        );
        try {
          const [data, gfw] = await Promise.all([
            skylightFetchVesselDossier(
              {
                mmsi,
                lat,
                lon,
                speedKts,
                heading,
                lookbackHours: SKYLIGHT_DEFAULT_LOOKBACK_HOURS,
              },
              { signal: ac.signal }
            ),
            gfwFetchInsights({ mmsi }, { signal: ac.signal }).catch(() => null),
          ]);
          setVesselDossiers((prev) =>
            prev.map((s) =>
              s.mmsi === mmsi
                ? {
                    ...s,
                    loading: false,
                    error: null,
                    dossier: { ...data, gfwInsights: gfw || null },
                    name: s.name || data?.name || null,
                  }
                : s
            )
          );
        } catch (e) {
          if (e?.name === "AbortError") return;
          setVesselDossiers((prev) =>
            prev.map((s) =>
              s.mmsi === mmsi
                ? {
                    ...s,
                    loading: false,
                    dossier: null,
                    error:
                      e?.message ||
                      e?.msg ||
                      "No se pudo cargar el dossier del buque.",
                  }
                : s
            )
          );
        }
      })();
    },
    [isMobile]
  );

  const selectAisVessel = useCallback(
    (v, click = null) => {
      if (!v) return;
      const mmsi = String(v.mmsi);
      const map = mapRef.current;
      let anchor =
        Number.isFinite(click?.clientX) && Number.isFinite(click?.clientY)
          ? { x: click.clientX, y: click.clientY }
          : null;
      if (!anchor && map && Number.isFinite(v.lat) && Number.isFinite(v.lon)) {
        anchor = clientAnchorFromMapLatLng(map, v.lat, v.lon);
      }
      openMapDetail({
        id: `ais:${mmsi}`,
        title: v.name?.trim() || `MMSI ${mmsi}`,
        anchor,
        body: (
          <AisVesselDetailBody
            vessel={v}
            matched={matchedAisSkylightMmsis.has(mmsi)}
            onOpenDossier={(vessel) =>
              openVesselDossier({
                mmsi: vessel.mmsi,
                name: vessel.name,
                imo: vessel.imo,
                lat: vessel.lat,
                lon: vessel.lon,
                sog: vessel.sog,
                heading: vessel.heading ?? vessel.cog,
              })
            }
          />
        ),
      });
    },
    [matchedAisSkylightMmsis, openMapDetail, openVesselDossier]
  );

  const handleVesselSearchSelect = useCallback(
    (v) => {
      const map = mapRef.current;
      if (map && Number.isFinite(v.lat) && Number.isFinite(v.lon)) {
        map.flyTo([v.lat, v.lon], Math.max(map.getZoom(), 12), {
          duration: 0.75,
        });
      }
      selectAisVessel(v);
    },
    [selectAisVessel]
  );

  const goToVesselTrack = useCallback((track) => {
    const map = mapRef.current;
    if (!map || !track) return;
    const latlngs = [];
    for (const p of track.positions || []) {
      const lat = Number(p?.[0]);
      const lon = Number(p?.[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) latlngs.push([lat, lon]);
    }
    if (latlngs.length === 0) return;
    if (latlngs.length === 1) {
      map.flyTo(latlngs[0], Math.max(map.getZoom(), 12), { duration: 0.6 });
      return;
    }
    map.fitBounds(latlngs, { padding: [48, 48], maxZoom: 14 });
  }, []);

  const goToSkylightRelatedEvent = useCallback((ev) => {
    const map = mapRef.current;
    if (!map || !ev) return;
    const latlngs = [];
    if (Number.isFinite(ev.lat) && Number.isFinite(ev.lon)) {
      latlngs.push([ev.lat, ev.lon]);
    }
    if (
      Number.isFinite(ev.endLat) &&
      Number.isFinite(ev.endLon) &&
      (ev.endLat !== ev.lat || ev.endLon !== ev.lon)
    ) {
      latlngs.push([ev.endLat, ev.endLon]);
    }
    if (latlngs.length === 0) return;
    if (ev.eventId) {
      if (ev.source === "fiu-lac-iuu" || ev.eventType === "fiu_sts") {
        setSelectedFiuIuuEventId(ev.eventId);
      } else {
        setSelectedSkylightEventId(ev.eventId);
      }
    }
    if (latlngs.length === 1) {
      map.flyTo(latlngs[0], Math.max(map.getZoom(), 12), { duration: 0.6 });
      return;
    }
    map.fitBounds(latlngs, { padding: [48, 48], maxZoom: 14 });
  }, []);

  const selectDossierRelatedEvent = useCallback(
    (evOrId) => {
      if (evOrId && typeof evOrId === "object") {
        const ev = evOrId;
        if (!ev.eventId) return;
        if (ev.source === "fiu-lac-iuu" || ev.eventType === "fiu_sts") {
          setSelectedFiuIuuEventId(ev.eventId);
          const map = mapRef.current;
          let anchor = null;
          if (
            map &&
            Number.isFinite(ev.lat) &&
            Number.isFinite(ev.lon)
          ) {
            anchor = clientAnchorFromMapLatLng(map, ev.lat, ev.lon);
          }
          const fiuEvent = {
            eventId: ev.eventId,
            layerType: "sts",
            activityType: ev.details?.activityType ?? null,
            startTime: ev.startTime ?? null,
            endTime: ev.endTime ?? null,
            lat: ev.lat ?? null,
            lon: ev.lon ?? null,
            endLat: ev.endLat ?? null,
            endLon: ev.endLon ?? null,
            durationHours: ev.details?.durationHours ?? null,
            vessel: {
              name: ev.vessels?.vessel0?.name ?? null,
              mmsi: ev.vessels?.vessel0?.mmsi ?? null,
              imo: ev.vessels?.vessel0?.imo ?? null,
              flag: ev.vessels?.vessel0?.displayCountry ?? null,
              class: ev.vessels?.vessel0?.vesselType ?? null,
            },
            secondVessel: ev.vessels?.vessel1
              ? {
                  name: ev.vessels.vessel1.name ?? null,
                  mmsi: ev.vessels.vessel1.mmsi ?? null,
                  imo: ev.vessels.vessel1.imo ?? null,
                  flag: ev.vessels.vessel1.displayCountry ?? null,
                }
              : null,
            source: "fiu-lac-iuu",
          };
          openMapDetail({
            id: `fiuIuu:${ev.eventId}`,
            title: fiuIuuEventTitle(fiuEvent),
            anchor,
            body: <FiuIuuEventDetailBody event={fiuEvent} />,
          });
          return;
        }
        setSelectedSkylightEventId(ev.eventId);
        return;
      }
      if (evOrId) setSelectedSkylightEventId(evOrId);
    },
    [openMapDetail]
  );

  const minimizeVesselDossier = useCallback((mmsi) => {
    const key = String(mmsi || "").trim();
    if (!key) return;
    setVesselDossiers((prev) =>
      prev.map((s) => (s.mmsi === key ? { ...s, panelOpen: false } : s))
    );
  }, []);

  const toggleVesselDossierPanel = useCallback((mmsi) => {
    const key = String(mmsi || "").trim();
    if (!key) return;
    setFocusedDossierMmsi(key);
    setVesselDossiers((prev) =>
      prev.map((s) =>
        s.mmsi === key ? { ...s, panelOpen: !s.panelOpen } : s
      )
    );
  }, []);

  const closeRightMenus = useCallback(() => {
    setSkylightListOpen(false);
    setMarkersListOpen(false);
    setZonesListOpen(false);
    setMeasurementsListOpen(false);
    setVesselDossiers((prev) => prev.map((s) => ({ ...s, panelOpen: false })));
  }, []);

  const toggleRightMenu = useCallback(
    (setter) => {
      setter((open) => {
        const next = !open;
        if (next && isMobile) setPanelOpen(false);
        return next;
      });
    },
    [isMobile]
  );

  const rightMenusOpen =
    (skylightEventsOn && skylightListOpen) ||
    (markersOn && markersListOpen) ||
    (zonesToolOn && zonesListOpen) ||
    (measureToolActive && measurementsListOpen) ||
    vesselDossiers.some((s) => s.panelOpen);

  const focusedVesselDossier = useMemo(() => {
    if (!vesselDossiers.length) return null;
    return (
      vesselDossiers.find((s) => s.mmsi === focusedDossierMmsi) ||
      vesselDossiers[vesselDossiers.length - 1]
    );
  }, [vesselDossiers, focusedDossierMmsi]);

  const vesselTrackSessions = useMemo(
    () =>
      vesselDossiers
        .filter((s) => s.dossier)
        .map((s) => ({
          key: s.mmsi,
          dossier: s.dossier,
          color: s.color,
        })),
    [vesselDossiers]
  );

  const focusedAisMmsi = useMemo(() => {
    if (focusedDetailId?.startsWith("ais:")) {
      return focusedDetailId.slice("ais:".length);
    }
    return focusedVesselDossier?.mmsi ?? null;
  }, [focusedDetailId, focusedVesselDossier?.mmsi]);

  useEffect(() => {
    if (!isMobile) return undefined;
    if (!panelOpen && !rightMenusOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setPanelOpen(false);
      closeRightMenus();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [panelOpen, rightMenusOpen, isMobile, closeRightMenus]);

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
      setMarkerForm(null);
      setMarkerPickMode(false);
      setMarkerPendingPoint(null);
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
      expandToolWindow("marker");
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
      expandToolWindow("zone");
    }
    window.addEventListener(CENTINELA_ADD_ZONE_EVENT, onAddZone);
    return () => {
      window.removeEventListener(CENTINELA_ADD_ZONE_EVENT, onAddZone);
    };
  }, []);

  useEffect(() => {
    function onAddMeasurement(e) {
      const lat = Number(e?.detail?.lat);
      const lng = Number(e?.detail?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setMeasureToolOn(true);
      setMeasureOn(true);
      setMeasurePinned(false);
      setMeasureEditingId(null);
      setMeasureName("");
      setMeasureMode("distance");
      setMeasureLoadSnapshot({
        points: [{ lat, lng }],
        deducts: [],
        deductSource: [],
        circles: [],
        unit: measureUnit,
      });
      setMeasureLoadKey((k) => k + 1);
      expandToolWindow("measure");
    }
    window.addEventListener(CENTINELA_ADD_MEASUREMENT_EVENT, onAddMeasurement);
    return () => {
      window.removeEventListener(
        CENTINELA_ADD_MEASUREMENT_EVENT,
        onAddMeasurement
      );
    };
  }, [measureUnit]);

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
      setZoneForm(null);
      setZonePickMode(false);
      setZonePendingPoint(null);
      setZoneVertexMove(null);
      setZoneDraft(null);
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

  async function refreshUserMeasurements() {
    setMeasurementsLoading(true);
    try {
      const res = await listMapMeasurements();
      setUserMeasurements(
        Array.isArray(res?.measurements) ? res.measurements : []
      );
    } catch (e) {
      setUserMeasurements([]);
      console.error(e);
    } finally {
      setMeasurementsLoading(false);
    }
  }

  useEffect(() => {
    if (!measureToolActive) return undefined;
    void refreshUserMeasurements();
    return undefined;
  }, [measureToolActive]);

  function clearMeasureDraft({ keepName = false } = {}) {
    setMeasureResetKey((k) => k + 1);
    setMeasureTotalMeters(0);
    setMeasureRadiusMeters(0);
    setMeasurePinned(false);
    setMeasureEditingId(null);
    setMeasureLoadSnapshot(null);
    if (!keepName) setMeasureName("");
  }

  async function handleSaveMeasurement() {
    const name = String(measureName || "").trim();
    if (!name) return;
    const snap = normalizeMeasurementSnapshot(
      measureSnapshotApiRef.current?.getSnapshot?.() || {}
    );
    snap.unit = measureUnit;
    if (!canSaveMeasurementSnapshot(snap)) return;
    setMeasureSaving(true);
    try {
      const payload = {
        name,
        unit: measureUnit,
        points: snap.points,
        deducts: snap.deducts,
        deductSource: snap.deductSource,
        circles: snap.circles,
        totalMeters: measureTotalMeters,
      };
      if (measureEditingId) {
        await updateMapMeasurement(measureEditingId, payload);
      } else {
        await createMapMeasurement(payload);
      }
      setMeasureEditingId(null);
      setMeasureName("");
      setMeasureLoadSnapshot(null);
      await refreshUserMeasurements();
    } catch (e) {
      console.error(e);
    } finally {
      setMeasureSaving(false);
    }
  }

  function handleEditMeasurement(m) {
    if (!m) return;
    const id = m._id || m.id;
    setMeasureToolOn(true);
    setMeasureOn(true);
    setMeasurePinned(true);
    setMeasureUnit(m.unit === "km" ? "km" : "nm");
    setMeasureMode("distance");
    setMeasureName(m.name || "");
    setMeasureEditingId(id || null);
    setSelectedMeasurementId(id || null);
    setMeasureLoadSnapshot(m);
    setMeasureLoadKey((k) => k + 1);
    expandToolWindow("measure");
    if (isMobile) setPanelOpen(false);
  }

  async function handleDeleteMeasurement(m) {
    const id = m?._id || m?.id;
    if (!id) return;
    const parts = formatMeasureDistanceParts(
      m.totalMeters || 0,
      m.unit === "km" ? "km" : "nm"
    );
    const result = await confirmDelete({
      resource: "medición",
      summaryHtml: `<ul class="mb-2 ps-3"><li><strong>Nombre:</strong> ${escapeHtml(
        m.name || "—"
      )}</li><li><strong>Total:</strong> ${escapeHtml(
        `${parts.value} ${parts.unitLabel}`
      )}</li></ul>`,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deleteMapMeasurement(id);
      notifyDeleteSuccess(res?.msg || "Medición eliminada.");
      if (String(selectedMeasurementId) === String(id)) {
        setSelectedMeasurementId(null);
      }
      if (String(measureEditingId) === String(id)) {
        clearMeasureDraft();
      }
      await refreshUserMeasurements();
    } catch (err) {
      notifyDeleteError(err, "No se pudo eliminar la medición.");
    }
  }

  async function handleToggleMeasurementHidden(m) {
    const id = m?._id || m?.id;
    if (!id) return;
    const nextHidden = !m.hidden;
    try {
      await updateMapMeasurement(id, { hidden: nextHidden });
      setUserMeasurements((list) =>
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

  function fitToMeasurement(m) {
    const map = mapRef.current;
    if (!map || !m) return;
    setSelectedMeasurementId(m._id || m.id || null);
    const latlngs = [];
    for (const p of m.points || []) {
      const lat = Number(p?.lat);
      const lng = Number(p?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) latlngs.push([lat, lng]);
    }
    for (const c of m.circles || []) {
      const clat = Number(c?.center?.lat);
      const clng = Number(c?.center?.lng);
      const elat = Number(c?.edge?.lat);
      const elng = Number(c?.edge?.lng);
      if (Number.isFinite(clat) && Number.isFinite(clng)) {
        latlngs.push([clat, clng]);
      }
      if (Number.isFinite(elat) && Number.isFinite(elng)) {
        latlngs.push([elat, elng]);
      }
    }
    if (latlngs.length === 0) return;
    if (latlngs.length === 1) {
      map.flyTo(latlngs[0], Math.max(map.getZoom(), 12), { duration: 0.6 });
      return;
    }
    map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 14 });
  }

  const labelMenuOptions = useMemo(
    () =>
      LABEL_MENU_KEYS.map(({ id, label }) => ({
        id,
        label,
        checked: Boolean(labelVisibility[id]),
        onChange: (checked) =>
          setLabelVisibility((v) => ({ ...v, [id]: checked })),
      })),
    [labelVisibility]
  );

  const labelsOnCount = labelMenuOptions.filter((opt) => opt.checked).length;
  const labelsAllOn = labelsOnCount === labelMenuOptions.length;
  const labelsSomeOn = labelsOnCount > 0;

  function toggleAllLabels(checked) {
    setLabelVisibility({
      ais: checked,
      markers: checked,
      zones: checked,
      distances: checked,
    });
  }

  const toolsLayerItems = [
    {
      id: "markers",
      label: "Mis marcadores",
      checked: markersOn,
      onChange: (checked) => setMarkersOn(Boolean(checked)),
    },
    {
      id: "zones",
      label: "Mis zonas",
      checked: zonesToolOn,
      onChange: (checked) => setZonesToolOn(Boolean(checked)),
    },
    {
      id: "measure",
      label: "Mis mediciones",
      checked: measureToolOn,
      onChange: (checked) => setMeasureToolOn(Boolean(checked)),
    },
  ];
  const toolsLayersOnCount = toolsLayerItems.filter((i) => i.checked).length;
  const toolsLayersAllOn = toolsLayersOnCount === toolsLayerItems.length;
  const toolsLayersSomeOn = toolsLayersOnCount > 0;

  function toggleAllToolsLayers(checked) {
    const on = Boolean(checked);
    setMarkersOn(on);
    setZonesToolOn(on);
    setMeasureToolOn(on);
  }

  const panelClass = [
    "centinela-glass",
    panelOpen ? "is-open" : "is-collapsed",
    isMobile ? "centinela-glass--drawer" : "centinela-glass--float",
  ].join(" ");

  const marineToolItems = {
    marine: [
      {
        id: "bathymetry",
        icon: "bi-moisture",
        label: "Batimetría",
        active: bathymetryOn,
        popover: bathymetryOn
          ? bathymetryStatus.error
            ? bathymetryStatus.error
            : bathymetryStatus.loading
              ? "Cargando batimetría…"
              : "Batimetría"
          : "Batimetría",
        onClick: () => setBathymetryOn((on) => !on),
      },
      {
        id: "wind",
        icon: "bi-wind",
        label: "Viento",
        active: windLayerOn,
        popover: windLayerOn ? windStatusLine : "Viento",
        onClick: () => setWindLayerOn((on) => !on),
      },
      {
        id: "currents",
        icon: "bi-water",
        label: "Corrientes",
        active: currentsLayerOn,
        popover: currentsLayerOn ? currentsStatusLine : "Corrientes",
        onClick: () => setCurrentsLayerOn((on) => !on),
      },
      {
        id: "waves",
        icon: "bi-tsunami",
        label: "Olas",
        active: wavesLayerOn,
        popover: wavesLayerOn ? wavesStatusLine : "Olas",
        onClick: () => setWavesLayerOn((on) => !on),
      },
    ],
    tools: [
      {
        id: "hc",
        icon: "bi-droplet-half",
        label: "Simular incidente de HC",
        open: hcOpen || isToolMinimized("hc"),
        active: hcOpen && isToolWindowVisible("hc"),
        focused:
          hcOpen &&
          isToolWindowVisible("hc") &&
          focusedToolId === "hc",
        popover: "Simular incidente de HC",
        onClick: () => {
          handleToolDockClick("hc", {
            isOn: hcOpen,
            turnOn: () => {
              if (isMobile) setPanelOpen(false);
              setHcOpen(true);
            },
            turnOff: () => {
              setHcOpen(false);
              setHcPickMode(false);
              setHcResult(null);
              setHcPlaying(false);
              setHcPickLatLng(null);
            },
          });
        },
      },
      {
        id: "sar",
        icon: "bi-compass",
        label: "Simular deriva SAR",
        open: sarOpen || isToolMinimized("sar"),
        active: sarOpen && isToolWindowVisible("sar"),
        focused:
          sarOpen &&
          isToolWindowVisible("sar") &&
          focusedToolId === "sar",
        popover: "Simular deriva SAR",
        onClick: () => {
          handleToolDockClick("sar", {
            isOn: sarOpen,
            turnOn: () => {
              if (isMobile) setPanelOpen(false);
              setSarOpen(true);
            },
            turnOff: () => {
              setSarOpen(false);
              setSarPickMode(false);
              setSarResult(null);
              setSarPlaying(false);
              setSarPickLatLng(null);
            },
          });
        },
      },
      {
        id: "goto",
        icon: "bi-geo-alt",
        label: "Ir a un punto",
        open: goToOpen || isToolMinimized("goto"),
        active: goToOpen && isToolWindowVisible("goto"),
        focused:
          goToOpen &&
          isToolWindowVisible("goto") &&
          focusedToolId === "goto",
        popover: "Ir a un punto (DMS)",
        onClick: () => {
          handleToolDockClick("goto", {
            isOn: goToOpen,
            turnOn: () => {
              if (isMobile) setPanelOpen(false);
              setGoToOpen(true);
            },
            turnOff: () => setGoToOpen(false),
          });
        },
      },
      {
        id: "markers",
        icon: "bi-bookmark-star",
        label: "Mis marcadores",
        open: Boolean(markerForm) || isToolMinimized("marker"),
        active: Boolean(markerForm) && isToolWindowVisible("marker"),
        focused:
          Boolean(markerForm) &&
          isToolWindowVisible("marker") &&
          focusedToolId === "marker",
        popover: "Mis marcadores",
        onClick: () => {
          if (!markersOn) {
            if (isMobile) setPanelOpen(false);
            setMarkersOn(true);
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
            return;
          }
          if (!markerForm) {
            if (isMobile) setPanelOpen(false);
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
            return;
          }
          if (isToolMinimized("marker")) {
            expandToolWindow("marker");
            return;
          }
          if (
            isToolWindowVisible("marker") &&
            focusedToolId !== "marker"
          ) {
            focusToolWindow("marker");
            return;
          }
          /* Cierra la ventana; la capa sigue (Capas). */
          closeMarkerForm();
        },
      },
      {
        id: "zones",
        icon: "bi-pentagon",
        label: "Mis zonas",
        open: Boolean(zoneForm) || isToolMinimized("zone"),
        active: Boolean(zoneForm) && isToolWindowVisible("zone"),
        focused:
          Boolean(zoneForm) &&
          isToolWindowVisible("zone") &&
          focusedToolId === "zone",
        popover: "Mis zonas",
        onClick: () => {
          if (!zonesToolOn) {
            if (isMobile) setPanelOpen(false);
            setZonesToolOn(true);
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
            return;
          }
          if (!zoneForm) {
            if (isMobile) setPanelOpen(false);
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
            return;
          }
          if (isToolMinimized("zone")) {
            expandToolWindow("zone");
            return;
          }
          if (
            isToolWindowVisible("zone") &&
            focusedToolId !== "zone"
          ) {
            focusToolWindow("zone");
            return;
          }
          closeZoneForm();
        },
      },
      {
        id: "measure",
        icon: "bi-rulers",
        label: "Medir distancias y radios",
        open: measurePanelOpen || isToolMinimized("measure"),
        active: measurePanelOpen && isToolWindowVisible("measure"),
        focused:
          measurePanelOpen &&
          isToolWindowVisible("measure") &&
          focusedToolId === "measure",
        popover: "Medir distancias y radios",
        onClick: () => {
          if (!measureToolOn || !measurePanelOpen) {
            if (isMobile) setPanelOpen(false);
            openMeasurePanel();
            return;
          }
          if (isToolMinimized("measure")) {
            expandToolWindow("measure");
            return;
          }
          if (focusedToolId !== "measure") {
            focusToolWindow("measure");
            return;
          }
          closeMeasurePanel();
        },
      },
    ],
  };

  return (
    <div
      className={[
        "centinela-page",
        !isMobile ? "centinela-page--has-dock" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!isMobile ? (
        <div className="centinela-page__brand-bar" aria-label="Sistema Centinela">
          <img
            className="centinela-page__brand-bar-logo"
            src={isDark ? "/img/Logo-PNN-Blanco.png" : "/img/Logo-PNN.png"}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <div className="centinela-page__brand-bar-text">
            <span className="centinela-page__brand-bar-title">Sistema Centinela</span>
            <span className="centinela-page__brand-bar-credit">
              ARMADA NACIONAL · PREFECTURA NACIONAL NAVAL
            </span>
          </div>
        </div>
      ) : (
        <img
          className="centinela-page__brand"
          src="/img/Logo-PNN-Blanco.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}
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
          <ClosePopupsOnVesselDetail active={mapDetails.length > 0} />
          <MapClickCoords
            enabled={!mapToolCaptureActive}
            windLayerOn={windLayerOn}
            currentsLayerOn={currentsLayerOn}
            wavesLayerOn={wavesLayerOn}
            envForecastHoursOffset={envForecastHours}
            bathymetryLayerOn={bathymetryOn}
          />
          <ZoneMapPickClick
            active={zoneMapPickActive || markerMapPickActive}
            onPick={(ll) => {
              const point = { ...ll, t: Date.now() };
              if (zoneMapPickActive) setZonePendingPoint(point);
              else if (markerMapPickActive) {
                setMarkerPendingPoint(point);
                setMarkerPickMode(false);
              }
            }}
          />
          <HcMapPickClick
            active={hcMapPickActive}
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
            active={sarMapPickActive}
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
          {measurePanelOpen ? (
            <MeasureDistanceLayer
              active={measureOn && !measurePinned}
              pinned={measurePinned}
              mapInteractive={measureMapInteractive}
              mode={measureMode}
              unit={measureUnit}
              resetKey={measureResetKey}
              undoKey={measureUndoKey}
              loadKey={measureLoadKey}
              loadSnapshot={measureLoadSnapshot}
              snapshotApiRef={measureSnapshotApiRef}
              onTotalMetersChange={setMeasureTotalMeters}
              onRadiusMetersChange={setMeasureRadiusMeters}
            />
          ) : null}
          {measureToolActive ? (
            <UserMeasurementsLayer
              measurements={userMeasurements}
              excludeId={measureEditingId}
              showNames={labelVisibility.distances}
            />
          ) : null}
          {markersOn ? (
            <UserMarkersLayer
              markers={userMarkers}
              selectedId={selectedMarkerId}
              showNames={labelVisibility.markers}
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
          {zonesToolOn ? (
            <UserZonesLayer
              zones={userZones}
              showNames={labelVisibility.zones}
            />
          ) : null}
          {zoneForm && zoneDraft?.vertices?.length ? (
            <ZoneDraftPreview
              vertices={zoneDraft.vertices}
              color={zoneDraft.color}
              interactive={zoneExpanded}
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
              selectedMmsi={focusedAisMmsi}
              showNames={labelVisibility.ais}
              onSelectVessel={selectAisVessel}
            />
          ) : null}
          <SkylightEventsLayer
            enabled={skylightEventsOn}
            eventTypes={skylightActiveEventTypes}
            darkOnly={skylightDarkOnly}
            aoiIds={skylightAoiIdsForQuery}
            selectedEventId={selectedSkylightEventId}
            matchedAisMmsis={matchedAisSkylightMmsis}
            selectedMmsi={focusedAisMmsi}
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
              selectedMmsi={focusedAisMmsi}
            />
          ) : null}
          <SkylightVesselTrackLayer
            sessions={vesselTrackSessions}
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

      {mapDetails.map((detail, index) => {
        const aisMmsi = detail.id?.startsWith("ais:")
          ? detail.id.slice("ais:".length)
          : null;
        const accentColor =
          detail.accentColor ||
          (aisMmsi
            ? vesselDossiers.find((s) => s.mmsi === aisMmsi)?.color
            : null);
        return (
          <CentinelaDetailWindow
            key={detail.id}
            open
            title={detail.title || "Detalle"}
            anchor={detail.anchor ?? null}
            focused={detail.id === focusedDetailId}
            onFocus={() => focusMapDetail(detail.id)}
            onClose={() => closeMapDetail(detail.id)}
            staggerIndex={index}
            accentColor={accentColor || null}
          >
            {detail.body}
          </CentinelaDetailWindow>
        );
      })}

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
        {isMobile ? (
          <>
            {measurePanelOpen ? (
              <MeasureDistancePanel
                unit={measureUnit}
                onUnitChange={setMeasureUnit}
                mode={measureMode}
                onModeChange={setMeasureMode}
                totalMeters={measureTotalMeters}
                pinned={measurePinned}
                name={measureName}
                onNameChange={setMeasureName}
                onSave={() => {
                  void handleSaveMeasurement();
                }}
                saving={measureSaving}
                saveDisabled={!(measureTotalMeters > 0)}
                editing={Boolean(measureEditingId)}
                minimized={isToolMinimized("measure")}
                onToggleMinimized={() => toggleToolWindowMinimized("measure")}
                onUndo={() => setMeasureUndoKey((k) => k + 1)}
                onReset={() => {
                  clearMeasureDraft();
                  setMeasureMode("distance");
                }}
                onPin={() => setMeasurePinned((p) => !p)}
                onClose={closeMeasurePanel}
              />
            ) : null}
            {goToOpen ? (
              <GoToPointPanel
                minimized={isToolMinimized("goto")}
                onToggleMinimized={() => toggleToolWindowMinimized("goto")}
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
                minimized={isToolMinimized("hc")}
                onToggleMinimized={() => toggleToolWindowMinimized("hc")}
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
                minimized={isToolMinimized("sar")}
                onToggleMinimized={() => toggleToolWindowMinimized("sar")}
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
                minimized={isToolMinimized("marker")}
                onToggleMinimized={() => toggleToolWindowMinimized("marker")}
                onConsumeMapPoint={() => setMarkerPendingPoint(null)}
                onTogglePickMode={(next) => {
                  const on = Boolean(next);
                  setMarkerPickMode(on);
                  if (on) {
                    setZonePickMode(false);
                    closeMeasurePanel();
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
                minimized={isToolMinimized("zone")}
                onToggleMinimized={() => toggleToolWindowMinimized("zone")}
                onConsumeMapPoint={() => setZonePendingPoint(null)}
                pendingVertexMove={zoneVertexMove}
                onConsumeVertexMove={() => setZoneVertexMove(null)}
                onTogglePickMode={(next) => {
                  const on = Boolean(next);
                  setZonePickMode(on);
                  if (on) {
                    setMarkerPickMode(false);
                    closeMeasurePanel();
                    setHcPickMode(false);
                    setSarPickMode(false);
                  }
                }}
                onClose={closeZoneForm}
                onSave={handleSaveZone}
                onPointsChange={(draft) => setZoneDraft(draft)}
              />
            ) : null}
          </>
        ) : null}
      </div>

      {!isMobile ? (
        <div className="centinela-floating-tools">
          <CentinelaFloatingToolWindow
            open={measurePanelOpen}
            minimized={isToolMinimized("measure")}
            focused={focusedToolId === "measure"}
            title="Medir distancias y radios"
            dockId="measure"
            onFocus={() => focusToolWindow("measure")}
            initialPosition={FLOAT_TOOL_POS.measure}
          >
            <MeasureDistancePanel
              unit={measureUnit}
              onUnitChange={setMeasureUnit}
              mode={measureMode}
              onModeChange={setMeasureMode}
              totalMeters={measureTotalMeters}
              pinned={measurePinned}
              name={measureName}
              onNameChange={setMeasureName}
              onSave={() => {
                void handleSaveMeasurement();
              }}
              saving={measureSaving}
              saveDisabled={!(measureTotalMeters > 0)}
              editing={Boolean(measureEditingId)}
              minimized={false}
              onToggleMinimized={() => minimizeToolWindow("measure")}
              onUndo={() => setMeasureUndoKey((k) => k + 1)}
              onReset={() => {
                clearMeasureDraft();
                setMeasureMode("distance");
              }}
              onPin={() => setMeasurePinned((p) => !p)}
              onClose={closeMeasurePanel}
            />
          </CentinelaFloatingToolWindow>
          <CentinelaFloatingToolWindow
            open={goToOpen}
            minimized={isToolMinimized("goto")}
            focused={focusedToolId === "goto"}
            title="Ir a un punto"
            dockId="goto"
            onFocus={() => focusToolWindow("goto")}
            initialPosition={FLOAT_TOOL_POS.goto}
          >
            <GoToPointPanel
              minimized={false}
              onToggleMinimized={() => minimizeToolWindow("goto")}
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
          </CentinelaFloatingToolWindow>
          <CentinelaFloatingToolWindow
            open={hcOpen}
            minimized={isToolMinimized("hc")}
            focused={focusedToolId === "hc"}
            title="Simular incidente de HC"
            dockId="hc"
            onFocus={() => focusToolWindow("hc")}
            initialPosition={FLOAT_TOOL_POS.hc}
          >
            <HcSpillPanel
              pickLatLng={hcPickLatLng}
              pickActive={hcPickMode}
              onPickRequest={() => setHcPickMode(true)}
              minimized={false}
              onToggleMinimized={() => minimizeToolWindow("hc")}
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
          </CentinelaFloatingToolWindow>
          <CentinelaFloatingToolWindow
            open={sarOpen}
            minimized={isToolMinimized("sar")}
            focused={focusedToolId === "sar"}
            title="Simular deriva SAR"
            dockId="sar"
            onFocus={() => focusToolWindow("sar")}
            initialPosition={FLOAT_TOOL_POS.sar}
          >
            <SarDriftPanel
              pickLatLng={sarPickLatLng}
              pickActive={sarPickMode}
              onPickRequest={() => setSarPickMode(true)}
              minimized={false}
              onToggleMinimized={() => minimizeToolWindow("sar")}
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
          </CentinelaFloatingToolWindow>
          {markerForm ? (
            <CentinelaFloatingToolWindow
              open
              minimized={isToolMinimized("marker")}
              focused={focusedToolId === "marker"}
              title="Marcador"
              dockId="markers"
              onFocus={() => focusToolWindow("marker")}
              initialPosition={FLOAT_TOOL_POS.marker}
            >
              <MarkerFormModal
                mode={markerForm.mode}
                initial={markerForm.initial}
                saving={markerSaving}
                pickMode={markerPickMode}
                pendingMapPoint={markerPendingPoint}
                minimized={false}
                onToggleMinimized={() => minimizeToolWindow("marker")}
                onConsumeMapPoint={() => setMarkerPendingPoint(null)}
                onTogglePickMode={(next) => {
                  const on = Boolean(next);
                  setMarkerPickMode(on);
                  if (on) {
                    setZonePickMode(false);
                    closeMeasurePanel();
                    setHcPickMode(false);
                    setSarPickMode(false);
                  }
                }}
                onClose={closeMarkerForm}
                onSave={handleSaveMarker}
              />
            </CentinelaFloatingToolWindow>
          ) : null}
          {zoneForm ? (
            <CentinelaFloatingToolWindow
              open
              minimized={isToolMinimized("zone")}
              focused={focusedToolId === "zone"}
              title="Zona"
              dockId="zones"
              onFocus={() => focusToolWindow("zone")}
              initialPosition={FLOAT_TOOL_POS.zone}
            >
              <ZoneFormModal
                mode={zoneForm.mode}
                initial={zoneForm.initial}
                saving={zoneSaving}
                pickMode={zonePickMode}
                pendingMapPoint={zonePendingPoint}
                minimized={false}
                onToggleMinimized={() => minimizeToolWindow("zone")}
                onConsumeMapPoint={() => setZonePendingPoint(null)}
                pendingVertexMove={zoneVertexMove}
                onConsumeVertexMove={() => setZoneVertexMove(null)}
                onTogglePickMode={(next) => {
                  const on = Boolean(next);
                  setZonePickMode(on);
                  if (on) {
                    setMarkerPickMode(false);
                    closeMeasurePanel();
                    setHcPickMode(false);
                    setSarPickMode(false);
                  }
                }}
                onClose={closeZoneForm}
                onSave={handleSaveZone}
                onPointsChange={(draft) => setZoneDraft(draft)}
              />
            </CentinelaFloatingToolWindow>
          ) : null}
        </div>
      ) : null}

      {!isMobile ? (
        <CentinelaMarineToolsBar
          layout="dock"
          marineItems={marineToolItems.marine}
          toolItems={marineToolItems.tools}
        />
      ) : null}

      <div
        className={[
          "centinela-right-panels",
          isMobile ? "centinela-right-panels--mobile" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
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
            besideFab
          />
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
              expandToolWindow("marker");
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
              setSelectedZoneId(null);
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
              expandToolWindow("zone");
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

        {measureToolActive && measurementsListOpen ? (
          <UserMeasurementsPanel
            visible
            measurements={userMeasurements}
            loading={measurementsLoading}
            selectedId={selectedMeasurementId}
            isMobile={isMobile}
            besideFab
            onClose={() => {
              setMeasurementsListOpen(false);
            }}
            onNew={() => {
              openMeasurePanel();
            }}
            onEdit={(m) => {
              handleEditMeasurement(m);
            }}
            onDelete={(m) => {
              void handleDeleteMeasurement(m);
            }}
            onToggleHidden={(m) => {
              void handleToggleMeasurementHidden(m);
            }}
            onSelect={fitToMeasurement}
          />
        ) : null}

        {vesselDossiers
          .filter((s) => s.panelOpen)
          .map((s) => (
            <SkylightVesselDossierPanel
              key={s.mmsi}
              visible
              mmsi={s.mmsi}
              name={s.name}
              loading={Boolean(s.loading)}
              error={s.error || null}
              dossier={s.dossier || null}
              accentColor={s.color}
              aisLinked={matchedAisSkylightMmsis.has(String(s.mmsi))}
              onClose={() => minimizeVesselDossier(s.mmsi)}
              onSelectRelatedEvent={selectDossierRelatedEvent}
              onGoToTrack={goToVesselTrack}
              onGoToEvent={goToSkylightRelatedEvent}
              isMobile={isMobile}
              besideFab
            />
          ))}
      </div>

      <CentinelaVesselSearch
        vessels={visibleAisVessels}
        aisLayerOn={aisLayerOn}
        onSelectVessel={handleVesselSearchSelect}
      />

      <div className="centinela-right-fab-stack" role="toolbar" aria-label="Listas laterales">
        {skylightEventsOn ? (
          <button
            type="button"
            className={[
              "centinela-skylight-list-fab",
              skylightListOpen ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => toggleRightMenu(setSkylightListOpen)}
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

        {markersOn ? (
          <button
            type="button"
            className={[
              "centinela-skylight-list-fab",
              markersListOpen ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => toggleRightMenu(setMarkersListOpen)}
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

        {zonesToolOn ? (
          <button
            type="button"
            className={[
              "centinela-skylight-list-fab",
              zonesListOpen ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => toggleRightMenu(setZonesListOpen)}
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

        {measureToolActive ? (
          <button
            type="button"
            className={[
              "centinela-skylight-list-fab",
              measurementsListOpen ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => toggleRightMenu(setMeasurementsListOpen)}
            aria-pressed={measurementsListOpen}
            aria-label={
              measurementsListOpen
                ? "Ocultar mis mediciones"
                : "Mostrar mis mediciones"
            }
          >
            <i className="bi bi-rulers" aria-hidden />
            {userMeasurements.length > 0 ? (
              <span className="centinela-skylight-list-fab__badge">
                {userMeasurements.length > 99
                  ? "99+"
                  : userMeasurements.length}
              </span>
            ) : null}
          </button>
        ) : null}

        {vesselDossiers.map((s) => {
          const label = vesselDisplayLabel(s);
          return (
            <button
              key={s.mmsi}
              type="button"
              className={[
                "centinela-skylight-list-fab",
                "centinela-dossier-fab",
                s.panelOpen ? "is-active" : "",
                s.mmsi === focusedVesselDossier?.mmsi ? "is-focused" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--dossier-color": s.color }}
              onClick={() => toggleVesselDossierPanel(s.mmsi)}
              aria-pressed={Boolean(s.panelOpen)}
              data-sicen-popover={label}
              data-sicen-popover-placement="left"
              aria-label={
                s.panelOpen
                  ? `Ocultar historial de ${label}`
                  : `Mostrar historial de ${label}`
              }
            >
              <i className="bi bi-clock-history" aria-hidden />
            </button>
          );
        })}
      </div>

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
          onClick={() => {
            setPanelOpen((open) => {
              const next = !open;
              if (next && isMobile) closeRightMenus();
              return next;
            });
          }}
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

      {rightMenusOpen && isMobile ? (
        <button
          type="button"
          className="centinela-drawer-backdrop"
          aria-label="Cerrar menús laterales"
          onClick={closeRightMenus}
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

          <div className="centinela-zones">
            <div className="centinela-zones__header">
              <label className="centinela-zones__master">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={toolsLayersAllOn}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        toolsLayersSomeOn && !toolsLayersAllOn;
                    }
                  }}
                  onChange={(e) => toggleAllToolsLayers(e.target.checked)}
                  aria-label="Mostrar u ocultar marcadores, zonas y mediciones personales"
                />
              </label>
              <button
                type="button"
                className="centinela-zones__toggle"
                aria-expanded={toolsLayersMenuOpen}
                aria-controls="centinela-tools-layers-list"
                onClick={() => setToolsLayersMenuOpen((o) => !o)}
              >
                <i
                  className={`bi ${
                    toolsLayersMenuOpen ? "bi-chevron-down" : "bi-chevron-right"
                  }`}
                  aria-hidden
                />
                <span>Herramientas</span>
                <span className="centinela-zones__count">
                  {toolsLayersOnCount}/{toolsLayerItems.length}
                </span>
              </button>
            </div>
            {toolsLayersMenuOpen ? (
              <div
                id="centinela-tools-layers-list"
                className="centinela-zones__list"
                role="group"
                aria-label="Herramientas personales en el mapa"
              >
                {toolsLayerItems.map((item) => (
                  <label key={item.id} className="centinela-page__layer-item">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                    />
                    <span>{item.label}</span>
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
                  checked={labelsAllOn}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = labelsSomeOn && !labelsAllOn;
                    }
                  }}
                  onChange={(e) => toggleAllLabels(e.target.checked)}
                  aria-label="Mostrar u ocultar todas las etiquetas"
                />
              </label>
              <button
                type="button"
                className="centinela-zones__toggle centinela-labels-section__toggle"
                aria-expanded={labelsMenuOpen}
                aria-controls="centinela-labels-list"
                onClick={() => setLabelsMenuOpen((o) => !o)}
              >
                <i
                  className={`bi ${
                    labelsMenuOpen ? "bi-chevron-down" : "bi-chevron-right"
                  }`}
                  aria-hidden
                />
                <span>Etiquetas</span>
                <span className="centinela-zones__count">
                  {labelsOnCount}/{labelMenuOptions.length}
                </span>
              </button>
            </div>
            {labelsMenuOpen ? (
              <div
                id="centinela-labels-list"
                className="centinela-zones__list centinela-labels-section__list"
                role="group"
                aria-label="Etiquetas del mapa"
              >
                <CentinelaLabelsOptions options={labelMenuOptions} />
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

        {isMobile ? (
          <CentinelaMarineToolsBar
            layout="panel"
            marineItems={marineToolItems.marine}
            toolItems={marineToolItems.tools}
          />
        ) : null}
        </div>
      </aside>

      <CentinelaHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
