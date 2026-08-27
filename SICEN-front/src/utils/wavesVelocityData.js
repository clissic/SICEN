import { velocityGridForBounds } from "./windVelocityData.js";

export { velocityGridForBounds };

/**
 * Oleaje: dirección “desde” + magnitud = Hs (m) para el color.
 * La velocidad visual se afina con velocityScale ∝ período medio del viewport
 * (leaflet-velocity no permite color∝Hs y velocidad∝T por celda a la vez).
 */
export function uvFromWaveHeight(heightM, directionFromDeg) {
  if (
    heightM == null ||
    directionFromDeg == null ||
    Number.isNaN(Number(heightM)) ||
    Number.isNaN(Number(directionFromDeg))
  ) {
    return [null, null];
  }
  const speedMs = Math.max(0, Number(heightM));
  const rad = (directionFromDeg * Math.PI) / 180;
  return [-speedMs * Math.sin(rad), -speedMs * Math.cos(rad)];
}

function formatRefTime(iso) {
  if (!iso) {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }
  return String(iso).replace("T", " ").slice(0, 19);
}

/**
 * Puntos de oleaje → JSON leaflet-velocity (orden norte→sur, oeste→este).
 * Magnitud = Hs (m).
 */
export function wavePointsToVelocityData(wavePoints, grid) {
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
      const pt = wavePoints[idx] ?? {};
      if (!refTime && pt.time) refTime = pt.time;
      const [u, v] = uvFromWaveHeight(pt.heightM, pt.directionDeg);
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
        parameterNumberName: "eastward_wave",
      },
      data: uFlat,
    },
    {
      header: {
        ...headerBase,
        parameterNumber: 3,
        parameterNumberName: "northward_wave",
      },
      data: vFlat,
    },
  ];
}

/** Paleta altura Hs: sky → ámbar → naranja → rojo. */
export const WAVE_VELOCITY_COLOR_LIGHT = [
  "rgb(14, 165, 233)",
  "rgb(56, 189, 248)",
  "rgb(245, 158, 11)",
  "rgb(249, 115, 22)",
  "rgb(239, 68, 68)",
  "rgb(220, 38, 38)",
];

export const WAVE_VELOCITY_COLOR_DARK = [
  "rgb(56, 189, 248)",
  "rgb(125, 211, 252)",
  "rgb(251, 191, 36)",
  "rgb(251, 146, 60)",
  "rgb(248, 113, 113)",
  "rgb(252, 165, 165)",
];

const PERIOD_REF_S = 8;
const BASE_VELOCITY_SCALE = 0.025;

/** Escala visual: a mayor período medio del viewport, partículas más rápidas. */
export function waveVelocityScaleForPeriods(wavePoints) {
  let sum = 0;
  let n = 0;
  for (const pt of wavePoints ?? []) {
    if (pt?.periodS == null || Number.isNaN(pt.periodS)) continue;
    sum += pt.periodS;
    n += 1;
  }
  const avg = n > 0 ? sum / n : PERIOD_REF_S;
  return BASE_VELOCITY_SCALE * (avg / PERIOD_REF_S);
}

/** maxVelocity 4 m → color alineado a bandas de Hs. */
export function waveVelocityLayerOptions(isDark, velocityScale = BASE_VELOCITY_SCALE) {
  return {
    displayValues: false,
    minVelocity: 0,
    maxVelocity: 4,
    velocityScale,
    opacity: isDark ? 0.9 : 0.92,
    particleMultiplier: 1 / 880,
    lineWidth: isDark ? 1.2 : 1.4,
    particleAge: 95,
    frameRate: 18,
    colorScale: isDark
      ? WAVE_VELOCITY_COLOR_DARK
      : WAVE_VELOCITY_COLOR_LIGHT,
    paneName: "centinelaWavesPane",
  };
}
