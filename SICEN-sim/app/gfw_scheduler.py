"""
Scheduler para ejecutar el job de GFW periódicamente.
Se ejecuta en background al iniciar el worker SICEN-sim.
"""

import os
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .gfw_fetch import is_gfw_configured, run_gfw_fetch_job

logger = logging.getLogger("gfw_scheduler")


def get_schedule_cron() -> str:
    """Lee expresión cron desde env o usa default (cada 6 horas)."""
    return os.getenv("GFW_FETCH_SCHEDULE", "0 */6 * * *")


def scheduled_gfw_fetch():
    """Wrapper para el job programado."""
    if not is_gfw_configured():
        logger.info("GFW no configurado, saltando fetch")
        return
    
    logger.info("Ejecutando GFW fetch job programado")
    result = run_gfw_fetch_job()
    
    if result.get("ok"):
        stats = result.get("stats", {})
        logger.info(
            f"GFW fetch exitoso: {stats.get('totalInserted', 0)} insertados, "
            f"{stats.get('totalDuplicates', 0)} duplicados"
        )
    else:
        logger.error(f"GFW fetch falló: {result.get('msg')}")


def start_gfw_scheduler() -> BackgroundScheduler:
    """
    Inicia el scheduler de GFW.
    Retorna el scheduler para poder detenerlo si es necesario.
    """
    if not is_gfw_configured():
        logger.info("GFW_API_TOKEN no configurado, scheduler no iniciado")
        return None
    
    scheduler = BackgroundScheduler()
    
    # Programar según cron expression
    cron_expr = get_schedule_cron()
    trigger = CronTrigger.from_crontab(cron_expr)
    
    scheduler.add_job(
        scheduled_gfw_fetch,
        trigger=trigger,
        id="gfw_fetch",
        name="Global Fishing Watch data fetch",
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info(f"GFW scheduler iniciado con cron: {cron_expr}")
    
    # Ejecutar una vez al iniciar (opcional, controlado por env)
    if os.getenv("GFW_FETCH_ON_START", "false").lower() == "true":
        logger.info("Ejecutando GFW fetch inicial")
        scheduled_gfw_fetch()
    
    return scheduler
