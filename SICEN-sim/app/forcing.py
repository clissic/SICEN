"""Forzado ambiental Open-Meteo (viento + corrientes + olas) en grilla horaria."""

from __future__ import annotations

import hashlib
import json
import math
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
import numpy as np

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

CACHE_TTL_S = int(os.environ.get("SICEN_SIM_CACHE_TTL_S", str(6 * 3600)))
CACHE_DIR = Path(os.environ.get("SICEN_SIM_CACHE_DIR", "data/cache"))


@dataclass
class ForcingGrid:
    """Campos horarios sobre una grilla lat/lon."""

    lats: np.ndarray  # (ny,)
    lons: np.ndarray  # (nx,)
    times: list[datetime]  # (nt,)
    # m/s, dirección meteorológica “desde” convertida a componentes u,v (hacia)
    wind_u: np.ndarray  # (nt, ny, nx)
    wind_v: np.ndarray
    # m/s, dirección “hacia”
    curr_u: np.ndarray
    curr_v: np.ndarray
    wave_hs: np.ndarray  # m
    water_temp: np.ndarray  # °C (fallback 15 si falta)


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{key}.json"


def _load_cache(key: str) -> dict[str, Any] | None:
    path = _cache_path(key)
    if not path.exists():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - float(raw.get("saved_at", 0)) > CACHE_TTL_S:
            return None
        return raw.get("payload")
    except Exception:
        return None


def _save_cache(key: str, payload: dict[str, Any]) -> None:
    path = _cache_path(key)
    path.write_text(
        json.dumps({"saved_at": time.time(), "payload": payload}, ensure_ascii=False),
        encoding="utf-8",
    )


def kn_to_ms(kn: float) -> float:
    return float(kn) * 0.514444


def deg_from_to_uv(speed_ms: float, direction_from_deg: float) -> tuple[float, float]:
    """Viento meteorológico (dirección desde) → componentes u (este), v (norte)."""
    rad = math.radians(direction_from_deg)
    # Vector hacia = opuesto a “desde”
    u = -speed_ms * math.sin(rad)
    v = -speed_ms * math.cos(rad)
    return u, v


def deg_towards_to_uv(speed_ms: float, direction_towards_deg: float) -> tuple[float, float]:
    rad = math.radians(direction_towards_deg)
    u = speed_ms * math.sin(rad)
    v = speed_ms * math.cos(rad)
    return u, v


def bbox_from_point(lat: float, lon: float, half_deg: float = 0.35) -> tuple[float, float, float, float]:
    return lat - half_deg, lon - half_deg, lat + half_deg, lon + half_deg


def build_grid(
    lat_min: float,
    lon_min: float,
    lat_max: float,
    lon_max: float,
    step_deg: float = 0.15,
) -> tuple[np.ndarray, np.ndarray]:
    lats = np.arange(lat_min, lat_max + 1e-9, step_deg)
    lons = np.arange(lon_min, lon_max + 1e-9, step_deg)
    if lats.size < 2:
        lats = np.array([lat_min, lat_max], dtype=float)
    if lons.size < 2:
        lons = np.array([lon_min, lon_max], dtype=float)
    return lats, lons


async def _fetch_point_series(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
    hours: int,
) -> dict[str, Any]:
    forecast_days = max(1, min(16, int(math.ceil(hours / 24)) + 1))
    wind_params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wind_speed_10m,wind_direction_10m",
        "wind_speed_unit": "ms",
        "forecast_days": forecast_days,
        "timezone": "UTC",
    }
    marine_params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "ocean_current_velocity,ocean_current_direction,wave_height,sea_surface_temperature",
        "wind_speed_unit": "ms",
        "forecast_days": min(8, forecast_days),
        "timezone": "UTC",
    }
    wind_r, marine_r = await client.get(FORECAST_URL, params=wind_params), await client.get(
        MARINE_URL, params=marine_params
    )
    wind_r.raise_for_status()
    marine_r.raise_for_status()
    return {"wind": wind_r.json(), "marine": marine_r.json()}


def _parse_hourly(block: dict[str, Any], key: str) -> list[float | None]:
    hourly = block.get("hourly") or {}
    vals = hourly.get(key) or []
    out: list[float | None] = []
    for v in vals:
        if v is None:
            out.append(None)
        else:
            try:
                out.append(float(v))
            except (TypeError, ValueError):
                out.append(None)
    return out


def _parse_times(block: dict[str, Any]) -> list[datetime]:
    hourly = block.get("hourly") or {}
    times = hourly.get("time") or []
    out: list[datetime] = []
    for t in times:
        # Open-Meteo: 2026-09-13T18:00
        dt = datetime.fromisoformat(str(t))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        out.append(dt.astimezone(timezone.utc))
    return out


async def fetch_forcing(
    lat: float,
    lon: float,
    start: datetime,
    horizon_hours: int,
    half_deg: float = 0.35,
    step_deg: float = 0.18,
) -> ForcingGrid:
    """Descarga (o cachea) forzado horario alrededor del punto."""
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    start = start.astimezone(timezone.utc)
    hours = int(max(1, min(48, horizon_hours)))
    lat_min, lon_min, lat_max, lon_max = bbox_from_point(lat, lon, half_deg)
    lats, lons = build_grid(lat_min, lon_min, lat_max, lon_max, step_deg)

    key_src = f"{lat:.3f},{lon:.3f}|{start.isoformat()}|{hours}|{half_deg}|{step_deg}"
    key = hashlib.sha1(key_src.encode("utf-8")).hexdigest()[:24]
    cached = _load_cache(key)
    if cached:
        return _grid_from_payload(cached)

    ny, nx = len(lats), len(lons)
    points: list[tuple[int, int, float, float]] = []
    for iy, la in enumerate(lats):
        for ix, lo in enumerate(lons):
            points.append((iy, ix, float(la), float(lo)))

    # Limitar peticiones: submuestrear a máx ~16 puntos y interpolar luego
    max_pts = 16
    if len(points) > max_pts:
        stride = max(1, int(math.ceil(math.sqrt(len(points) / max_pts))))
        sampled = [
            (iy, ix, la, lo)
            for iy, ix, la, lo in points
            if iy % stride == 0 and ix % stride == 0
        ]
        if not sampled:
            sampled = points[:max_pts]
        points = sampled[:max_pts]

    async with httpx.AsyncClient(timeout=60.0) as client:
        series_map: dict[tuple[int, int], dict[str, Any]] = {}
        for iy, ix, la, lo in points:
            series_map[(iy, ix)] = await _fetch_point_series(client, la, lo, hours)

    # Usar tiempos del primer punto
    first = next(iter(series_map.values()))
    times_all = _parse_times(first["wind"])
    if not times_all:
        raise RuntimeError("Open-Meteo no devolvió serie horaria de viento.")

    # Recortar a start .. start+horizon
    end = start + timedelta(hours=hours)
    idx = [i for i, t in enumerate(times_all) if start - timedelta(hours=1) <= t <= end + timedelta(hours=1)]
    if not idx:
        idx = list(range(min(hours + 1, len(times_all))))
    times = [times_all[i] for i in idx]
    nt = len(times)

    wind_u = np.zeros((nt, ny, nx), dtype=float)
    wind_v = np.zeros((nt, ny, nx), dtype=float)
    curr_u = np.zeros((nt, ny, nx), dtype=float)
    curr_v = np.zeros((nt, ny, nx), dtype=float)
    wave_hs = np.zeros((nt, ny, nx), dtype=float)
    water_temp = np.full((nt, ny, nx), 15.0, dtype=float)

    for (iy, ix), data in series_map.items():
        w_spd = _parse_hourly(data["wind"], "wind_speed_10m")
        w_dir = _parse_hourly(data["wind"], "wind_direction_10m")
        c_spd = _parse_hourly(data["marine"], "ocean_current_velocity")
        c_dir = _parse_hourly(data["marine"], "ocean_current_direction")
        hs = _parse_hourly(data["marine"], "wave_height")
        sst = _parse_hourly(data["marine"], "sea_surface_temperature")
        for ti, src_i in enumerate(idx):
            spd = w_spd[src_i] if src_i < len(w_spd) else None
            d = w_dir[src_i] if src_i < len(w_dir) else None
            if spd is not None and d is not None:
                u, v = deg_from_to_uv(spd, d)
                wind_u[ti, iy, ix] = u
                wind_v[ti, iy, ix] = v
            cspd = c_spd[src_i] if src_i < len(c_spd) else None
            cd = c_dir[src_i] if src_i < len(c_dir) else None
            if cspd is not None and cd is not None:
                # Open-Meteo marine: velocity en kn si wind_speed_unit=ms? Docs dicen kn con kn unit.
                # Pedimos ms; si viniera en kn (> ~5 típ. océano) convertir. SMOC suele < 2 m/s.
                speed_ms = cspd if cspd < 5 else kn_to_ms(cspd)
                u, v = deg_towards_to_uv(speed_ms, cd)
                curr_u[ti, iy, ix] = u
                curr_v[ti, iy, ix] = v
            if src_i < len(hs) and hs[src_i] is not None:
                wave_hs[ti, iy, ix] = float(hs[src_i])
            if src_i < len(sst) and sst[src_i] is not None:
                water_temp[ti, iy, ix] = float(sst[src_i])

    # Rellenar celdas no muestreadas con el valor del punto más cercano muestreado
    known = list(series_map.keys())
    if known:
        for iy in range(ny):
            for ix in range(nx):
                if (iy, ix) in series_map:
                    continue
                jy, jx = min(
                    known,
                    key=lambda p: (p[0] - iy) ** 2 + (p[1] - ix) ** 2,
                )
                wind_u[:, iy, ix] = wind_u[:, jy, jx]
                wind_v[:, iy, ix] = wind_v[:, jy, jx]
                curr_u[:, iy, ix] = curr_u[:, jy, jx]
                curr_v[:, iy, ix] = curr_v[:, jy, jx]
                wave_hs[:, iy, ix] = wave_hs[:, jy, jx]
                water_temp[:, iy, ix] = water_temp[:, jy, jx]

    grid = ForcingGrid(
        lats=lats,
        lons=lons,
        times=times,
        wind_u=wind_u,
        wind_v=wind_v,
        curr_u=curr_u,
        curr_v=curr_v,
        wave_hs=wave_hs,
        water_temp=water_temp,
    )
    _save_cache(key, _grid_to_payload(grid))
    return grid


def _grid_to_payload(g: ForcingGrid) -> dict[str, Any]:
    return {
        "lats": g.lats.tolist(),
        "lons": g.lons.tolist(),
        "times": [t.isoformat() for t in g.times],
        "wind_u": g.wind_u.tolist(),
        "wind_v": g.wind_v.tolist(),
        "curr_u": g.curr_u.tolist(),
        "curr_v": g.curr_v.tolist(),
        "wave_hs": g.wave_hs.tolist(),
        "water_temp": g.water_temp.tolist(),
    }


def _grid_from_payload(p: dict[str, Any]) -> ForcingGrid:
    times = []
    for t in p["times"]:
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        times.append(dt)
    return ForcingGrid(
        lats=np.array(p["lats"], dtype=float),
        lons=np.array(p["lons"], dtype=float),
        times=times,
        wind_u=np.array(p["wind_u"], dtype=float),
        wind_v=np.array(p["wind_v"], dtype=float),
        curr_u=np.array(p["curr_u"], dtype=float),
        curr_v=np.array(p["curr_v"], dtype=float),
        wave_hs=np.array(p["wave_hs"], dtype=float),
        water_temp=np.array(p["water_temp"], dtype=float),
    )


def sample_field(
    field: np.ndarray,
    lats: np.ndarray,
    lons: np.ndarray,
    times: list[datetime],
    t: datetime,
    lat: float,
    lon: float,
) -> float:
    """Interpolación bilineal + temporal más cercana."""
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    # índice temporal más cercano
    ti = min(range(len(times)), key=lambda i: abs((times[i] - t).total_seconds()))
    # índices lat/lon
    iy = int(np.clip(np.searchsorted(lats, lat) - 1, 0, len(lats) - 1))
    ix = int(np.clip(np.searchsorted(lons, lon) - 1, 0, len(lons) - 1))
    iy2 = min(iy + 1, len(lats) - 1)
    ix2 = min(ix + 1, len(lons) - 1)
    # bilineal simple
    v00 = float(field[ti, iy, ix])
    v01 = float(field[ti, iy, ix2])
    v10 = float(field[ti, iy2, ix])
    v11 = float(field[ti, iy2, ix2])
    if lons[ix2] == lons[ix]:
        fx = 0.0
    else:
        fx = (lon - lons[ix]) / (lons[ix2] - lons[ix])
    if lats[iy2] == lats[iy]:
        fy = 0.0
    else:
        fy = (lat - lats[iy]) / (lats[iy2] - lats[iy])
    fx = float(np.clip(fx, 0, 1))
    fy = float(np.clip(fy, 0, 1))
    return (
        v00 * (1 - fx) * (1 - fy)
        + v01 * fx * (1 - fy)
        + v10 * (1 - fx) * fy
        + v11 * fx * fy
    )


def constant_forcing(
    lat: float,
    lon: float,
    start: datetime,
    horizon_hours: int,
    wind_ms: float = 5.0,
    wind_from_deg: float = 90.0,
    curr_ms: float = 0.3,
    curr_towards_deg: float = 45.0,
) -> ForcingGrid:
    """Forzado constante (spike / offline)."""
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    times = [start + timedelta(hours=h) for h in range(horizon_hours + 1)]
    lats = np.array([lat - 0.2, lat, lat + 0.2])
    lons = np.array([lon - 0.2, lon, lon + 0.2])
    nt, ny, nx = len(times), len(lats), len(lons)
    wu, wv = deg_from_to_uv(wind_ms, wind_from_deg)
    cu, cv = deg_towards_to_uv(curr_ms, curr_towards_deg)
    return ForcingGrid(
        lats=lats,
        lons=lons,
        times=times,
        wind_u=np.full((nt, ny, nx), wu),
        wind_v=np.full((nt, ny, nx), wv),
        curr_u=np.full((nt, ny, nx), cu),
        curr_v=np.full((nt, ny, nx), cv),
        wave_hs=np.full((nt, ny, nx), 0.8),
        water_temp=np.full((nt, ny, nx), 16.0),
    )
