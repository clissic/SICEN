from __future__ import annotations

from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .engine import run_simulation
from .leeway_engine import run_sar_simulation
from .oils import list_oils
from .sar_objects import list_sar_objects
from .gfw_fetch import is_gfw_configured, run_gfw_fetch_job
from .gfw_scheduler import start_gfw_scheduler

app = FastAPI(
    title="SICEN-sim",
    description="Worker de simulación HC (OpenOil), deriva SAR (Leeway) y datos GFW.",
    version="0.3.0",
)

# Iniciar scheduler GFW en background
@app.on_event("startup")
def startup_event():
    """Inicia servicios en background al arrancar."""
    start_gfw_scheduler()


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
    return {
        "ok": True,
        "service": "sicen-sim",
        "features": ["hc", "sar", "gfw"],
        "gfw": {
            "configured": is_gfw_configured(),
        },
    }


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


@app.get("/gfw/status")
def gfw_status() -> dict[str, Any]:
    """Estado de la integración GFW."""
    return {
        "ok": True,
        "configured": is_gfw_configured(),
    }


@app.post("/gfw/fetch")
def gfw_fetch() -> dict[str, Any]:
    """
    Ejecuta el job de fetch GFW manualmente.
    En producción, esto se ejecuta periódicamente via scheduler.
    """
    if not is_gfw_configured():
        raise HTTPException(
            status_code=503,
            detail="GFW_API_TOKEN no configurado",
        )
    
    result = run_gfw_fetch_job()
    
    if not result.get("ok"):
        raise HTTPException(
            status_code=500,
            detail=result.get("msg", "Error en fetch GFW"),
        )
    
    return result
