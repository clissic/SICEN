import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  destinationLatLng,
  distanceMeters,
  formatMeasureDistance,
  formatSegmentLabel,
  initialBearingDeg,
  labelRotationCssDeg,
  midpointLatLng,
} from "../../utils/geoMeasure.js";

const VERTEX_STYLE = {
  radius: 5,
  color: "#ffffff",
  weight: 2,
  fillColor: "#f59e0b",
  fillOpacity: 1,
  opacity: 1,
  interactive: false,
};

const LINE_STYLE = {
  color: "#f59e0b",
  weight: 2.5,
  opacity: 0.95,
  dashArray: "7 7",
  lineCap: "round",
  lineJoin: "round",
  interactive: false,
};

const PREVIEW_LINE_STYLE = {
  color: "#fbbf24",
  weight: 2,
  opacity: 0.85,
  dashArray: "5 6",
  lineCap: "round",
  lineJoin: "round",
  interactive: false,
};

const CIRCLE_STYLE = {
  color: "#f59e0b",
  weight: 2,
  opacity: 0.9,
  dashArray: "7 7",
  fillColor: "#f59e0b",
  fillOpacity: 0.06,
  interactive: false,
};

const PREVIEW_CIRCLE_STYLE = {
  color: "#fbbf24",
  weight: 2,
  opacity: 0.85,
  dashArray: "5 6",
  fillColor: "#fbbf24",
  fillOpacity: 0.05,
  interactive: false,
};

function labelIcon(text, bearingDeg) {
  const rot = labelRotationCssDeg(bearingDeg);
  return L.divIcon({
    className: "centinela-measure-label",
    html: `<span class="centinela-measure-label__text" style="transform:translate(-50%,-50%) rotate(${rot}deg) translateY(-0.7rem)">${text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function radiusLabelIcon(text, bearingDeg) {
  const rot = labelRotationCssDeg(bearingDeg);
  return L.divIcon({
    className: "centinela-measure-label",
    html: `<span class="centinela-measure-label__text" style="transform:translate(-50%,-50%) rotate(${rot}deg) translateY(-0.7rem)">${text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function vertexHandleIcon() {
  return L.divIcon({
    className: "centinela-measure-vertex",
    html: '<span class="centinela-measure-vertex__dot" aria-hidden="true"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function ll(latlng) {
  return { lat: latlng.lat, lng: latlng.lng };
}

function segmentNet(a, b, deductRadiusM = 0) {
  const raw = distanceMeters(a.lat, a.lng, b.lat, b.lng);
  const bearing = initialBearingDeg(a.lat, a.lng, b.lat, b.lng);
  const meters = Math.max(0, raw - (deductRadiusM || 0));
  let lineStart = a;
  let mid;
  if (deductRadiusM > 0 && raw > deductRadiusM) {
    lineStart = destinationLatLng(a.lat, a.lng, bearing, deductRadiusM);
    mid = midpointLatLng(lineStart.lat, lineStart.lng, b.lat, b.lng);
  } else if (deductRadiusM > 0) {
    lineStart = null;
    mid = midpointLatLng(a.lat, a.lng, b.lat, b.lng);
  } else {
    mid = midpointLatLng(a.lat, a.lng, b.lat, b.lng);
  }
  return { raw, meters, bearing, mid, lineStart };
}

/**
 * Distancia + radio en la misma sesión.
 * Tras un círculo, el siguiente tramo sale del centro pero resta el radio
 * (mide desde el perímetro). Con `pinned`, se pueden arrastrar vértices.
 */
export function MeasureDistanceLayer({
  active,
  pinned = false,
  mode = "distance",
  unit = "nm",
  resetKey = 0,
  undoKey = 0,
  onTotalMetersChange,
  onRadiusMetersChange,
}) {
  const map = useMap();
  const pointsRef = useRef([]);
  /** Deducción aplicada a cada tramo points[i]→points[i+1]. */
  const deductsRef = useRef([]);
  /** Índice de círculo que originó cada deducción (−1 si ninguna). */
  const deductSourceRef = useRef([]);
  const circlesRef = useRef([]);
  const pendingCenterRef = useRef(null);
  const nextDeductRef = useRef(0);
  /** Historial: 'vertex' | 'segment' | 'circle' */
  const historyRef = useRef([]);
  const undoApiRef = useRef({ undo: () => {} });
  const paintApiRef = useRef({ paintAll: () => {} });
  const prevResetKeyRef = useRef(resetKey);
  const pinnedRef = useRef(pinned);
  const activeRef = useRef(active);

  const committedRef = useRef(null);
  const handlesRef = useRef(null);
  const previewGroupRef = useRef(null);
  const cursorRef = useRef(null);
  const modeRef = useRef(mode);
  const unitRef = useRef(unit);
  const onTotalRef = useRef(onTotalMetersChange);
  const onRadiusRef = useRef(onRadiusMetersChange);

  modeRef.current = mode;
  unitRef.current = unit;
  pinnedRef.current = pinned;
  activeRef.current = active;
  onTotalRef.current = onTotalMetersChange;
  onRadiusRef.current = onRadiusMetersChange;

  const visible = active || pinned;

  useEffect(() => {
    const committed = L.layerGroup().addTo(map);
    const handles = L.layerGroup().addTo(map);
    const preview = L.layerGroup().addTo(map);
    committedRef.current = committed;
    handlesRef.current = handles;
    previewGroupRef.current = preview;
    return () => {
      committed.clearLayers();
      handles.clearLayers();
      preview.clearLayers();
      map.removeLayer(committed);
      map.removeLayer(handles);
      map.removeLayer(preview);
      committedRef.current = null;
      handlesRef.current = null;
      previewGroupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    function clearPreview() {
      previewGroupRef.current?.clearLayers();
    }

    function reportTotals() {
      const pts = pointsRef.current;
      const deducts = deductsRef.current;
      let total = 0;
      for (let i = 1; i < pts.length; i += 1) {
        const { meters } = segmentNet(pts[i - 1], pts[i], deducts[i - 1] || 0);
        total += meters;
      }
      // Los radios se restan del tramo siguiente: hay que sumarlos al total
      // para que la distancia acumulada refleje el recorrido completo.
      for (const c of circlesRef.current) {
        total += c.radiusM || 0;
      }
      onTotalRef.current?.(total);

      const circles = circlesRef.current;
      const lastR =
        circles.length > 0 ? circles[circles.length - 1].radiusM : 0;
      onRadiusRef.current?.(lastR);
    }

    /** Geometría (líneas, círculos, etiquetas) sin handles de edición. */
    function paintGeometry() {
      const group = committedRef.current;
      if (!group) return;
      group.clearLayers();
      const pts = pointsRef.current;
      const deducts = deductsRef.current;
      const circles = circlesRef.current;
      const u = unitRef.current;
      const editable = pinnedRef.current;

      for (const c of circles) {
        L.circle(c.center, {
          ...CIRCLE_STYLE,
          radius: c.radiusM,
        }).addTo(group);
        L.polyline([c.center, c.edge], LINE_STYLE).addTo(group);
        const bearing = initialBearingDeg(
          c.center.lat,
          c.center.lng,
          c.edge.lat,
          c.edge.lng
        );
        const mid = midpointLatLng(
          c.center.lat,
          c.center.lng,
          c.edge.lat,
          c.edge.lng
        );
        L.marker(mid, {
          icon: radiusLabelIcon(
            formatMeasureDistance(c.radiusM, u),
            bearing
          ),
          interactive: false,
          keyboard: false,
        }).addTo(group);
        if (!editable) {
          L.circleMarker(c.center, VERTEX_STYLE).addTo(group);
          L.circleMarker(c.edge, VERTEX_STYLE).addTo(group);
        }
      }

      for (let i = 0; i < pts.length; i += 1) {
        if (!editable) {
          L.circleMarker(pts[i], VERTEX_STYLE).addTo(group);
        }
        if (i === 0) continue;
        const { meters, bearing, mid, lineStart } = segmentNet(
          pts[i - 1],
          pts[i],
          deducts[i - 1] || 0
        );
        if (lineStart) {
          L.polyline([lineStart, pts[i]], LINE_STYLE).addTo(group);
        }
        if (meters > 0 || !(deducts[i - 1] > 0)) {
          L.marker(mid, {
            icon: labelIcon(formatSegmentLabel(meters, bearing, u), bearing),
            interactive: false,
            keyboard: false,
          }).addTo(group);
        }
      }

      reportTotals();
    }

    function applyPointMove(index, next) {
      const pts = pointsRef.current;
      const prev = pts[index];
      if (!prev) return;
      const dlat = next.lat - prev.lat;
      const dlng = next.lng - prev.lng;
      const updated = [...pts];
      updated[index] = next;
      pointsRef.current = updated;

      circlesRef.current = circlesRef.current.map((c) => {
        if (c.centerIdx !== index) return c;
        return {
          ...c,
          center: next,
          edge: { lat: c.edge.lat + dlat, lng: c.edge.lng + dlng },
        };
      });

      if (pendingCenterRef.current === prev) {
        pendingCenterRef.current = next;
      }
    }

    function applyCircleEdgeMove(circleIndex, next) {
      const circles = [...circlesRef.current];
      const c = circles[circleIndex];
      if (!c) return;
      const radiusM = distanceMeters(
        c.center.lat,
        c.center.lng,
        next.lat,
        next.lng
      );
      if (!(radiusM > 0)) return;
      circles[circleIndex] = { ...c, edge: next, radiusM };
      circlesRef.current = circles;

      const deducts = [...deductsRef.current];
      const sources = deductSourceRef.current;
      for (let i = 0; i < deducts.length; i += 1) {
        if (sources[i] === circleIndex) deducts[i] = radiusM;
      }
      deductsRef.current = deducts;

      if (circleIndex === circles.length - 1) {
        nextDeductRef.current = radiusM;
      }
    }

    function paintHandles() {
      const group = handlesRef.current;
      if (!group) return;
      group.clearLayers();
      if (!pinnedRef.current) return;

      const pts = pointsRef.current;
      const circles = circlesRef.current;

      for (let i = 0; i < pts.length; i += 1) {
        const idx = i;
        const marker = L.marker(pts[i], {
          icon: vertexHandleIcon(),
          draggable: true,
          autoPan: false,
          keyboard: false,
          zIndexOffset: 600,
        }).addTo(group);

        marker.on("drag", (e) => {
          applyPointMove(idx, ll(e.target.getLatLng()));
          paintGeometry();
        });
        marker.on("dragend", (e) => {
          applyPointMove(idx, ll(e.target.getLatLng()));
          paintAll();
        });
      }

      for (let ci = 0; ci < circles.length; ci += 1) {
        const circleIndex = ci;
        const c = circles[ci];
        const edgeMarker = L.marker(c.edge, {
          icon: vertexHandleIcon(),
          draggable: true,
          autoPan: false,
          keyboard: false,
          zIndexOffset: 610,
        }).addTo(group);

        edgeMarker.on("drag", (e) => {
          applyCircleEdgeMove(circleIndex, ll(e.target.getLatLng()));
          paintGeometry();
        });
        edgeMarker.on("dragend", (e) => {
          applyCircleEdgeMove(circleIndex, ll(e.target.getLatLng()));
          paintAll();
        });
      }
    }

    function paintAll() {
      paintGeometry();
      paintHandles();
    }

    function ensureRadiusCenter() {
      if (pendingCenterRef.current) return pendingCenterRef.current;
      const pts = pointsRef.current;
      if (pts.length > 0) {
        pendingCenterRef.current = pts[pts.length - 1];
        return pendingCenterRef.current;
      }
      return null;
    }

    function updatePreview(latlng) {
      clearPreview();
      const preview = previewGroupRef.current;
      if (!activeRef.current || pinnedRef.current || !preview || !latlng) {
        return;
      }
      const u = unitRef.current;
      const m = modeRef.current;

      if (m === "radius") {
        const center = ensureRadiusCenter();
        if (!center) return;
        const raw = distanceMeters(
          center.lat,
          center.lng,
          latlng.lat,
          latlng.lng
        );
        if (!(raw > 0)) return;
        const bearing = initialBearingDeg(
          center.lat,
          center.lng,
          latlng.lat,
          latlng.lng
        );
        const mid = midpointLatLng(
          center.lat,
          center.lng,
          latlng.lat,
          latlng.lng
        );
        L.circle(center, { ...PREVIEW_CIRCLE_STYLE, radius: raw }).addTo(
          preview
        );
        L.polyline([center, latlng], PREVIEW_LINE_STYLE).addTo(preview);
        L.marker(mid, {
          icon: radiusLabelIcon(formatMeasureDistance(raw, u), bearing),
          interactive: false,
          keyboard: false,
        }).addTo(preview);
        return;
      }

      const pts = pointsRef.current;
      if (pts.length === 0) return;
      const last = pts[pts.length - 1];
      const deduct = nextDeductRef.current || 0;
      const { meters, bearing, mid, lineStart } = segmentNet(
        last,
        latlng,
        deduct
      );
      if (lineStart) {
        L.polyline([lineStart, latlng], PREVIEW_LINE_STYLE).addTo(preview);
      }
      if (meters > 0 || !deduct) {
        L.marker(mid, {
          icon: labelIcon(formatSegmentLabel(meters, bearing, u), bearing),
          interactive: false,
          keyboard: false,
        }).addTo(preview);
      }
    }

    function clearAll() {
      pointsRef.current = [];
      deductsRef.current = [];
      deductSourceRef.current = [];
      circlesRef.current = [];
      pendingCenterRef.current = null;
      nextDeductRef.current = 0;
      historyRef.current = [];
      committedRef.current?.clearLayers();
      handlesRef.current?.clearLayers();
      clearPreview();
      onTotalRef.current?.(0);
      onRadiusRef.current?.(0);
    }

    function undoLast() {
      if (pinnedRef.current) return;
      const action = historyRef.current.pop();
      if (!action) return;

      if (action.type === "circle") {
        circlesRef.current = circlesRef.current.slice(0, -1);
        const prev = circlesRef.current[circlesRef.current.length - 1];
        nextDeductRef.current = prev ? prev.radiusM : 0;
      } else if (action.type === "segment") {
        const deduct =
          deductsRef.current[deductsRef.current.length - 1] || 0;
        pointsRef.current = pointsRef.current.slice(0, -1);
        deductsRef.current = deductsRef.current.slice(0, -1);
        deductSourceRef.current = deductSourceRef.current.slice(0, -1);
        if (deduct > 0) nextDeductRef.current = deduct;
      } else if (action.type === "vertex") {
        pointsRef.current = [];
        deductsRef.current = [];
        deductSourceRef.current = [];
        pendingCenterRef.current = null;
        nextDeductRef.current = 0;
      }

      if (pointsRef.current.length > 0) {
        pendingCenterRef.current =
          pointsRef.current[pointsRef.current.length - 1];
      } else if (action.type !== "vertex") {
        pendingCenterRef.current = null;
      }

      paintAll();
      updatePreview(cursorRef.current);
    }

    undoApiRef.current = { undo: undoLast };
    paintApiRef.current = { paintAll, clearPreview };

    const didReset = prevResetKeyRef.current !== resetKey;
    prevResetKeyRef.current = resetKey;
    if (didReset) {
      clearAll();
    }

    if (!visible) {
      if (!didReset) clearAll();
      map.getContainer().classList.remove(
        "centinela-map--measuring",
        "centinela-map--measure-pinned"
      );
      return undefined;
    }

    paintAll();

    if (pinned) {
      clearPreview();
      map.getContainer().classList.remove("centinela-map--measuring");
      map.getContainer().classList.add("centinela-map--measure-pinned");
      return () => {
        map.getContainer().classList.remove("centinela-map--measure-pinned");
        handlesRef.current?.clearLayers();
      };
    }

    map.getContainer().classList.remove("centinela-map--measure-pinned");
    map.getContainer().classList.add("centinela-map--measuring");

    if (modeRef.current === "radius") {
      ensureRadiusCenter();
    }

    function onClick(e) {
      L.DomEvent.stopPropagation(e);
      const latlng = ll(e.latlng);
      const m = modeRef.current;

      if (m === "radius") {
        let center = pendingCenterRef.current;
        if (!center && pointsRef.current.length > 0) {
          center = pointsRef.current[pointsRef.current.length - 1];
          pendingCenterRef.current = center;
        }

        if (!center) {
          pointsRef.current = [latlng];
          pendingCenterRef.current = latlng;
          historyRef.current.push({ type: "vertex" });
          paintAll();
          updatePreview(cursorRef.current);
          return;
        }

        const radiusM = distanceMeters(
          center.lat,
          center.lng,
          latlng.lat,
          latlng.lng
        );
        if (!(radiusM > 0)) return;

        const centerIdx = pointsRef.current.findIndex(
          (p) => p.lat === center.lat && p.lng === center.lng
        );
        circlesRef.current = [
          ...circlesRef.current,
          {
            center,
            edge: latlng,
            radiusM,
            centerIdx: centerIdx >= 0 ? centerIdx : pointsRef.current.length - 1,
          },
        ];
        nextDeductRef.current = radiusM;
        historyRef.current.push({ type: "circle" });
        pendingCenterRef.current = center;
        paintAll();
        updatePreview(cursorRef.current);
        return;
      }

      const pts = pointsRef.current;
      if (pts.length === 0) {
        pointsRef.current = [latlng];
        historyRef.current.push({ type: "vertex" });
        paintAll();
        updatePreview(cursorRef.current);
        return;
      }
      const deduct = nextDeductRef.current || 0;
      const source =
        deduct > 0 && circlesRef.current.length > 0
          ? circlesRef.current.length - 1
          : -1;
      nextDeductRef.current = 0;
      pointsRef.current = [...pts, latlng];
      deductsRef.current = [...deductsRef.current, deduct];
      deductSourceRef.current = [...deductSourceRef.current, source];
      historyRef.current.push({ type: "segment" });
      paintAll();
      updatePreview(cursorRef.current);
    }

    function onMove(e) {
      cursorRef.current = ll(e.latlng);
      updatePreview(cursorRef.current);
    }

    map.on("click", onClick);
    map.on("mousemove", onMove);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.getContainer().classList.remove("centinela-map--measuring");
      clearPreview();
    };
  }, [map, active, pinned, visible, resetKey]);

  useEffect(() => {
    if (!active || pinned || undoKey < 1) return;
    undoApiRef.current.undo();
  }, [undoKey, active, pinned]);

  useEffect(() => {
    if (!active || pinned) return;
    if (mode === "radius") {
      const pts = pointsRef.current;
      if (pts.length > 0) {
        pendingCenterRef.current = pts[pts.length - 1];
      }
    } else {
      pendingCenterRef.current = null;
    }
  }, [mode, active, pinned]);

  useEffect(() => {
    if (!visible) return;
    paintApiRef.current.paintAll?.();
    if (!active || pinned) {
      paintApiRef.current.clearPreview?.();
    }
  }, [unit, mode, active, pinned, visible]);

  return null;
}
