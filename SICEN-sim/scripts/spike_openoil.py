#!/usr/bin/env python3
"""Spike OpenOil/Lagrangian: derrame de prueba en Río de la Plata con forzado constante."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.engine import run_lagrangian  # noqa: E402
from app.forcing import constant_forcing  # noqa: E402
from app.oils import get_oil  # noqa: E402


def main() -> int:
    lat, lon = -35.05, -55.85  # aproximado RDP
    start = datetime.now(timezone.utc)
    oil = get_oil("diesel")
    volume_m3 = 10.0
    horizon = 12
    forcing = constant_forcing(lat, lon, start, horizon)
    result = run_lagrangian(
        lat=lat,
        lon=lon,
        start=start,
        volume_m3=volume_m3,
        oil=oil,
        horizon_hours=horizon,
        release_duration_hours=0,
        num_particles=500,
        forcing=forcing,
    )
    budget = result["budget"]
    released = budget["released"]
    accounted = (
        budget["surface"]
        + budget["submerged"]
        + budget["stranded"]
        + budget["evaporated"]
        + budget["dispersed"]
    )
    print("=== SICEN-sim spike HC ===")
    print(f"engine: {result['meta']['engine']}")
    print(f"oil: {oil['label']}")
    print(f"budget: {json.dumps(budget, indent=2)}")
    print(f"mass check: accounted={accounted:.2f} released={released:.2f} "
          f"ratio={accounted / released if released else 0:.3f}")
    n_surf = len(result["timesteps"][-1]["features"]["features"])
    print(f"surface particles at end: {n_surf}")
    print(f"timesteps: {len(result['timesteps'])}")
    out = ROOT / "data" / "spike_result.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}")
    ok = released > 0 and 0.85 <= (accounted / released) <= 1.05 and n_surf > 0
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
