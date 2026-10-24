"""
SICEN AIS Ingest Service - Decodificador NMEA AIVDM con pyais

Escucha NMEA AIVDM por UDP/TCP, decodifica mensajes AIS (tipos 1-3, 18/19
para posiciones y 5/24 para datos estáticos), y persiste en MongoDB.
"""
import asyncio
import logging
import os
import socket
from datetime import datetime, timezone
from typing import Dict, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from pyais import decode
from pyais.stream import TCPStream, UDPStream

logger = logging.getLogger(__name__)


class AisIngestService:
    """Servicio de ingest AIS: decodifica NMEA y persiste en MongoDB."""

    def __init__(
        self,
        mongo_uri: str,
        db_name: str = "SICEN",
        collection_name: str = "aisPositions",
    ):
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.collection_name = collection_name
        self.client: Optional[AsyncIOMotorClient] = None
        self.collection = None
        self.stats = {
            "messages_received": 0,
            "messages_decoded": 0,
            "messages_stored": 0,
            "errors": 0,
        }

    async def connect_mongo(self):
        """Conecta a MongoDB y crea índices."""
        self.client = AsyncIOMotorClient(self.mongo_uri)
        db = self.client[self.db_name]
        self.collection = db[self.collection_name]

        # Índice 2dsphere para geolocalización
        await self.collection.create_index([("location", "2dsphere")])
        # Índice por MMSI para búsquedas rápidas
        await self.collection.create_index("mmsi")
        # Índice por timestamp para queries temporales y TTL
        await self.collection.create_index("timestamp", expireAfterSeconds=86400)
        # Índice compuesto para latest by MMSI
        await self.collection.create_index([("mmsi", 1), ("timestamp", -1)])

        logger.info(
            f"Conectado a MongoDB: {self.db_name}.{self.collection_name}"
        )

    async def close(self):
        """Cierra la conexión a MongoDB."""
        if self.client:
            self.client.close()
            logger.info("Conexión MongoDB cerrada")

    def parse_nmea_message(self, nmea_line: str) -> Optional[Dict]:
        """
        Decodifica una línea NMEA AIVDM y extrae datos relevantes.
        
        Tipos soportados:
        - 1, 2, 3: Position Report (Class A)
        - 18: Standard Class B Position Report
        - 19: Extended Class B Position Report
        - 5: Static and Voyage Related Data
        - 24: Static Data Report (Class B)
        """
        try:
            msg = decode(nmea_line.strip())
            msg_type = msg.get("msg_type")

            # Mensajes de posición (1-3, 18, 19)
            if msg_type in [1, 2, 3, 18, 19]:
                return self._extract_position_data(msg)
            
            # Mensajes estáticos (5, 24)
            elif msg_type in [5, 24]:
                return self._extract_static_data(msg)
            
            return None

        except Exception as e:
            logger.debug(f"Error decodificando mensaje: {e}")
            self.stats["errors"] += 1
            return None

    def _extract_position_data(self, msg: Dict) -> Dict:
        """Extrae datos de posición de mensajes tipo 1-3, 18, 19."""
        data = {
            "mmsi": str(msg.get("mmsi", "")),
            "msg_type": msg.get("msg_type"),
            "timestamp": datetime.now(timezone.utc),
            "lat": msg.get("lat"),
            "lon": msg.get("lon"),
            "location": {
                "type": "Point",
                "coordinates": [msg.get("lon"), msg.get("lat")],
            },
            "sog": msg.get("speed"),  # Speed over ground (knots)
            "cog": msg.get("course"),  # Course over ground (degrees)
            "heading": msg.get("heading"),  # True heading (degrees)
            "turn": msg.get("turn"),  # Rate of turn
            "nav_status": msg.get("status"),  # Navigation status
            "position_accuracy": msg.get("accuracy"),
            "data_type": "position",
        }

        # Campos específicos de Class A (1-3)
        if msg.get("msg_type") in [1, 2, 3]:
            data["ais_class"] = "A"
            data["maneuver"] = msg.get("maneuver")
            data["raim"] = msg.get("raim")
        
        # Campos específicos de Class B (18, 19)
        elif msg.get("msg_type") in [18, 19]:
            data["ais_class"] = "B"
            if msg.get("msg_type") == 19:
                # Type 19 incluye más info estática
                data["name"] = msg.get("shipname", "").strip()
                data["ship_type"] = msg.get("ship_type")
                data["to_bow"] = msg.get("to_bow")
                data["to_stern"] = msg.get("to_stern")
                data["to_port"] = msg.get("to_port")
                data["to_starboard"] = msg.get("to_starboard")

        return data

    def _extract_static_data(self, msg: Dict) -> Dict:
        """Extrae datos estáticos de mensajes tipo 5 y 24."""
        data = {
            "mmsi": str(msg.get("mmsi", "")),
            "msg_type": msg.get("msg_type"),
            "timestamp": datetime.now(timezone.utc),
            "data_type": "static",
        }

        # Type 5: Static and Voyage Related Data (Class A)
        if msg.get("msg_type") == 5:
            data["ais_class"] = "A"
            data["name"] = msg.get("shipname", "").strip()
            data["callsign"] = msg.get("callsign", "").strip()
            data["imo"] = msg.get("imo")
            data["ship_type"] = msg.get("ship_type")
            data["to_bow"] = msg.get("to_bow")
            data["to_stern"] = msg.get("to_stern")
            data["to_port"] = msg.get("to_port")
            data["to_starboard"] = msg.get("to_starboard")
            data["draught"] = msg.get("draught")
            data["destination"] = msg.get("destination", "").strip()
            data["eta"] = msg.get("eta")

        # Type 24: Static Data Report (Class B)
        elif msg.get("msg_type") == 24:
            data["ais_class"] = "B"
            part_num = msg.get("partno")
            data["part_number"] = part_num

            if part_num == 0:
                # Part A: Name
                data["name"] = msg.get("shipname", "").strip()
            elif part_num == 1:
                # Part B: Type and dimensions
                data["ship_type"] = msg.get("ship_type")
                data["callsign"] = msg.get("callsign", "").strip()
                data["to_bow"] = msg.get("to_bow")
                data["to_stern"] = msg.get("to_stern")
                data["to_port"] = msg.get("to_port")
                data["to_starboard"] = msg.get("to_starboard")

        return data

    async def store_message(self, data: Dict):
        """
        Persiste el mensaje en MongoDB.
        
        Para posiciones: upsert por MMSI (última posición).
        Para estáticos: merge con documento existente.
        """
        if not self.collection or not data:
            return

        mmsi = data.get("mmsi")
        if not mmsi:
            return

        try:
            if data.get("data_type") == "position":
                # Upsert: mantener última posición por MMSI
                await self.collection.update_one(
                    {"mmsi": mmsi, "data_type": "position"},
                    {
                        "$set": data,
                        "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
                    },
                    upsert=True,
                )
            elif data.get("data_type") == "static":
                # Merge con datos existentes (no sobrescribir posición)
                update_fields = {
                    k: v for k, v in data.items()
                    if k not in ["_id", "location", "lat", "lon", "sog", "cog", "heading"]
                    and v is not None
                }
                if update_fields:
                    await self.collection.update_one(
                        {"mmsi": mmsi},
                        {
                            "$set": update_fields,
                            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
                        },
                        upsert=True,
                    )

            self.stats["messages_stored"] += 1

        except Exception as e:
            logger.error(f"Error guardando en MongoDB: {e}")
            self.stats["errors"] += 1

    async def process_nmea_stream(self, stream):
        """Procesa un stream de mensajes NMEA."""
        logger.info("Iniciando procesamiento de stream NMEA...")
        
        for msg_line in stream:
            self.stats["messages_received"] += 1
            
            if isinstance(msg_line, bytes):
                msg_line = msg_line.decode("utf-8", errors="ignore")
            
            data = self.parse_nmea_message(msg_line)
            
            if data:
                self.stats["messages_decoded"] += 1
                await self.store_message(data)
            
            # Log stats cada 100 mensajes
            if self.stats["messages_received"] % 100 == 0:
                logger.info(f"Stats: {self.stats}")

    async def listen_udp(self, host: str = "0.0.0.0", port: int = 10110):
        """Escucha mensajes NMEA por UDP."""
        logger.info(f"Escuchando NMEA por UDP en {host}:{port}")
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind((host, port))
        sock.setblocking(False)
        
        loop = asyncio.get_event_loop()
        
        try:
            while True:
                try:
                    data, addr = await loop.sock_recvfrom(sock, 4096)
                    self.stats["messages_received"] += 1
                    
                    msg_line = data.decode("utf-8", errors="ignore")
                    parsed_data = self.parse_nmea_message(msg_line)
                    
                    if parsed_data:
                        self.stats["messages_decoded"] += 1
                        await self.store_message(parsed_data)
                    
                    # Log stats cada 100 mensajes
                    if self.stats["messages_received"] % 100 == 0:
                        logger.info(f"Stats: {self.stats}")
                        
                except Exception as e:
                    logger.error(f"Error procesando mensaje UDP: {e}")
                    self.stats["errors"] += 1
                    await asyncio.sleep(0.1)
                    
        except asyncio.CancelledError:
            logger.info("Listener UDP cancelado")
        finally:
            sock.close()

    async def listen_tcp(self, host: str = "0.0.0.0", port: int = 10110):
        """Escucha mensajes NMEA por TCP."""
        logger.info(f"Escuchando NMEA por TCP en {host}:{port}")
        
        server = await asyncio.start_server(
            self._handle_tcp_client, host, port
        )
        
        async with server:
            await server.serve_forever()

    async def _handle_tcp_client(self, reader, writer):
        """Maneja un cliente TCP conectado."""
        addr = writer.get_extra_info("peername")
        logger.info(f"Cliente TCP conectado: {addr}")
        
        try:
            while True:
                data = await reader.readline()
                if not data:
                    break
                
                self.stats["messages_received"] += 1
                
                msg_line = data.decode("utf-8", errors="ignore")
                parsed_data = self.parse_nmea_message(msg_line)
                
                if parsed_data:
                    self.stats["messages_decoded"] += 1
                    await self.store_message(parsed_data)
                
                # Log stats cada 100 mensajes
                if self.stats["messages_received"] % 100 == 0:
                    logger.info(f"Stats: {self.stats}")
                    
        except Exception as e:
            logger.error(f"Error con cliente TCP {addr}: {e}")
        finally:
            writer.close()
            await writer.wait_closed()
            logger.info(f"Cliente TCP desconectado: {addr}")


async def run_ingest_service(
    mongo_uri: str,
    protocol: str = "udp",
    host: str = "0.0.0.0",
    port: int = 10110,
):
    """
    Ejecuta el servicio de ingest AIS.
    
    Args:
        mongo_uri: URI de conexión a MongoDB
        protocol: 'udp' o 'tcp'
        host: Host para escuchar
        port: Puerto para escuchar
    """
    service = AisIngestService(mongo_uri)
    
    try:
        await service.connect_mongo()
        
        if protocol.lower() == "udp":
            await service.listen_udp(host, port)
        elif protocol.lower() == "tcp":
            await service.listen_tcp(host, port)
        else:
            raise ValueError(f"Protocolo no soportado: {protocol}")
            
    except KeyboardInterrupt:
        logger.info("Servicio interrumpido por usuario")
    except Exception as e:
        logger.error(f"Error en servicio de ingest: {e}")
        raise
    finally:
        await service.close()


if __name__ == "__main__":
    # Configuración desde variables de entorno
    mongo_uri = os.getenv(
        "AIS_MONGODB_URI",
        "mongodb://localhost:27017/SICEN"
    )
    protocol = os.getenv("AIS_PROTOCOL", "udp")
    host = os.getenv("AIS_HOST", "0.0.0.0")
    port = int(os.getenv("AIS_PORT", "10110"))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    asyncio.run(run_ingest_service(mongo_uri, protocol, host, port))
