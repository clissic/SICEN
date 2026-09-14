import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  MAP_MARKER_DEFAULT_COLOR,
  MAP_MARKER_DEFAULT_ICON,
} from "../../constants/centinelaMarkerIcons.js";
import { formatCoordDms } from "../../utils/geoDms.js";

function markerIcon(color, icon) {
  const safeColor = color || MAP_MARKER_DEFAULT_COLOR;
  const safeIcon = icon || MAP_MARKER_DEFAULT_ICON;
  return L.divIcon({
    className: "centinela-user-marker",
    html: `<span class="centinela-marker-pin" style="background:${safeColor}"><span class="material-symbols-outlined">${safeIcon}</span></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function popupHtml(m, latDms, lngDms) {
  return `<div class="centinela-coords-popup__body">
    <div class="centinela-coords-popup__title">${escapeHtml(
      m.name || "Marcador"
    )}</div>
    <div><span class="centinela-coords-popup__label">Lat</span> ${escapeHtml(
      latDms
    )}</div>
    <div><span class="centinela-coords-popup__label">Lon</span> ${escapeHtml(
      lngDms
    )}</div>
    <div class="centinela-user-marker-popup__actions">
      <button type="button" class="centinela-user-marker-popup__btn" data-action="edit" aria-label="Editar marcador">
        <i class="bi bi-pencil" aria-hidden="true"></i>
      </button>
      <button type="button" class="centinela-user-marker-popup__btn" data-action="delete" aria-label="Eliminar marcador">
        <i class="bi bi-trash" aria-hidden="true"></i>
      </button>
    </div>
  </div>`;
}

/**
 * Capa Leaflet de marcadores personales del usuario.
 */
export function UserMarkersLayer({
  markers = [],
  selectedId = null,
  onSelect,
  onEdit,
  onDelete,
}) {
  const map = useMap();
  const groupRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onEditRef = useRef(onEdit);
  const onDeleteRef = useRef(onDelete);
  onSelectRef.current = onSelect;
  onEditRef.current = onEdit;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    groupRef.current = group;
    return () => {
      group.clearLayers();
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const m of markers) {
      if (!Number.isFinite(m?.lat) || !Number.isFinite(m?.lng)) continue;
      const id = String(m._id || m.id || "");
      const latDms = formatCoordDms(m.lat, "lat");
      const lngDms = formatCoordDms(m.lng, "lng");
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(m.color, m.icon),
        zIndexOffset: selectedId && id === String(selectedId) ? 800 : 500,
        keyboard: false,
      });
      marker.bindPopup(popupHtml(m, latDms, lngDms), {
        className: "centinela-coords-popup",
        closeButton: true,
      });
      marker.on("popupopen", () => {
        const root = marker.getPopup()?.getElement();
        if (!root) return;
        const actions = root.querySelector(
          ".centinela-user-marker-popup__actions"
        );
        if (!actions || actions.dataset.bound === "1") return;
        actions.dataset.bound = "1";
        actions.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-action]");
          if (!btn) return;
          L.DomEvent.stop(e);
          const action = btn.getAttribute("data-action");
          if (action === "edit") {
            map.closePopup();
            onEditRef.current?.(m);
          } else if (action === "delete") {
            map.closePopup();
            onDeleteRef.current?.(m);
          }
        });
      });
      marker.on("click", () => {
        onSelectRef.current?.(m);
      });
      marker.addTo(group);
    }
  }, [map, markers, selectedId]);

  return null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
