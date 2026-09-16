import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  fetchBathymetryAtPoint,
  formatDepthSummary,
} from "../../api/gebcoBathymetry.js";
import {
  fetchCurrentAtPoint,
  formatCurrentSummary,
} from "../../api/openMeteoCurrents.js";
import {
  fetchWaveAtPoint,
  formatWaveSummary,
} from "../../api/openMeteoWaves.js";
import {
  fetchWindAtPoint,
  formatWindSummary,
} from "../../api/openMeteoWind.js";
import { formatCoordDms } from "../../utils/geoDms.js";
import { leafletClickOnInteractive } from "../../utils/stopLeafletMapClick.js";

export const CENTINELA_ADD_MARKER_EVENT = "centinela:add-marker";
export const CENTINELA_ADD_ZONE_EVENT = "centinela:add-zone";
export const CENTINELA_ADD_MEASUREMENT_EVENT = "centinela:add-measurement";

function coordsPopupActionsHtml(lat, lng) {
  return `<div class="centinela-coords-popup__actions" role="group" aria-label="Crear desde este punto">
    <button type="button" class="centinela-coords-popup__tool-btn centinela-coords-popup__add-marker" data-lat="${lat}" data-lng="${lng}" aria-label="Agregar marcador" title="Agregar marcador">
      <i class="bi bi-bookmark-star" aria-hidden="true"></i>
      <span class="centinela-coords-popup__tool-badge" aria-hidden="true">+</span>
    </button>
    <button type="button" class="centinela-coords-popup__tool-btn centinela-coords-popup__add-zone" data-lat="${lat}" data-lng="${lng}" aria-label="Crear zona" title="Crear zona">
      <i class="bi bi-pentagon" aria-hidden="true"></i>
      <span class="centinela-coords-popup__tool-badge" aria-hidden="true">+</span>
    </button>
    <button type="button" class="centinela-coords-popup__tool-btn centinela-coords-popup__add-measurement" data-lat="${lat}" data-lng="${lng}" aria-label="Crear medición" title="Crear medición">
      <i class="bi bi-rulers" aria-hidden="true"></i>
      <span class="centinela-coords-popup__tool-badge" aria-hidden="true">+</span>
    </button>
  </div>`;
}

function coordsPopupHtml(lat, lng, extraBlock = "") {
  return `<div class="centinela-coords-popup__body">
    <div class="centinela-coords-popup__title">Coordenadas</div>
    <div><span class="centinela-coords-popup__label">Lat</span> ${formatCoordDms(lat, "lat")}</div>
    <div><span class="centinela-coords-popup__label">Lon</span> ${formatCoordDms(lng, "lng")}</div>
    ${extraBlock}
    ${coordsPopupActionsHtml(lat, lng)}
  </div>`;
}

function bindCoordsPopupActions(popup, map, lat, lng) {
  const root = popup.getElement();
  if (!root) return;

  const markerBtn = root.querySelector(".centinela-coords-popup__add-marker");
  if (markerBtn && markerBtn.dataset.bound !== "1") {
    markerBtn.dataset.bound = "1";
    markerBtn.addEventListener("click", (e) => {
      L.DomEvent.stop(e);
      window.dispatchEvent(
        new CustomEvent(CENTINELA_ADD_MARKER_EVENT, {
          detail: { lat, lng },
        })
      );
      map.closePopup(popup);
    });
  }

  const zoneBtn = root.querySelector(".centinela-coords-popup__add-zone");
  if (zoneBtn && zoneBtn.dataset.bound !== "1") {
    zoneBtn.dataset.bound = "1";
    zoneBtn.addEventListener("click", (e) => {
      L.DomEvent.stop(e);
      window.dispatchEvent(
        new CustomEvent(CENTINELA_ADD_ZONE_EVENT, {
          detail: { lat, lng },
        })
      );
      map.closePopup(popup);
    });
  }

  const measureBtn = root.querySelector(
    ".centinela-coords-popup__add-measurement"
  );
  if (measureBtn && measureBtn.dataset.bound !== "1") {
    measureBtn.dataset.bound = "1";
    measureBtn.addEventListener("click", (e) => {
      L.DomEvent.stop(e);
      window.dispatchEvent(
        new CustomEvent(CENTINELA_ADD_MEASUREMENT_EVENT, {
          detail: { lat, lng },
        })
      );
      map.closePopup(popup);
    });
  }
}

/**
 * Abre el popup de coordenadas (y datos de capas activas) en un punto.
 * Usado por click en el mapa y por «Ir al punto».
 * @returns {{ abort: () => void }}
 */
export function openMapCoordsPopup(
  map,
  lat,
  lng,
  {
    windLayerOn = false,
    currentsLayerOn = false,
    wavesLayerOn = false,
    bathymetryLayerOn = false,
    envForecastHoursOffset = 0,
  } = {}
) {
  const latlng = L.latLng(lat, lng);
  const popup = L.popup({
    className: "centinela-coords-popup",
    closeButton: true,
    autoPan: true,
  })
    .setLatLng(latlng)
    .setContent(coordsPopupHtml(lat, lng))
    .openOn(map);

  requestAnimationFrame(() => bindCoordsPopupActions(popup, map, lat, lng));

  if (
    !windLayerOn &&
    !currentsLayerOn &&
    !wavesLayerOn &&
    !bathymetryLayerOn
  ) {
    return { abort() {} };
  }

  const loadingParts = [];
  if (windLayerOn) {
    loadingParts.push(
      `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--loading">Consultando viento…</div>`
    );
  }
  if (currentsLayerOn) {
    loadingParts.push(
      `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--loading">Consultando corrientes…</div>`
    );
  }
  if (wavesLayerOn) {
    loadingParts.push(
      `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--loading">Consultando oleaje…</div>`
    );
  }
  if (bathymetryLayerOn) {
    loadingParts.push(
      `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--loading">Consultando profundidad…</div>`
    );
  }
  popup.setContent(coordsPopupHtml(lat, lng, loadingParts.join("")));
  requestAnimationFrame(() => bindCoordsPopupActions(popup, map, lat, lng));

  const controller = new AbortController();

  const tasks = [];
  if (windLayerOn) {
    tasks.push(
      fetchWindAtPoint(lat, lng, {
        signal: controller.signal,
        forecastHoursOffset: envForecastHoursOffset,
      })
        .then((point) => ({
          kind: "wind",
          html: `<div class="centinela-coords-popup__wind">
            <div class="centinela-coords-popup__wind-title">Viento (10 m)</div>
            <div>${formatWindSummary(point?.speedKn, point?.directionDeg)}</div>
          </div>`,
        }))
        .catch(() => ({
          kind: "wind",
          html: `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--error">No se pudo obtener viento</div>`,
        }))
    );
  }
  if (currentsLayerOn) {
    tasks.push(
      fetchCurrentAtPoint(lat, lng, {
        signal: controller.signal,
        forecastHoursOffset: envForecastHoursOffset,
      })
        .then((point) => ({
          kind: "currents",
          html: `<div class="centinela-coords-popup__wind">
            <div class="centinela-coords-popup__wind-title">Corriente superficial</div>
            <div>${formatCurrentSummary(point?.speedKn, point?.directionDeg)}</div>
          </div>`,
        }))
        .catch(() => ({
          kind: "currents",
          html: `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--error">No se pudo obtener corriente</div>`,
        }))
    );
  }
  if (wavesLayerOn) {
    tasks.push(
      fetchWaveAtPoint(lat, lng, {
        signal: controller.signal,
        forecastHoursOffset: envForecastHoursOffset,
      })
        .then((point) => ({
          kind: "waves",
          html: `<div class="centinela-coords-popup__wind">
            <div class="centinela-coords-popup__wind-title">Oleaje</div>
            <div>${formatWaveSummary(point)}</div>
          </div>`,
        }))
        .catch(() => ({
          kind: "waves",
          html: `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--error">No se pudo obtener oleaje</div>`,
        }))
    );
  }
  if (bathymetryLayerOn) {
    tasks.push(
      fetchBathymetryAtPoint(lat, lng, { signal: controller.signal })
        .then((point) => ({
          kind: "bathymetry",
          html: `<div class="centinela-coords-popup__wind">
            <div class="centinela-coords-popup__wind-title">Batimetría</div>
            <div>${formatDepthSummary(point?.depthM)}</div>
          </div>`,
        }))
        .catch(() => ({
          kind: "bathymetry",
          html: `<div class="centinela-coords-popup__wind centinela-coords-popup__wind--error">No se pudo obtener profundidad</div>`,
        }))
    );
  }

  Promise.all(tasks).then((parts) => {
    if (!popup.isOpen() || controller.signal.aborted) return;
    const order = { wind: 0, currents: 1, waves: 2, bathymetry: 3 };
    parts.sort((a, b) => order[a.kind] - order[b.kind]);
    popup.setContent(
      coordsPopupHtml(lat, lng, parts.map((p) => p.html).join(""))
    );
    requestAnimationFrame(() => bindCoordsPopupActions(popup, map, lat, lng));
  });

  return {
    abort() {
      controller.abort();
    },
  };
}

function isCoordsPopup(popup) {
  return popup?.options?.className === "centinela-coords-popup";
}

/**
 * Click en el mapa vacío → popup Leaflet anclado al punto
 * con lat/lon y, si hay capas, viento / corrientes / oleaje / batimetría.
 * No abre si el click fue sobre un elemento de capa (buque, evento, etc.).
 * Si el cartel ya está abierto, el click fuera solo lo cierra; hace falta
 * otro click para abrir uno nuevo.
 */
export function MapClickCoords({
  enabled = true,
  windLayerOn = false,
  currentsLayerOn = false,
  wavesLayerOn = false,
  bathymetryLayerOn = false,
  envForecastHoursOffset = 0,
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return undefined;

    let active = null;
    /** Leaflet cierra el popup en `preclick`; marcamos para no reabrir en `click`. */
    let skipNextOpen = false;

    function onPreClick(e) {
      if (leafletClickOnInteractive(e)) {
        skipNextOpen = false;
        return;
      }
      const popup = map._popup;
      if (popup?.isOpen?.() && isCoordsPopup(popup)) {
        skipNextOpen = true;
        active?.abort();
        active = null;
      }
    }

    function onClick(e) {
      if (leafletClickOnInteractive(e)) {
        skipNextOpen = false;
        return;
      }
      if (skipNextOpen) {
        skipNextOpen = false;
        return;
      }
      active?.abort();
      const { lat, lng } = e.latlng;
      active = openMapCoordsPopup(map, lat, lng, {
        windLayerOn,
        currentsLayerOn,
        wavesLayerOn,
        bathymetryLayerOn,
        envForecastHoursOffset,
      });
    }

    map.on("preclick", onPreClick);
    map.on("click", onClick);
    return () => {
      active?.abort();
      map.off("preclick", onPreClick);
      map.off("click", onClick);
    };
  }, [
    map,
    enabled,
    windLayerOn,
    currentsLayerOn,
    wavesLayerOn,
    bathymetryLayerOn,
    envForecastHoursOffset,
  ]);

  return null;
}
