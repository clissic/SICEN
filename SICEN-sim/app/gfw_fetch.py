"""
Cliente Global Fishing Watch y job programado de sincronización.
Obtiene eventos de pesca, encuentros y gaps AIS en el área configurada (Uruguay EEZ / Río de la Plata)
y los almacena en MongoDB para consulta por el backend Node.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from gfwanalysis.api import GFWApi
from pymongo import MongoClient, GEOSPHERE
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError

# Área de interés: Uruguay EEZ / Río de la Plata (latMin, lonMin, latMax, lonMax)
DEFAULT_BBOX = "-38.5,-61.0,-30.5,-50.5"

# Tipos de eventos GFW a obtener
EVENT_TYPES = {
    "fishing": "public-global-fishing-events:latest",
    "encounter": "public-global-encounters-events:latest",
    "gap": "public-global-gaps-events:latest",
}


def get_gfw_token() -> Optional[str]:
    """Lee el token de GFW desde variable de entorno."""
    return os.getenv("GFW_API_TOKEN", "").strip() or None


def is_gfw_configured() -> bool:
    """Verifica si GFW está configurado."""
    return get_gfw_token() is not None


def get_mongodb_uri() -> str:
    """Construye URI de MongoDB desde variables de entorno."""
    password = os.getenv("MONGODB_PASSWORD", "")
    if not password:
        raise ValueError("MONGODB_PASSWORD no configurado")
    
    return (
        f"mongodb+srv://claudiopaiva:{password}@clissic.1snkz.mongodb.net/"
        "?retryWrites=true&w=majority"
    )


def get_bbox() -> tuple[float, float, float, float]:
    """Lee bbox desde env o usa default Uruguay EEZ."""
    raw = os.getenv("GFW_BBOX", DEFAULT_BBOX).strip()
    parts = [float(x.strip()) for x in raw.split(",")]
    if len(parts) != 4:
        parts = [float(x.strip()) for x in DEFAULT_BBOX.split(",")]
    return tuple(parts)


def get_lookback_days() -> int:
    """Días hacia atrás para obtener eventos."""
    raw = os.getenv("GFW_LOOKBACK_DAYS", "14")
    return max(1, min(int(raw), 90))


def bbox_to_geojson_polygon(bbox: tuple[float, float, float, float]) -> dict[str, Any]:
    """Convierte bbox a polígono GeoJSON."""
    lat_min, lon_min, lat_max, lon_max = bbox
    return {
        "type": "Polygon",
        "coordinates": [
            [
                [lon_min, lat_min],
                [lon_max, lat_min],
                [lon_max, lat_max],
                [lon_min, lat_max],
                [lon_min, lat_min],
            ]
        ],
    }


def normalize_vessel(vessel_data: Optional[dict]) -> Optional[dict]:
    """Normaliza datos de un buque."""
    if not vessel_data:
        return None
    return {
        "id": vessel_data.get("id"),
        "name": vessel_data.get("name"),
        "mmsi": str(vessel_data.get("ssvid")) if vessel_data.get("ssvid") else None,
        "flag": vessel_data.get("flag"),
        "type": vessel_data.get("type"),
    }


def normalize_event(raw: dict, event_type: str) -> Optional[dict]:
    """Normaliza un evento GFW a formato SICEN."""
    if not raw:
        return None
    
    pos = raw.get("position", {})
    lat = pos.get("lat")
    lon = pos.get("lon")
    
    if lat is None or lon is None:
        return None
    
    vessel = normalize_vessel(raw.get("vessel"))
    encounter_vessel = None
    
    if event_type == "encounter":
        encounter_data = raw.get("encounter", {})
        encounter_vessel = normalize_vessel(
            encounter_data.get("vessel") or encounter_data.get("counterpart")
        )
    
    event_id = raw.get("id") or f"{event_type}:{lat},{lon}:{raw.get('start')}"
    
    return {
        "eventId": str(event_id),
        "eventType": event_type,
        "startTime": raw.get("start"),
        "endTime": raw.get("end"),
        "location": {
            "type": "Point",
            "coordinates": [float(lon), float(lat)],
        },
        "lat": float(lat),
        "lon": float(lon),
        "vessel": vessel,
        "secondVessel": encounter_vessel,
        "encounterType": raw.get("encounter", {}).get("type") if event_type == "encounter" else None,
        "distances": raw.get("distances"),
        "regions": raw.get("regions"),
        "source": "gfw",
        "fetchedAt": datetime.now(timezone.utc),
    }


def fetch_gfw_events(
    api: GFWApi,
    event_type: str,
    dataset: str,
    start_date: str,
    end_date: str,
    geometry: dict,
    limit: int = 200,
) -> list[dict]:
    """Obtiene eventos de un tipo específico desde GFW."""
    try:
        response = api.get_events(
            datasets=[dataset],
            start_date=start_date,
            end_date=end_date,
            geometry=geometry,
            limit=limit,
        )
        
        entries = response.get("entries", [])
        normalized = []
        
        for raw in entries:
            event = normalize_event(raw, event_type)
            if event:
                normalized.append(event)
        
        return normalized
    
    except Exception as e:
        print(f"Error fetching {event_type} events: {e}")
        return []


def store_events(collection: Collection, events: list[dict]) -> tuple[int, int]:
    """
    Almacena eventos en MongoDB. Retorna (insertados, duplicados).
    """
    if not events:
        return 0, 0
    
    inserted = 0
    duplicates = 0
    
    for event in events:
        try:
            collection.insert_one(event)
            inserted += 1
        except DuplicateKeyError:
            duplicates += 1
    
    return inserted, duplicates


def setup_collection(db) -> Collection:
    """Crea colección con índices."""
    collection = db["gfwEvents"]
    
    # Índice único por eventId
    collection.create_index("eventId", unique=True)
    
    # Índice geoespacial
    collection.create_index([("location", GEOSPHERE)])
    
    # Índice por tipo y tiempo
    collection.create_index([("eventType", 1), ("startTime", -1)])
    
    # Índice por tiempo de fetch (para limpieza)
    collection.create_index("fetchedAt")
    
    return collection


def run_gfw_fetch_job() -> dict[str, Any]:
    """
    Job principal: obtiene eventos GFW y los almacena en MongoDB.
    Retorna resultado del job con estadísticas.
    """
    if not is_gfw_configured():
        return {
            "ok": False,
            "msg": "GFW_API_TOKEN no configurado",
        }
    
    try:
        token = get_gfw_token()
        api = GFWApi(token=token)
        
        # MongoDB
        mongo_uri = get_mongodb_uri()
        client = MongoClient(mongo_uri)
        db = client["sicen"]
        collection = setup_collection(db)
        
        # Parámetros
        bbox = get_bbox()
        geometry = bbox_to_geojson_polygon(bbox)
        lookback_days = get_lookback_days()
        
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=lookback_days)
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        print(f"GFW fetch job: {start_str} to {end_str}, bbox={bbox}")
        
        stats = {
            "startDate": start_str,
            "endDate": end_str,
            "bbox": bbox,
            "types": {},
        }
        
        total_inserted = 0
        total_duplicates = 0
        
        # Fetch cada tipo de evento
        for event_type, dataset in EVENT_TYPES.items():
            events = fetch_gfw_events(
                api=api,
                event_type=event_type,
                dataset=dataset,
                start_date=start_str,
                end_date=end_str,
                geometry=geometry,
                limit=200,
            )
            
            inserted, duplicates = store_events(collection, events)
            total_inserted += inserted
            total_duplicates += duplicates
            
            stats["types"][event_type] = {
                "fetched": len(events),
                "inserted": inserted,
                "duplicates": duplicates,
            }
            
            print(f"  {event_type}: {len(events)} fetched, {inserted} inserted, {duplicates} duplicates")
        
        # Limpiar eventos antiguos (más de 90 días)
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        delete_result = collection.delete_many({"fetchedAt": {"$lt": cutoff}})
        
        stats.update({
            "totalInserted": total_inserted,
            "totalDuplicates": total_duplicates,
            "deletedOld": delete_result.deleted_count,
        })
        
        client.close()
        
        return {
            "ok": True,
            "msg": f"GFW fetch completado: {total_inserted} nuevos eventos",
            "stats": stats,
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
        }
    
    except Exception as e:
        return {
            "ok": False,
            "msg": f"Error en GFW fetch job: {str(e)}",
            "error": str(e),
        }
