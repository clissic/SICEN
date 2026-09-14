"""Wrapper opcional OpenDrift Leeway (requiere deps en Docker Linux)."""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

from .sar_objects import SarObjectSpec


def _isfinite(x: float) -> bool:
    return math.isfinite(x)


async def run_opendrift_leeway(payload: dict[str, Any], obj: SarObjectSpec) -> dict[str, Any]:
    from opendrift.models.leeway import Leeway
    from opendrift.readers import reader_constant

    lat = float(payload["lat"])
    lon = float(payload["lon"])
    horizon = int(payload.get("horizonHours") or 12)
    unc = float(payload.get("uncertaintyRadiusM") or 500)
    n = int(min(3000, max(100, int(payload.get("numParticles") or 1000))))
    start_raw = payload.get("startTime")
    if start_raw:
        start = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00"))
    else:
        start = datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)

    o = Leeway(loglevel=30)
    reader_wind = reader_constant.Reader({"x_wind": 5.0, "y_wind": 1.0})
    reader_current = reader_constant.Reader(
        {"x_sea_water_velocity": 0.15, "y_sea_water_velocity": 0.05}
    )
    o.add_reader([reader_current, reader_wind])

    object_type = int(obj.get("opendrift_object_type") or 1)
    o.seed_elements(
        lon=lon,
        lat=lat,
        radius=max(0.0, unc),
        number=n,
        time=start,
        object_type=object_type,
    )
    o.run(duration=timedelta(hours=horizon), time_step=900, time_step_output=3600)

    timesteps = []
    contours = []
    lons = o.history["lon"]
    lats = o.history["lat"]
    times = o.get_time_array()[0]
    for ti, t in enumerate(times):
        feats = []
        las = []
        los = []
        for pi in range(lons.shape[0]):
            lo = float(lons[pi, ti])
            la = float(lats[pi, ti])
            if not (_isfinite(lo) and _isfinite(la)):
                continue
            feats.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lo, la]},
                    "properties": {"i": int(pi)},
                }
            )
            las.append(la)
            los.append(lo)
        t_iso = t.isoformat() if hasattr(t, "isoformat") else str(t)
        timesteps.append(
            {
                "t": t_iso,
                "features": {"type": "FeatureCollection", "features": feats},
                "phase": "surface",
                "particleCount": len(feats),
            }
        )
        if len(las) >= 3:
            import numpy as np

            la_a = np.array(las)
            lo_a = np.array(los)
            lat_min, lat_max = float(np.percentile(la_a, 5)), float(np.percentile(la_a, 95))
            lon_min, lon_max = float(np.percentile(lo_a, 5)), float(np.percentile(lo_a, 95))
            ring = [
                [lon_min, lat_min],
                [lon_max, lat_min],
                [lon_max, lat_max],
                [lon_min, lat_max],
                [lon_min, lat_min],
            ]
            contours.append(
                {
                    "t": t_iso,
                    "geojson": {
                        "type": "FeatureCollection",
                        "features": [
                            {
                                "type": "Feature",
                                "geometry": {"type": "Polygon", "coordinates": [ring]},
                                "properties": {"kind": "search_bbox", "n": len(las)},
                            }
                        ],
                    },
                }
            )

    return {
        "timesteps": timesteps,
        "contours": contours,
        "meta": {
            "objectTypeId": obj["id"],
            "objectLabel": obj["label"],
            "horizonHours": horizon,
            "numParticles": n,
            "engine": "opendrift-leeway",
            "startTime": start.isoformat(),
            "releaseLat": lat,
            "releaseLon": lon,
            "uncertaintyRadiusM": unc,
            "floatState": "surface",
            "startsSubmerged": False,
            "opendriftObjectType": object_type,
        },
    }
