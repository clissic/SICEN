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

function formatCoord(value, kind) {
  const abs = Math.abs(value);
  const hemi =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "O";
  return `${abs.toFixed(5)}° ${hemi}`;
}

function coordsPopupHtml(lat, lng, extraBlock = "") {
  return `<div class="centinela-coords-popup__body">
    <div class="centinela-coords-popup__title">Coordenadas</div>
    <div><span class="centinela-coords-popup__label">Lat</span> ${formatCoord(lat, "lat")}</div>
    <div><span class="centinela-coords-popup__label">Lon</span> ${formatCoord(lng, "lng")}</div>
    <div class="centinela-coords-popup__decimal">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
    ${extraBlock}
  </div>`;
}

/**
 * Click en el mapa → lat/lon; con capas activas agrega viento / corrientes / oleaje / batimetría.
 */
export function MapClickCoords({
  windLayerOn = false,
  windForecastHoursOffset = 0,
  currentsLayerOn = false,
  currentsForecastHoursOffset = 0,
  wavesLayerOn = false,
  wavesForecastHoursOffset = 0,
  bathymetryLayerOn = false,
}) {
  const map = useMap();

  useEffect(() => {
    let activeController = null;

    function onClick(e) {
      activeController?.abort();
      const { lat, lng } = e.latlng;
      const popup = L.popup({
        className: "centinela-coords-popup",
        closeButton: true,
        autoPan: true,
      })
        .setLatLng(e.latlng)
        .setContent(coordsPopupHtml(lat, lng))
        .openOn(map);

      if (
        !windLayerOn &&
        !currentsLayerOn &&
        !wavesLayerOn &&
        !bathymetryLayerOn
      ) {
        return;
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

      const controller = new AbortController();
      activeController = controller;

      const tasks = [];
      if (windLayerOn) {
        tasks.push(
          fetchWindAtPoint(lat, lng, {
            signal: controller.signal,
            forecastHoursOffset: windForecastHoursOffset,
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
            forecastHoursOffset: currentsForecastHoursOffset,
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
            forecastHoursOffset: wavesForecastHoursOffset,
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
      });
    }

    map.on("click", onClick);
    return () => {
      activeController?.abort();
      map.off("click", onClick);
    };
  }, [
    map,
    windLayerOn,
    windForecastHoursOffset,
    currentsLayerOn,
    currentsForecastHoursOffset,
    wavesLayerOn,
    wavesForecastHoursOffset,
    bathymetryLayerOn,
  ]);

  return null;
}
