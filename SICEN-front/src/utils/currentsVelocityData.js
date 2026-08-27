import { velocityGridForBounds } from "./windVelocityData.js";

export { velocityGridForBounds };

const KN_TO_MS = 0.514444;

function knToMs(kn) {
  return kn * KN_TO_MS;
}

/**
 * Corriente (hacia directionDeg) → u/v en m/s.
 * Convención Open-Meteo: 0° = hacia el norte, 90° = hacia el este.
 */
export function uvFromCurrent(speedKn, directionTowardsDeg) {
  if (
    speedKn == null ||
    directionTowardsDeg == null ||
    Number.isNaN(speedKn) ||
    Number.isNaN(directionTowardsDeg)
  ) {
    return [null, null];
  }
  const speedMs = knToMs(speedKn);
  const rad = (directionTowardsDeg * Math.PI) / 180;
  return [speedMs * Math.sin(rad), speedMs * Math.cos(rad)];
}

function formatRefTime(iso) {
  if (!iso) {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }
  return String(iso).replace("T", " ").slice(0, 19);
}

/**
 * Puntos de corriente → JSON leaflet-velocity (orden norte→sur, oeste→este).
 */
export function currentPointsToVelocityData(currentPoints, grid) {
  const { cols, rows, south, north, west, east } = grid;
  const nx = cols;
  const ny = rows;
  const dx = nx > 1 ? (east - west) / (nx - 1) : 0.01;
  const dy = ny > 1 ? (north - south) / (ny - 1) : 0.01;

  const uFlat = [];
  const vFlat = [];
  let refTime = "";

  for (let j = 0; j < ny; j += 1) {
    for (let c = 0; c < nx; c += 1) {
      const idx = j * nx + c;
      const pt = currentPoints[idx] ?? {};
      if (!refTime && pt.time) refTime = pt.time;
      const [u, v] = uvFromCurrent(pt.speedKn, pt.directionDeg);
      uFlat.push(u);
      vFlat.push(v);
    }
  }

  const headerBase = {
    parameterCategory: 2,
    parameterUnit: "m.s-1",
    la1: north,
    la2: south,
    lo1: west,
    lo2: east,
    dx,
    dy,
    nx,
    ny,
    refTime: formatRefTime(refTime),
  };

  return [
    {
      header: {
        ...headerBase,
        parameterNumber: 2,
        parameterNumberName: "eastward_current",
      },
      data: uFlat,
    },
    {
      header: {
        ...headerBase,
        parameterNumber: 3,
        parameterNumberName: "northward_current",
      },
      data: vFlat,
    },
  ];
}

/** Paleta light: teal/violeta más saturados para contrastar sobre CARTO claro. */
export const CURRENT_VELOCITY_COLOR_LIGHT = [
  "rgb(15, 118, 110)",
  "rgb(13, 148, 136)",
  "rgb(5, 150, 105)",
  "rgb(124, 58, 237)",
  "rgb(109, 40, 217)",
  "rgb(91, 33, 182)",
];

export const CURRENT_VELOCITY_COLOR_DARK = [
  "rgb(45, 212, 191)",
  "rgb(94, 234, 212)",
  "rgb(110, 231, 183)",
  "rgb(196, 181, 253)",
  "rgb(167, 139, 250)",
  "rgb(192, 132, 252)",
];

export function currentVelocityLayerOptions(isDark) {
  return {
    displayValues: false,
    minVelocity: 0,
    maxVelocity: 1.2,
    velocityScale: 0.045,
    opacity: isDark ? 0.9 : 0.95,
    particleMultiplier: 1 / 880,
    lineWidth: isDark ? 1.2 : 1.45,
    particleAge: 90,
    frameRate: 18,
    colorScale: isDark
      ? CURRENT_VELOCITY_COLOR_DARK
      : CURRENT_VELOCITY_COLOR_LIGHT,
    paneName: "centinelaCurrentsPane",
  };
}
