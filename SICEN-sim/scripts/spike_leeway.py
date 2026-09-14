#!/usr/bin/env python3
"""Spike Leeway Lagrangian: deriva SAR de prueba con forzado constante."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.forcing import constant_forcing  # noqa: E402
from app.leeway_engine import run_leeway_lagrangian  # noqa: E402
from app.sar_objects import get_sar_object  # noqa: E402


def main() -> int:
    lat, lon = -35.05, -55.85
    start = datetime.now(timezone.utc)
    obj = get_sar_object("kayak")
    horizon = 12
    forcing = constant_forcing(lat, lon, start, horizon)
    result = run_leeway_lagrangian(
        lat=lat,
        lon=lon,
        start=start,
        obj=obj,
        horizon_hours=horizon,
        uncertainty_radius_m=500,
        num_particles=500,
        forcing=forcing,
    )
    n_steps = len(result["timesteps"])
    n_end = result["timesteps"][-1]["particleCount"] if n_steps else 0
    print("=== SICEN-sim spike SAR ===")
    print(f"engine: {result['meta']['engine']}")
    print(f"object: {obj['label']}")
    print(f"timesteps: {n_steps}")
    print(f"particles at end: {n_end}")
    print(f"floatState: {result['meta']['floatState']}")
    out = ROOT / "data" / "spike_sar_result.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}")
    ok = n_steps >= 2 and n_end > 0 and result["meta"].get("engine")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
