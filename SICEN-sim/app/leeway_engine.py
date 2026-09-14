"""
Motor Lagrangian Leeway (USCG Allen-like) para deriva SAR.

u = corriente + leeway_downwind + leeway_crosswind
Leeway (m/s) = (slope%/100)*U10 + offset_cm/s / 100  (+ ruido std)
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np

from .forcing import ForcingGrid, constant_forcing, fetch_forcing, sample_field
from .landmask import is_land
from .sar_objects import SarObjectSpec, get_sar_object

METERS_PER_DEG_LAT = 111_320.0
# ADD umbral default (°C·día) para resurfacing
DEFAULT_ADD_THRESHOLD = 100.0
ADD_THRESHOLD_MIN = 80.0
ADD_THRESHOLD_MAX = 140.0
JIBE_PROB_PER_HOUR = 0.04


def _deg_lon_m(lat: float) -> float:
    return METERS_PER_DEG_LAT * math.cos(math.radians(lat))


def _leeway_ms(slope_pct: float, offset_cm_s: float, wind_ms: float, eps_cm_s: float) -> float:
    return (slope_pct / 100.0) * wind_ms + (offset_cm_s + eps_cm_s) / 100.0


def _contour_from_particles(lats: np.ndarray, lons: np.ndarray, alive: np.ndarray) -> dict | None:
    mask = alive & np.isfinite(lats) & np.isfinite(lons)
    if mask.sum() < 3:
        return None
    la = lats[mask]
    lo = lons[mask]
    lat_min, lat_max = float(np.percentile(la, 5)), float(np.percentile(la, 95))
    lon_min, lon_max = float(np.percentile(lo, 5)), float(np.percentile(lo, 95))
    ring = [
        [lon_min, lat_min],
        [lon_max, lat_min],
        [lon_max, lat_max],
        [lon_min, lat_max],
        [lon_min, lat_min],
    ]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [ring]},
                "properties": {"kind": "search_bbox", "n": int(mask.sum())},
            }
        ],
    }


def _particles_geojson(lats: np.ndarray, lons: np.ndarray, alive: np.ndarray) -> dict:
    features = []
    for i in range(len(lats)):
        if not alive[i]:
            continue
        if not (math.isfinite(float(lats[i])) and math.isfinite(float(lons[i]))):
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lons[i]), float(lats[i])],
                },
                "properties": {"i": int(i)},
            }
        )
    return {"type": "FeatureCollection", "features": features}


def run_leeway_lagrangian(
    *,
    lat: float,
    lon: float,
    start: datetime,
    obj: SarObjectSpec,
    horizon_hours: int,
    uncertainty_radius_m: float,
    num_particles: int,
    forcing: ForcingGrid,
    dt_minutes: int = 15,
    add_threshold: float = DEFAULT_ADD_THRESHOLD,
) -> dict[str, Any]:
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    n = int(max(50, min(5000, num_particles)))
    rng = np.random.default_rng(42)

    # Seed en disco de incertidumbre
    r0 = max(0.0, float(uncertainty_radius_m))
    ang = rng.uniform(0, 2 * math.pi, n)
    rad = rng.uniform(0, r0, n) if r0 > 0 else np.zeros(n)
    lats = np.full(n, lat, dtype=float) + (rad * np.cos(ang)) / METERS_PER_DEG_LAT
    lons = np.full(n, lon, dtype=float) + (rad * np.sin(ang)) / max(_deg_lon_m(lat), 1.0)

    # Coefs con ruido por partícula (std en cm/s)
    dw_eps = rng.normal(0, obj["dw_std"], n)
    cwr_eps = rng.normal(0, obj["cwr_std"], n)
    cwl_eps = rng.normal(0, obj["cwl_std"], n)
    # Evitar pendiente downwind negativa
    for i in range(n):
        while obj["dw_slope"] + dw_eps[i] / 20.0 < 0:
            dw_eps[i] = rng.normal(0, obj["dw_std"])

    # Lado de crosswind (+1 right / -1 left) + jibing
    side = rng.choice(np.array([1, -1]), size=n)

    starts_sub = bool(obj["starts_submerged"])
    # Umbral ADD por partícula (Monte Carlo en banda)
    if starts_sub:
        add_thr = rng.uniform(ADD_THRESHOLD_MIN, ADD_THRESHOLD_MAX, n)
        add_thr = add_thr * 0.5 + float(add_threshold) * 0.5
    else:
        add_thr = np.zeros(n)

    add_accum = np.zeros(n, dtype=float)  # °C·día
    floated = np.ones(n, dtype=bool) if not starts_sub else np.zeros(n, dtype=bool)
    stranded = np.zeros(n, dtype=bool)

    dt = dt_minutes * 60.0
    steps = int(math.ceil(horizon_hours * 3600 / dt))
    output_every = max(1, int(round(3600 / dt)))
    timesteps: list[dict[str, Any]] = []
    contours: list[dict[str, Any]] = []
    first_float_hours: list[float] = []

    for step in range(steps + 1):
        t = start + timedelta(seconds=step * dt)
        hours_elapsed = step * dt / 3600.0

        for i in range(n):
            if stranded[i]:
                continue
            la, lo = float(lats[i]), float(lons[i])
            sst = sample_field(
                forcing.water_temp, forcing.lats, forcing.lons, forcing.times, t, la, lo
            )
            if not math.isfinite(sst):
                sst = 15.0

            if starts_sub and not floated[i]:
                # Acumular ADD (°C · fracción de día)
                add_accum[i] += max(0.0, sst) * (dt / 86400.0)
                if add_accum[i] >= add_thr[i]:
                    floated[i] = True
                    first_float_hours.append(hours_elapsed)
                else:
                    continue

            wu = sample_field(
                forcing.wind_u, forcing.lats, forcing.lons, forcing.times, t, la, lo
            )
            wv = sample_field(
                forcing.wind_v, forcing.lats, forcing.lons, forcing.times, t, la, lo
            )
            cu = sample_field(
                forcing.curr_u, forcing.lats, forcing.lons, forcing.times, t, la, lo
            )
            cv = sample_field(
                forcing.curr_v, forcing.lats, forcing.lons, forcing.times, t, la, lo
            )
            wind_speed = math.hypot(wu, wv)
            # Dirección downwind = dirección del viento (hacia)
            if wind_speed > 0.05:
                ux_w = wu / wind_speed
                uy_w = wv / wind_speed
            else:
                ux_w, uy_w = 1.0, 0.0

            # Jibing
            if rng.random() < (JIBE_PROB_PER_HOUR * dt / 3600.0):
                side[i] *= -1

            dw = _leeway_ms(obj["dw_slope"], obj["dw_offset"], wind_speed, float(dw_eps[i]))
            if side[i] > 0:
                cw = _leeway_ms(
                    obj["cwr_slope"], obj["cwr_offset"], wind_speed, float(cwr_eps[i])
                )
            else:
                cw = _leeway_ms(
                    obj["cwl_slope"], obj["cwl_offset"], wind_speed, float(cwl_eps[i])
                )

            # Crosswind perpendicular a downwind (rotado 90°)
            # downwind unit (ux_w, uy_w); right = (uy_w, -ux_w)
            rx, ry = uy_w, -ux_w
            if side[i] < 0:
                rx, ry = -rx, -ry

            ux = cu + dw * ux_w + abs(cw) * rx
            uy = cv + dw * uy_w + abs(cw) * ry

            nlat = la + (uy * dt) / METERS_PER_DEG_LAT
            nlon = lo + (ux * dt) / max(_deg_lon_m(la), 1.0)
            if is_land(nlat, nlon):
                stranded[i] = True
                continue
            lats[i] = nlat
            lons[i] = nlon

        if step % output_every == 0 or step == steps:
            alive = floated & (~stranded)
            features = _particles_geojson(lats, lons, alive)
            mean_add = float(np.mean(add_accum)) if starts_sub else 0.0
            n_floated = int(floated.sum())
            timesteps.append(
                {
                    "t": t.isoformat(),
                    "features": features,
                    "phase": "surface" if (not starts_sub or n_floated == n) else (
                        "submerged" if n_floated == 0 else "mixed"
                    ),
                    "addMean": round(mean_add, 2),
                    "floatedCount": n_floated,
                    "particleCount": int(alive.sum()),
                }
            )
            contour = _contour_from_particles(lats, lons, alive)
            if contour:
                contours.append({"t": t.isoformat(), "geojson": contour})

    float_state = "surface"
    if starts_sub:
        if floated.all():
            float_state = "surfaced"
        elif floated.any():
            float_state = "mixed"
        else:
            float_state = "submerged"

    return {
        "timesteps": timesteps,
        "contours": contours,
        "meta": {
            "objectTypeId": obj["id"],
            "objectLabel": obj["label"],
            "horizonHours": horizon_hours,
            "numParticles": n,
            "engine": "leeway-lagrangian",
            "startTime": start.isoformat(),
            "releaseLat": lat,
            "releaseLon": lon,
            "uncertaintyRadiusM": uncertainty_radius_m,
            "floatState": float_state,
            "startsSubmerged": starts_sub,
            "addThresholdCDay": add_threshold if starts_sub else None,
            "addMeanFinal": round(float(np.mean(add_accum)), 2) if starts_sub else None,
            "firstFloatHoursMedian": (
                round(float(np.median(first_float_hours)), 2)
                if first_float_hours
                else None
            ),
        },
    }


async def run_sar_simulation(payload: dict[str, Any]) -> dict[str, Any]:
    lat = float(payload["lat"])
    lon = float(payload["lon"])
    obj = get_sar_object(payload.get("objectTypeId") or "piw_unknown")
    horizon = int(payload.get("horizonHours") or 12)
    if horizon not in (6, 12, 24, 48):
        horizon = 12
    unc = float(payload.get("uncertaintyRadiusM") or 500)
    unc = max(0.0, min(50_000.0, unc))
    num = int(payload.get("numParticles") or 2000)
    start_raw = payload.get("startTime")
    if start_raw:
        start = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00"))
    else:
        start = datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)

    use_constant = bool(payload.get("constantForcing"))
    engine = (__import__("os").environ.get("SICEN_SIM_ENGINE") or "auto").lower()

    if engine == "opendrift" or (
        engine == "auto"
        and _opendrift_available()
        and not use_constant
        and not obj["starts_submerged"]
    ):
        try:
            from .leeway_opendrift import run_opendrift_leeway

            return await run_opendrift_leeway(payload, obj=obj)
        except Exception as e:
            payload = {**payload, "_opendriftError": str(e)}

    if use_constant:
        forcing = constant_forcing(lat, lon, start, horizon)
    else:
        forcing = await fetch_forcing(lat, lon, start, horizon)

    # Para ADD hace falta horizonte potencialmente largo; usamos el pedido
    result = run_leeway_lagrangian(
        lat=lat,
        lon=lon,
        start=start,
        obj=obj,
        horizon_hours=horizon,
        uncertainty_radius_m=unc,
        num_particles=num,
        forcing=forcing,
    )
    if payload.get("_opendriftError"):
        result["meta"]["opendriftFallback"] = payload["_opendriftError"]
    return result


def _opendrift_available() -> bool:
    try:
        import opendrift  # noqa: F401

        return True
    except Exception:
        return False
