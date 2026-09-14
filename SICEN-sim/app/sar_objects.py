"""Catálogo curado de objetos SAR (labels ES → coeficientes Leeway USCG)."""

from __future__ import annotations

from typing import TypedDict


class SarObjectSpec(TypedDict):
    id: str
    label: str
    category: str  # person | craft
    # Coeficientes Allen / OBJECTPROP (slope %, offset cm/s, std cm/s)
    dw_slope: float
    dw_offset: float
    dw_std: float
    cwr_slope: float
    cwr_offset: float
    cwr_std: float
    cwl_slope: float
    cwl_offset: float
    cwl_std: float
    # Índice OpenDrift OBJECTPROP.DAT (1-based) si aplica
    opendrift_object_type: int
    # Si True, Fase 2: empieza sumergido hasta ADD
    starts_submerged: bool
    description: str


SAR_CATALOG: dict[str, SarObjectSpec] = {
    "piw_unknown": {
        "id": "piw_unknown",
        "label": "Persona en agua (estado desconocido)",
        "category": "person",
        "dw_slope": 0.96,
        "dw_offset": 0.0,
        "dw_std": 12.0,
        "cwr_slope": 0.54,
        "cwr_offset": 0.0,
        "cwr_std": 9.4,
        "cwl_slope": -0.54,
        "cwl_offset": 0.0,
        "cwl_std": 9.4,
        "opendrift_object_type": 1,
        "starts_submerged": False,
        "description": "PIW valores medios (OBJECTPROP PIW-1).",
    },
    "piw_pfd": {
        "id": "piw_pfd",
        "label": "Persona con chaleco (consciente)",
        "category": "person",
        "dw_slope": 0.48,
        "dw_offset": 0.0,
        "dw_std": 8.3,
        "cwr_slope": 0.15,
        "cwr_offset": 0.0,
        "cwr_std": 6.7,
        "cwl_slope": -0.15,
        "cwl_offset": 0.0,
        "cwl_std": 6.7,
        "opendrift_object_type": 2,
        "starts_submerged": False,
        "description": "PIW vertical con PFD tipo III.",
    },
    "piw_deceased_surface": {
        "id": "piw_deceased_surface",
        "label": "Persona fallecida (flotando)",
        "category": "person",
        "dw_slope": 1.117,
        "dw_offset": 10.2,
        "dw_std": 3.04,
        "cwr_slope": 0.04,
        "cwr_offset": 3.9,
        "cwr_std": 4.05,
        "cwl_slope": -0.04,
        "cwl_offset": -3.9,
        "cwl_std": 4.05,
        "opendrift_object_type": 6,
        "starts_submerged": False,
        "description": "PIW deceased face down.",
    },
    "piw_deceased_submerged": {
        "id": "piw_deceased_submerged",
        "label": "Persona fallecida (hundida → reaparece)",
        "category": "person",
        "dw_slope": 1.117,
        "dw_offset": 10.2,
        "dw_std": 3.04,
        "cwr_slope": 0.04,
        "cwr_offset": 3.9,
        "cwr_std": 4.05,
        "cwl_slope": -0.04,
        "cwl_offset": -3.9,
        "cwl_std": 4.05,
        "opendrift_object_type": 6,
        "starts_submerged": True,
        "description": "Empieza sumergida; flota al alcanzar ADD (~100 °C·día).",
    },
    "kayak": {
        "id": "kayak",
        "label": "Kayak / embarcación chica",
        "category": "craft",
        "dw_slope": 2.9,
        "dw_offset": 0.0,
        "dw_std": 8.0,
        "cwr_slope": 1.1,
        "cwr_offset": 0.0,
        "cwr_std": 7.0,
        "cwl_slope": -1.1,
        "cwl_offset": 0.0,
        "cwl_std": 7.0,
        "opendrift_object_type": 48,
        "starts_submerged": False,
        "description": "Alto leeway relativo (mucho efecto del viento).",
    },
    "liferaft": {
        "id": "liferaft",
        "label": "Balsa salvavidas (valores medios)",
        "category": "craft",
        "dw_slope": 3.2,
        "dw_offset": 0.0,
        "dw_std": 6.0,
        "cwr_slope": 1.6,
        "cwr_offset": 0.0,
        "cwr_std": 5.5,
        "cwl_slope": -1.6,
        "cwl_offset": 0.0,
        "cwl_std": 5.5,
        "opendrift_object_type": 26,
        "starts_submerged": False,
        "description": "Life-raft sin drogue (media).",
    },
    "small_boat": {
        "id": "small_boat",
        "label": "Bote / lancha",
        "category": "craft",
        "dw_slope": 2.2,
        "dw_offset": 0.0,
        "dw_std": 7.0,
        "cwr_slope": 0.9,
        "cwr_offset": 0.0,
        "cwr_std": 6.0,
        "cwl_slope": -0.9,
        "cwl_offset": 0.0,
        "cwl_std": 6.0,
        "opendrift_object_type": 52,
        "starts_submerged": False,
        "description": "Embarcación menor abierta.",
    },
    "fishing_vessel": {
        "id": "fishing_vessel",
        "label": "Buque pesquero / mayor",
        "category": "craft",
        "dw_slope": 1.4,
        "dw_offset": 0.0,
        "dw_std": 5.0,
        "cwr_slope": 0.4,
        "cwr_offset": 0.0,
        "cwr_std": 4.0,
        "cwl_slope": -0.4,
        "cwl_offset": 0.0,
        "cwl_std": 4.0,
        "opendrift_object_type": 63,
        "starts_submerged": False,
        "description": "Menor leeway relativo; más ligado a la corriente.",
    },
}


def get_sar_object(object_type_id: str) -> SarObjectSpec:
    key = str(object_type_id or "").strip().lower()
    if key not in SAR_CATALOG:
        raise ValueError(
            f"Tipo de objeto SAR desconocido: {object_type_id}. "
            f"Válidos: {', '.join(SAR_CATALOG)}"
        )
    return SAR_CATALOG[key]


def list_sar_objects() -> list[dict]:
    """Lista pública para UI (sin coeficientes internos)."""
    out = []
    for o in SAR_CATALOG.values():
        out.append(
            {
                "id": o["id"],
                "label": o["label"],
                "category": o["category"],
                "startsSubmerged": o["starts_submerged"],
                "description": o["description"],
            }
        )
    return out
