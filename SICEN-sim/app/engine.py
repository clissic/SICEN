"""
Motor Lagrangian de derrame HC (compatible OpenOil / weathering NOAA-like).

Física MVP:
  Δx = u_corriente·Δt + α·u_viento·Δt + difusión
  evaporación ∝ viento^0.78 · fracción evaporable · T
  emulsificación ∝ viento²
  entrainment leve por Hs
  varado al cruzar landmask

Si SICEN_SIM_ENGINE=opendrift y OpenDrift está instalado, se delega a openoil_engine.
"""

from __future__ import annotations

import math
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np

from .forcing import ForcingGrid, constant_forcing, fetch_forcing, sample_field
from .landmask import is_land
from .oils import OilSpec, get_oil

METERS_PER_DEG_LAT = 111_320.0
WINDAGE = 0.03
DIFF_MS = 2.0  # m/s escala difusión horizontal


def _deg_lon_m(lat: float) -> float:
    return METERS_PER_DEG_LAT * math.cos(math.radians(lat))


def _budget_from_masses(
    mass_oil: np.ndarray,
    mass_evap: np.ndarray,
    mass_disp: np.ndarray,
    z: np.ndarray,
    stranded: np.ndarray,
    released: float,
) -> dict[str, float]:
    surface = float(np.sum(mass_oil[(z >= 0) & (~stranded)]))
    submerged = float(np.sum(mass_oil[(z < 0) & (~stranded)]))
    stranded_m = float(np.sum(mass_oil[stranded]))
    evaporated = float(np.sum(mass_evap))
    dispersed = float(np.sum(mass_disp))
    return {
        "surface": round(surface, 3),
        "submerged": round(submerged, 3),
        "stranded": round(stranded_m, 3),
        "evaporated": round(evaporated, 3),
        "dispersed": round(dispersed, 3),
        "released": round(released, 3),
    }


def _particles_geojson(
    lats: np.ndarray,
    lons: np.ndarray,
    mass: np.ndarray,
    z: np.ndarray,
    stranded: np.ndarray,
) -> dict[str, Any]:
    features = []
    for i in range(len(lats)):
        if stranded[i] or z[i] < 0 or mass[i] <= 0:
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lons[i]), float(lats[i])],
                },
                "properties": {
                    "massKg": round(float(mass[i]), 4),
                    "z": float(z[i]),
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def _contour_from_particles(
    lats: np.ndarray,
    lons: np.ndarray,
    mass: np.ndarray,
    z: np.ndarray,
    stranded: np.ndarray,
) -> dict[str, Any] | None:
    mask = (~stranded) & (z >= 0) & (mass > 0)
    if mask.sum() < 3:
        return None
    la = lats[mask]
    lo = lons[mask]
    # Convex hull simple vía extremos + percentil (caja orientada alopeada)
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
                "properties": {"kind": "slick_bbox", "n": int(mask.sum())},
            }
        ],
    }


def run_lagrangian(
    *,
    lat: float,
    lon: float,
    start: datetime,
    volume_m3: float,
    oil: OilSpec,
    horizon_hours: int,
    release_duration_hours: float,
    num_particles: int,
    forcing: ForcingGrid,
    windage: float = WINDAGE,
    dt_minutes: int = 15,
) -> dict[str, Any]:
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    n = int(max(50, min(5000, num_particles)))
    released_mass = float(volume_m3) * float(oil["density"])  # kg
    mass_oil = np.full(n, released_mass / n, dtype=float)
    mass_evap = np.zeros(n, dtype=float)
    mass_disp = np.zeros(n, dtype=float)
    water_frac = np.zeros(n, dtype=float)
    lats = np.full(n, lat, dtype=float)
    lons = np.full(n, lon, dtype=float)
    z = np.zeros(n, dtype=float)
    stranded = np.zeros(n, dtype=bool)
    rng = np.random.default_rng(42)

    # Dispersión inicial (spreading Fay-like: radio ~ f(V))
    init_r_m = max(30.0, min(800.0, 40.0 * (volume_m3 ** (1 / 3))))
    ang = rng.uniform(0, 2 * math.pi, n)
    rad = rng.uniform(0, init_r_m, n)
    lats = lats + (rad * np.cos(ang)) / METERS_PER_DEG_LAT
    lons = lons + (rad * np.sin(ang)) / np.maximum(
        _deg_lon_m(lat), 1.0
    )

    dt = dt_minutes * 60.0
    steps = int(math.ceil(horizon_hours * 3600 / dt))
    output_every = max(1, int(round(3600 / dt)))  # ~1 h
    timesteps: list[dict[str, Any]] = []
    contours: list[dict[str, Any]] = []

    evaporable = float(oil["evaporable_fraction"])
    emulsify_rate = float(oil["emulsify_rate"])

    for step in range(steps + 1):
        t = start + timedelta(seconds=step * dt)

        # Release continuo: partículas “dormidas” hasta su hora
        if release_duration_hours > 0:
            release_frac = min(1.0, (step * dt) / (release_duration_hours * 3600))
            active_n = max(1, int(n * release_frac))
            active = np.zeros(n, dtype=bool)
            active[:active_n] = True
        else:
            active = np.ones(n, dtype=bool)

        alive = active & (~stranded) & (mass_oil > 1e-6)

        if alive.any() and step > 0:
            for i in np.where(alive)[0]:
                la, lo = float(lats[i]), float(lons[i])
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
                hs = sample_field(
                    forcing.wave_hs, forcing.lats, forcing.lons, forcing.times, t, la, lo
                )
                sst = sample_field(
                    forcing.water_temp,
                    forcing.lats,
                    forcing.lons,
                    forcing.times,
                    t,
                    la,
                    lo,
                )
                wind_speed = math.hypot(wu, wv)

                # Advección
                ux = cu + windage * wu
                uy = cv + windage * wv
                # Difusión
                ux += rng.normal(0, DIFF_MS)
                uy += rng.normal(0, DIFF_MS)

                dlat = (uy * dt) / METERS_PER_DEG_LAT
                dlon = (ux * dt) / max(_deg_lon_m(la), 1.0)
                nlat = la + dlat
                nlon = lo + dlon

                if is_land(nlat, nlon):
                    stranded[i] = True
                    continue
                lats[i] = nlat
                lons[i] = nlon

                # Evaporación (NOAA-like: K ∝ U^0.78)
                if mass_oil[i] > 0 and evaporable > 0:
                    k = 0.0025 * (max(wind_speed, 0.1) ** 0.78)
                    if wind_speed >= 10:
                        k = 0.06 * 0.0025 * (wind_speed**2)
                    temp_f = max(0.5, min(1.5, (sst + 5) / 20))
                    # fracción del evaporable restante
                    remaining_evap = evaporable * released_mass / n - mass_evap[i]
                    remaining_evap = max(0.0, remaining_evap)
                    d_evap = min(
                        mass_oil[i] * 0.15,
                        remaining_evap * (1 - math.exp(-k * temp_f * dt / 3600)),
                    )
                    mass_oil[i] -= d_evap
                    mass_evap[i] += d_evap

                # Emulsificación
                if wind_speed > 1:
                    k_em = 6.0 * 2.024e-6 * (wind_speed**2) / 1e-5
                    water_frac[i] = min(
                        0.8 * emulsify_rate + 0.1,
                        water_frac[i] + k_em * dt * emulsify_rate,
                    )

                # Entrainment leve
                if hs > 0.6 and rng.random() < min(0.05, 0.01 * hs):
                    frac = min(0.08, 0.02 * hs)
                    d = mass_oil[i] * frac
                    mass_oil[i] -= d
                    mass_disp[i] += d
                    z[i] = -rng.uniform(0, 1.5 * hs)

                # Resurfacing
                if z[i] < 0 and rng.random() < 0.1:
                    z[i] = 0.0

        if step % output_every == 0 or step == steps:
            budget = _budget_from_masses(
                mass_oil, mass_evap, mass_disp, z, stranded, released_mass
            )
            features = _particles_geojson(lats, lons, mass_oil, z, stranded)
            timesteps.append({"t": t.isoformat(), "features": features, "budget": budget})
            contour = _contour_from_particles(lats, lons, mass_oil, z, stranded)
            if contour:
                contours.append({"t": t.isoformat(), "geojson": contour})

    final_budget = timesteps[-1]["budget"] if timesteps else _budget_from_masses(
        mass_oil, mass_evap, mass_disp, z, stranded, released_mass
    )

    return {
        "timesteps": timesteps,
        "contours": contours,
        "budget": final_budget,
        "meta": {
            "oilType": oil["id"],
            "oilLabel": oil["label"],
            "horizonHours": horizon_hours,
            "windage": windage,
            "numParticles": n,
            "volumeM3": volume_m3,
            "engine": "lagrangian-noaa-like",
            "startTime": start.isoformat(),
            "releaseLat": lat,
            "releaseLon": lon,
        },
    }


async def run_simulation(payload: dict[str, Any]) -> dict[str, Any]:
    lat = float(payload["lat"])
    lon = float(payload["lon"])
    volume_m3 = float(payload["volumeM3"])
    oil = get_oil(payload.get("oilTypeId") or "diesel")
    horizon = int(payload.get("horizonHours") or 12)
    horizon = 6 if horizon not in (6, 12, 24, 48) else horizon
    if horizon == 48:
        horizon = 24  # MVP tope 24
    release_h = float(payload.get("releaseDurationHours") or 0)
    num = int(payload.get("numParticles") or 2000)
    start_raw = payload.get("startTime")
    if start_raw:
        start = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00"))
    else:
        start = datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)

    use_constant = bool(payload.get("constantForcing"))
    engine = (os.environ.get("SICEN_SIM_ENGINE") or "auto").lower()

    if engine == "opendrift" or (
        engine == "auto" and _opendrift_available() and not use_constant
    ):
        try:
            from .openoil_engine import run_opendrift_simulation

            return await run_opendrift_simulation(payload, oil=oil)
        except Exception as e:
            payload = {**payload, "_opendriftError": str(e)}
    # engine == lagrangian | auto sin OpenDrift | constantForcing spike

    if use_constant:
        forcing = constant_forcing(lat, lon, start, horizon)
    else:
        forcing = await fetch_forcing(lat, lon, start, horizon)

    result = run_lagrangian(
        lat=lat,
        lon=lon,
        start=start,
        volume_m3=volume_m3,
        oil=oil,
        horizon_hours=horizon,
        release_duration_hours=release_h,
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
