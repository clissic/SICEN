const OPENTOPO_GEBCO = "https://api.opentopodata.org/v1/gebco2020";

/** Clave de cache: 2 decimales (~1 km). */
export function bathymetryPointCacheKey(lat, lon) {
  return `bathy:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
}

/**
 * Elevación GEBCO vía OpenTopoData.
 * Negativo = bajo el nivel del mar → profundidad = -elevation.
 * @param {{ lat: number, lon: number }[]} points
 * @returns {Promise<{ lat: number, lon: number, elevationM: number|null, depthM: number|null }[]>}
 */
export async function fetchGebcoElevationPoints(points) {
  if (!points?.length) return [];

  const locations = points
    .map((p) => `${Number(p.lat)},${Number(p.lon)}`)
    .join("|");
  const url = `${OPENTOPO_GEBCO}?locations=${encodeURIComponent(locations)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const err = new Error(`OpenTopoData GEBCO respondió ${res.status}`);
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  if (data?.status && data.status !== "OK") {
    const err = new Error(data.error || "OpenTopoData GEBCO falló");
    err.status = 502;
    throw err;
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  return points.map((p, i) => {
    const elev = results[i]?.elevation;
    const elevationM =
      elev == null || Number.isNaN(Number(elev)) ? null : Number(elev);
    const depthM =
      elevationM != null && elevationM < 0 ? Math.abs(elevationM) : null;
    return {
      lat: p.lat,
      lon: p.lon,
      elevationM,
      depthM,
    };
  });
}
