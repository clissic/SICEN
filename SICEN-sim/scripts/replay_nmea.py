#!/usr/bin/env python3
"""
Script de replay NMEA para testing del servicio de ingest AIS.

Reproduce mensajes NMEA desde un archivo y los envía por UDP o TCP
al servidor de ingest, simulando un receptor AIS real.

Uso:
    python scripts/replay_nmea.py data/sample-nmea.txt
    python scripts/replay_nmea.py data/sample-nmea.txt --tcp
    python scripts/replay_nmea.py data/sample-nmea.txt --loop --delay 0.5
"""
import argparse
import socket
import time
from pathlib import Path


def replay_udp(messages: list[str], host: str, port: int, delay: float, loop: bool):
    """Envía mensajes NMEA por UDP."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    iteration = 0
    try:
        while True:
            iteration += 1
            print(f"\n{'='*60}")
            print(f"Iteración {iteration} - Enviando {len(messages)} mensajes por UDP a {host}:{port}")
            print(f"{'='*60}\n")
            
            for i, msg in enumerate(messages, 1):
                if not msg.strip():
                    continue
                    
                sock.sendto(msg.encode("utf-8"), (host, port))
                print(f"[{i:3d}/{len(messages)}] Enviado: {msg.strip()}")
                
                if delay > 0:
                    time.sleep(delay)
            
            print(f"\n✓ Iteración {iteration} completada ({len(messages)} mensajes)")
            
            if not loop:
                break
                
            print(f"Esperando {delay*2:.1f}s antes de la siguiente iteración...")
            time.sleep(delay * 2)
            
    except KeyboardInterrupt:
        print("\n\n⏹  Replay interrumpido por usuario")
    finally:
        sock.close()
        print(f"\n📊 Total de iteraciones: {iteration}")


def replay_tcp(messages: list[str], host: str, port: int, delay: float, loop: bool):
    """Envía mensajes NMEA por TCP."""
    iteration = 0
    
    try:
        while True:
            iteration += 1
            print(f"\n{'='*60}")
            print(f"Iteración {iteration} - Conectando a {host}:{port} (TCP)")
            print(f"{'='*60}\n")
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            
            try:
                sock.connect((host, port))
                print(f"✓ Conectado. Enviando {len(messages)} mensajes...\n")
                
                for i, msg in enumerate(messages, 1):
                    if not msg.strip():
                        continue
                    
                    # TCP requiere newline al final
                    line = msg.strip() + "\n"
                    sock.sendall(line.encode("utf-8"))
                    print(f"[{i:3d}/{len(messages)}] Enviado: {msg.strip()}")
                    
                    if delay > 0:
                        time.sleep(delay)
                
                print(f"\n✓ Iteración {iteration} completada ({len(messages)} mensajes)")
                
            except ConnectionRefusedError:
                print(f"✗ Error: No se pudo conectar a {host}:{port}")
                print("  Asegurate de que el servicio de ingest esté corriendo.")
                break
            except Exception as e:
                print(f"✗ Error en iteración {iteration}: {e}")
            finally:
                sock.close()
            
            if not loop:
                break
                
            print(f"Esperando {delay*2:.1f}s antes de la siguiente iteración...")
            time.sleep(delay * 2)
            
    except KeyboardInterrupt:
        print("\n\n⏹  Replay interrumpido por usuario")
    finally:
        print(f"\n📊 Total de iteraciones: {iteration}")


def main():
    parser = argparse.ArgumentParser(
        description="Replay de mensajes NMEA para testing del ingest AIS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Enviar una vez por UDP (default)
  python scripts/replay_nmea.py data/sample-nmea.txt

  # Enviar por TCP
  python scripts/replay_nmea.py data/sample-nmea.txt --tcp

  # Enviar en loop continuo con delay
  python scripts/replay_nmea.py data/sample-nmea.txt --loop --delay 0.5

  # Enviar a otro host/puerto
  python scripts/replay_nmea.py data/sample-nmea.txt --host 192.168.1.100 --port 5000
        """,
    )
    
    parser.add_argument(
        "input_file",
        type=Path,
        help="Archivo con mensajes NMEA (uno por línea)",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host del servidor de ingest (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=10110,
        help="Puerto del servidor de ingest (default: 10110)",
    )
    parser.add_argument(
        "--tcp",
        action="store_true",
        help="Usar TCP en lugar de UDP",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.1,
        help="Delay entre mensajes en segundos (default: 0.1)",
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Repetir el envío en loop continuo",
    )
    
    args = parser.parse_args()
    
    # Leer mensajes del archivo
    if not args.input_file.exists():
        print(f"✗ Error: El archivo no existe: {args.input_file}")
        return 1
    
    with open(args.input_file, "r", encoding="utf-8") as f:
        messages = [line.strip() for line in f if line.strip()]
    
    if not messages:
        print(f"✗ Error: El archivo está vacío: {args.input_file}")
        return 1
    
    print(f"\n{'='*60}")
    print(f"SICEN AIS NMEA Replay")
    print(f"{'='*60}")
    print(f"Archivo:   {args.input_file}")
    print(f"Mensajes:  {len(messages)}")
    print(f"Protocolo: {'TCP' if args.tcp else 'UDP'}")
    print(f"Destino:   {args.host}:{args.port}")
    print(f"Delay:     {args.delay}s entre mensajes")
    print(f"Modo:      {'Loop continuo' if args.loop else 'Una vez'}")
    print(f"{'='*60}")
    
    if args.loop:
        print("\n⚠️  Modo loop activado. Presioná Ctrl+C para detener.\n")
    
    time.sleep(1)
    
    # Enviar mensajes
    if args.tcp:
        replay_tcp(messages, args.host, args.port, args.delay, args.loop)
    else:
        replay_udp(messages, args.host, args.port, args.delay, args.loop)
    
    print("\n✓ Replay finalizado\n")
    return 0


if __name__ == "__main__":
    exit(main())
