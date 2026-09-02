import { useEffect, useRef } from "react";
import { postSportMovementPosition } from "../api/client.js";
import {
  clearQueuedSportPositions,
  enqueueSportPosition,
  listQueuedSportPositions,
  removeQueuedSportPosition,
} from "../utils/sportMovementPositionQueue.js";

const EMIT_INTERVAL_MS = 60_000;
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 30_000,
  timeout: 25_000,
};

let activeStop = null;

export function stopSportMovementPositionEmitter() {
  activeStop?.();
  activeStop = null;
}

async function flushQueue(movementId) {
  const rows = await listQueuedSportPositions(movementId);
  for (const row of rows) {
    try {
      await postSportMovementPosition(movementId, row.payload);
      await removeQueuedSportPosition(row.id);
    } catch (e) {
      if (e?.status === 409) {
        await clearQueuedSportPositions(movementId);
        return;
      }
      break;
    }
  }
}

/**
 * Emite posiciones GPS del náuta (~1 cada 60 s) con cola offline.
 */
export function useSportMovementPositionEmitter({
  enabled = false,
  movementId = null,
} = {}) {
  const lastSentAtRef = useRef(0);
  const watchIdRef = useRef(null);
  const movementIdRef = useRef(movementId);
  movementIdRef.current = movementId;

  useEffect(() => {
    if (!enabled || !movementId) {
      stopSportMovementPositionEmitter();
      return undefined;
    }

    if (!navigator?.geolocation) return undefined;

    let cancelled = false;

    async function sendPosition(coords) {
      const mid = movementIdRef.current;
      if (!mid || cancelled) return;

      const now = Date.now();
      if (now - lastSentAtRef.current < EMIT_INTERVAL_MS) return;
      lastSentAtRef.current = now;

      const payload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        positionTimestamp: new Date(coords.timestamp || now).toISOString(),
        source: "browser",
        speed: coords.speed,
        heading: coords.heading,
        altitude: coords.altitude,
      };

      if (navigator.getBattery) {
        try {
          const battery = await navigator.getBattery();
          if (typeof battery?.level === "number") {
            payload.batteryLevel = Math.round(battery.level * 100);
          }
        } catch {
          /* ignore */
        }
      }

      try {
        await postSportMovementPosition(mid, payload);
        await flushQueue(mid);
      } catch (e) {
        if (e?.status === 409) {
          stopSportMovementPositionEmitter();
          return;
        }
        try {
          await enqueueSportPosition(mid, payload);
        } catch {
          /* ignore */
        }
      }
    }

    function onPosition(pos) {
      sendPosition(pos.coords).catch(() => {});
    }

    function onError() {
      /* permisos / timeout: el hook sigue intentando */
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      GEO_OPTIONS
    );

    function onVisibility() {
      if (document.visibilityState === "visible") {
        flushQueue(movementIdRef.current).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    flushQueue(movementId).catch(() => {});

    function stop() {
      cancelled = true;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
    }

    activeStop = stop;

    return () => {
      stop();
      if (activeStop === stop) activeStop = null;
    };
  }, [enabled, movementId]);
}
