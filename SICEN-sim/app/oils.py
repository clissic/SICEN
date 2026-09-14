"""Catálogo curado de hidrocarburos para el MVP (labels ES → parámetros físicos)."""

from __future__ import annotations

from typing import TypedDict


class OilSpec(TypedDict):
    id: str
    label: str
    # Densidad kg/m3 aprox. a 15 °C
    density: float
    # Viscosidad cinemática m2/s (orden de magnitud)
    viscosity: float
    # Fracción evaporable (0–1) en ~24 h condiciones moderadas
    evaporable_fraction: float
    # Tendencia a emulsificar (0–1)
    emulsify_rate: float
    # API gravity aproximada (referencia)
    api: float
    # Nombre ADIOS / OilLibrary si el motor OpenDrift está activo
    adios_name: str


OIL_CATALOG: dict[str, OilSpec] = {
    "diesel": {
        "id": "diesel",
        "label": "Diesel / gasoil",
        "density": 840.0,
        "viscosity": 3.0e-6,
        "evaporable_fraction": 0.75,
        "emulsify_rate": 0.15,
        "api": 35.0,
        "adios_name": "DIESEL FUEL OIL (SOUTH LOUISIANA CRUDE)",
    },
    "ifo180": {
        "id": "ifo180",
        "label": "Fuel oil intermedio (IFO 180)",
        "density": 960.0,
        "viscosity": 1.8e-4,
        "evaporable_fraction": 0.25,
        "emulsify_rate": 0.55,
        "api": 15.0,
        "adios_name": "INTERMEDIATE FUEL OIL 180",
    },
    "crude_light": {
        "id": "crude_light",
        "label": "Crudo genérico liviano",
        "density": 850.0,
        "viscosity": 8.0e-6,
        "evaporable_fraction": 0.45,
        "emulsify_rate": 0.35,
        "api": 35.0,
        "adios_name": "GENERIC LIGHT CRUDE",
    },
    "crude_heavy": {
        "id": "crude_heavy",
        "label": "Crudo genérico pesado",
        "density": 940.0,
        "viscosity": 5.0e-4,
        "evaporable_fraction": 0.18,
        "emulsify_rate": 0.65,
        "api": 18.0,
        "adios_name": "GENERIC HEAVY CRUDE",
    },
}


def get_oil(oil_type_id: str) -> OilSpec:
    key = str(oil_type_id or "").strip().lower()
    if key not in OIL_CATALOG:
        raise ValueError(
            f"Tipo de HC desconocido: {oil_type_id}. "
            f"Válidos: {', '.join(OIL_CATALOG)}"
        )
    return OIL_CATALOG[key]


def list_oils() -> list[OilSpec]:
    return list(OIL_CATALOG.values())
