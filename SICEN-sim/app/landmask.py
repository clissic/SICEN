"""Landmask simplificado para el MVP (Río de la Plata / costa uruguaya-argentina)."""

from __future__ import annotations

# Polígono grueso: tierra aproximada al norte/oeste del RDP (Montevideo–BA).
# No es cartografía oficial; solo evita que partículas “entren” en continente de forma burda.
# Formato [lon, lat] ring cerrado.
_LAND_POLYS: list[list[tuple[float, float]]] = [
    # Uruguay continental (muy simplificado)
    [
        (-58.5, -30.0),
        (-53.0, -30.0),
        (-53.0, -34.0),
        (-54.5, -34.95),
        (-56.2, -34.95),
        (-57.9, -34.4),
        (-58.5, -33.5),
        (-58.5, -30.0),
    ],
    # Argentina (BA / costa)
    [
        (-60.5, -33.0),
        (-58.3, -34.2),
        (-57.5, -35.5),
        (-57.0, -38.0),
        (-62.0, -38.0),
        (-62.0, -33.0),
        (-60.5, -33.0),
    ],
]


def _point_in_poly(lon: float, lat: float, poly: list[tuple[float, float]]) -> bool:
    # Ray casting
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > lat) != (yj > lat)) and (
            lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-15) + xi
        ):
            inside = not inside
        j = i
    return inside


def is_land(lat: float, lon: float) -> bool:
    for poly in _LAND_POLYS:
        if _point_in_poly(lon, lat, poly):
            return True
    return False
