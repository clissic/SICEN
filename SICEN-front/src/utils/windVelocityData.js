const KN_TO_MS = 0.514444;

/** Margen extra alrededor del viewport para que las partículas cubran toda la pantalla. */
const BOUNDS_PAD_RATIO = 0.28;

function padBounds(bounds, ratio = BOUNDS_PAD_RATIO) {
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const latSpan = north - south;
  const lonSpan = east - west;
  return {
    south: south - latSpan * ratio,
    north: north + latSpan * ratio,
    west: west - lonSpan * ratio,
    east: east + lonSpan * ratio,
  };
}

/** Grilla densa para partículas (máx. 64 puntos = límite del proxy). */
export function velocityGridForBounds(bounds, zoom) {
  let cols = zoom <= 9 ? 6 : zoom <= 11 ? 7 : 8;
  let rows = cols;
  while (cols * rows > 64) {
    cols -= 1;
    rows = cols;
  }

  const { south, north, west, east } = padBounds(bounds);
  const points = [];

  for (let j = 0; j < rows; j += 1) {
    const lat =
      rows > 1
        ? north - (j * (north - south)) / (rows - 1)
        : (north + south) / 2;
    for (let c = 0; c < cols; c += 1) {
      const lon =
        cols > 1 ? west + (c * (east - west)) / (cols - 1) : (west + east) / 2;
      points.push({ lat, lon });
    }
  }

  return { points, cols, rows, south, north, west, east };
}

function knToMs(kn) {
  return kn * KN_TO_MS;
}

/** Viento meteorológico (desde directionDeg) → componentes u/v en m/s. */
export function uvFromWind(speedKn, directionFromDeg) {
  if (speedKn == null || directionFromDeg == null || Number.isNaN(speedKn)) {
    return [0, 0];
  }
  const speedMs = knToMs(speedKn);
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
 * Convierte puntos de viento (orden norte→sur, oeste→este) a JSON leaflet-velocity.
 * @param {object[]} windPoints — misma longitud y orden que `grid.points`
 */
export function windPointsToVelocityData(windPoints, grid) {
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
      const pt = windPoints[idx] ?? {};
      if (!refTime && pt.time) refTime = pt.time;
      const [u, v] = uvFromWind(pt.speedKn, pt.directionDeg);
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
        parameterNumberName: "eastward_wind",
      },
      data: uFlat,
    },
    {
      header: {
        ...headerBase,
        parameterNumber: 3,
        parameterNumberName: "northward_wind",
      },
      data: vFlat,
    },
  ];
}

export const WIND_VELOCITY_COLOR_LIGHT = [
  "rgb(37, 99, 235)",
  "rgb(56, 189, 248)",
  "rgb(125, 211, 252)",
  "rgb(251, 191, 36)",
  "rgb(248, 113, 113)",
  "rgb(220, 38, 38)",
];

export const WIND_VELOCITY_COLOR_DARK = [
  "rgb(56, 189, 248)",
  "rgb(125, 211, 252)",
  "rgb(186, 230, 253)",
  "rgb(251, 191, 36)",
  "rgb(248, 113, 113)",
  "rgb(252, 165, 165)",
];

export function velocityLayerOptions(isDark) {
  return {
    displayValues: false,
    minVelocity: 0,
    maxVelocity: 14,
    velocityScale: 0.012,
    opacity: isDark ? 0.92 : 0.88,
    particleMultiplier: 1 / 880,
    lineWidth: 1.15,
    particleAge: 80,
    frameRate: 18,
    colorScale: isDark ? WIND_VELOCITY_COLOR_DARK : WIND_VELOCITY_COLOR_LIGHT,
    paneName: "centinelaWindPane",
  };
}
