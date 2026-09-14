from __future__ import annotations

from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .engine import run_simulation
from .leeway_engine import run_sar_simulation
from .oils import list_oils
from .sar_objects import list_sar_objects

app = FastAPI(
    title="SICEN-sim",
    description="Worker de simulación HC (OpenOil) y deriva SAR (Leeway).",
    version="0.2.0",
)


class RunRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    volumeM3: float = Field(..., gt=0, le=50_000)
    oilTypeId: str = "diesel"
    startTime: Optional[str] = None
    horizonHours: int = 12
    releaseDurationHours: float = 0
    numParticles: int = 2000
    constantForcing: bool = False


class SarRunRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    objectTypeId: str = "piw_unknown"
    startTime: Optional[str] = None
    horizonHours: int = 12
    uncertaintyRadiusM: float = Field(500, ge=0, le=50_000)
    numParticles: int = Field(2000, ge=50, le=5000)
    constantForcing: bool = False


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "sicen-sim", "features": ["hc", "sar"]}


@app.get("/oils")
def oils() -> dict[str, Any]:
    return {"ok": True, "oils": list_oils()}


@app.get("/sar-objects")
def sar_objects() -> dict[str, Any]:
    return {"ok": True, "objects": list_sar_objects()}


@app.post("/run")
async def run(body: RunRequest) -> dict[str, Any]:
    try:
        result = await run_simulation(body.model_dump())
        return {"ok": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulación fallida: {e}") from e


@app.post("/run-sar")
async def run_sar(body: SarRunRequest) -> dict[str, Any]:
    try:
        result = await run_sar_simulation(body.model_dump())
        return {"ok": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulación SAR fallida: {e}") from e
