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

export const CENTINELA_ADD_MARKER_EVENT = "centinela:add-marker";
export const CENTINELA_ADD_ZONE_EVENT = "centinela:add-zone";

function coordsPopupActionsHtml(lat, lng) {
  return `<div class="centinela-coords-popup__actions">
    <button type="button" class="btn btn-sm btn-primary centinela-coords-popup__add-marker" data-lat="${lat}" data-lng="${lng}">
      Agregar marcador
    </button>
    <button type="button" class="btn btn-sm btn-outline-primary centinela-coords-popup__add-zone" data-lat="${lat}" data-lng="${lng}">
      Crear zona
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

/**
 * Click en el mapa (sin buque) → popup Leaflet anclado al punto
 * con lat/lon y, si hay capas, viento / corrientes / oleaje / batimetría.
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

    function onClick(e) {
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

    map.on("click", onClick);
    return () => {
      active?.abort();
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
