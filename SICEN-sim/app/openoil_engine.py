"""Wrapper opcional OpenDrift/OpenOil (requiere deps en Docker Linux)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .oils import OilSpec


async def run_opendrift_simulation(payload: dict[str, Any], oil: OilSpec) -> dict[str, Any]:
    """
    Intenta OpenOil con forzado constante fallback (readers reales se
    conectan cuando hay NetCDF). Si falla la importación, el caller usa Lagrangian.
    """
    from datetime import timedelta

    from opendrift.models.openoil import OpenOil
    from opendrift.readers import reader_constant

    lat = float(payload["lat"])
    lon = float(payload["lon"])
    volume_m3 = float(payload["volumeM3"])
    horizon = int(payload.get("horizonHours") or 12)
    start_raw = payload.get("startTime")
    if start_raw:
        start = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00"))
    else:
        start = datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)

    o = OpenOil(loglevel=30, weathering_model="noaa")
    o.set_config("processes:dispersion", True)
    o.set_config("processes:evaporation", True)
    o.set_config("processes:emulsification", True)
    o.set_config("drift:vertical_mixing", True)

    # Forzado constante de respaldo (m/s)
    reader_wind = reader_constant.Reader(
        {
            "x_wind": 5.0,
            "y_wind": 0.0,
        }
    )
    reader_current = reader_constant.Reader(
        {
            "x_sea_water_velocity": 0.2,
            "y_sea_water_velocity": 0.1,
        }
    )
    o.add_reader([reader_current, reader_wind])

    n = int(min(2000, max(100, int(payload.get("numParticles") or 500))))
    # seed
    try:
        o.seed_elements(
            lon=lon,
            lat=lat,
            time=start,
            number=n,
            oiltype=oil.get("adios_name"),
            mass_oil=(volume_m3 * oil["density"]) / n,
        )
    except Exception:
        o.seed_elements(
            lon=lon,
            lat=lat,
            time=start,
            number=n,
            oil_type=oil.get("adios_name"),
        )

    o.run(duration=timedelta(hours=horizon), time_step=900, time_step_output=3600)

    # Extraer trayectorias a GeoJSON por output time
    timesteps = []
    contours = []
    try:
        budget = o.get_oil_budget()
        final_budget = {
            "surface": float(budget.get("mass_oil", [0])[-1]) if "mass_oil" in budget else 0,
            "evaporated": float(budget.get("mass_evaporated", [0])[-1])
            if "mass_evaporated" in budget
            else 0,
            "submerged": 0.0,
            "stranded": float(budget.get("mass_stranded", [0])[-1])
            if "mass_stranded" in budget
            else 0,
            "dispersed": float(budget.get("mass_dispersed", [0])[-1])
            if "mass_dispersed" in budget
            else 0,
            "released": float(volume_m3 * oil["density"]),
        }
    except Exception:
        final_budget = {
            "surface": 0,
            "evaporated": 0,
            "submerged": 0,
            "stranded": 0,
            "dispersed": 0,
            "released": float(volume_m3 * oil["density"]),
        }

    lons = o.history["lon"]
    lats = o.history["lat"]
    times = o.get_time_array()[0]
    for ti, t in enumerate(times):
        feats = []
        for pi in range(lons.shape[0]):
            lo = float(lons[pi, ti])
            la = float(lats[pi, ti])
            if not (math_isfinite(lo) and math_isfinite(la)):
                continue
            feats.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lo, la]},
                    "properties": {"massKg": None},
                }
            )
        ts = t.isoformat() if hasattr(t, "isoformat") else str(t)
        timesteps.append(
            {
                "t": ts,
                "features": {"type": "FeatureCollection", "features": feats},
                "budget": final_budget,
            }
        )

    return {
        "timesteps": timesteps,
        "contours": contours,
        "budget": final_budget,
        "meta": {
            "oilType": oil["id"],
            "oilLabel": oil["label"],
            "horizonHours": horizon,
            "windage": 0.03,
            "numParticles": n,
            "volumeM3": volume_m3,
            "engine": "opendrift-openoil",
            "startTime": start.isoformat(),
            "releaseLat": lat,
            "releaseLon": lon,
        },
    }


def math_isfinite(x: float) -> bool:
    import math

    return math.isfinite(x)
