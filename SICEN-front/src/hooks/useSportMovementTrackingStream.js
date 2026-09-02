import { useEffect, useMemo, useRef, useState } from "react";
import {
  openSportMovementTrackingStream,
  sportMovementTrackingActiveMap,
} from "../api/client.js";

function mergeItem(prev, next) {
  if (!next) return prev;
  return {
    ...(prev || {}),
    ...next,
    tracking: { ...(prev?.tracking || {}), ...(next.tracking || {}) },
    lastPosition: next.lastPosition ?? prev?.lastPosition,
  };
}

/**
 * Stream SSE + snapshot de movimientos deportivos en seguimiento activo.
 */
export function useSportMovementTrackingStream({ enabled = true } = {}) {
  const [itemsById, setItemsById] = useState(() => new Map());
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return undefined;
    }

    const ac = new AbortController();
    let cancelled = false;
    let retryTimer = null;

    async function loadSnapshot() {
      try {
        const data = await sportMovementTrackingActiveMap();
        const next = new Map();
        for (const item of data?.items || []) {
          const id = String(item.movementId);
          next.set(id, item);
        }
        setItemsById(next);
      } catch (e) {
        setError(e?.message || "No se pudo cargar el mapa de seguimiento");
      }
    }

    async function connect() {
      if (cancelled || !enabledRef.current) return;
      setError("");
      try {
        await loadSnapshot();
        await openSportMovementTrackingStream({
          signal: ac.signal,
          onSnapshot(list) {
            const next = new Map();
            for (const item of list || []) {
              const id = String(item.movementId);
              next.set(id, item);
            }
            setItemsById(next);
            setConnected(true);
          },
          onPosition({ movement, position }) {
            const id = String(movement?._id || movement?.movementId);
            if (!id) return;
            setItemsById((prev) => {
              const next = new Map(prev);
              const existing = next.get(id) || { movementId: id };
              next.set(
                id,
                mergeItem(existing, {
                  ...existing,
                  movementId: id,
                  vesselName:
                    movement?.vesselSnapshot?.name || existing.vesselName,
                  vesselReg:
                    movement?.vesselSnapshot?.nationalRegistryNumber ||
                    existing.vesselReg,
                  skipperName:
                    movement?.skipper?.fullName || existing.skipperName,
                  skipper: movement?.skipper || existing.skipper,
                  originUnit: movement?.originUnit || existing.originUnit,
                  destinationUnit:
                    movement?.destinationUnit || existing.destinationUnit,
                  eta: movement?.eta ?? existing.eta,
                  tracking: movement?.tracking || existing.tracking,
                  lastPosition: position
                    ? {
                        latitude: position.latitude,
                        longitude: position.longitude,
                        accuracy: position.accuracy,
                        positionTimestamp: position.positionTimestamp,
                        receivedAt: position.receivedAt,
                        source: position.source,
                      }
                    : movement?.tracking?.lastPosition || existing.lastPosition,
                })
              );
              return next;
            });
          },
          onTrackingState({ movement }) {
            const id = String(movement?._id);
            if (!id) return;
            if (!movement?.tracking?.active) {
              setItemsById((prev) => {
                const next = new Map(prev);
                next.delete(id);
                return next;
              });
              return;
            }
            setItemsById((prev) => {
              const next = new Map(prev);
              const existing = next.get(id);
              next.set(id, mergeItem(existing, {
                movementId: id,
                vesselName: movement?.vesselSnapshot?.name,
                vesselReg: movement?.vesselSnapshot?.nationalRegistryNumber,
                skipperName: movement?.skipper?.fullName,
                skipper: movement?.skipper,
                tracking: movement.tracking,
                lastPosition: movement?.tracking?.lastPosition,
              }));
              return next;
            });
          },
          onAlert({ movement }) {
            const id = String(movement?._id);
            if (!id) return;
            setItemsById((prev) => {
              const next = new Map(prev);
              const existing = next.get(id);
              if (!existing) return prev;
              next.set(
                id,
                mergeItem(existing, {
                  tracking: movement?.tracking,
                })
              );
              return next;
            });
          },
          onStatus(s) {
            setStatus(s);
            setConnected(Boolean(s?.connected));
          },
          onError(err) {
            setError(err.message || "Error en el stream de seguimiento");
            setConnected(false);
          },
        });
        if (!cancelled && enabledRef.current) {
          setConnected(false);
          retryTimer = setTimeout(connect, 3_000);
        }
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        setError(e?.message || "No se pudo conectar al seguimiento");
        setConnected(false);
        retryTimer = setTimeout(connect, 5_000);
      }
    }

    connect();

    return () => {
      cancelled = true;
      ac.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled]);

  const items = useMemo(() => Array.from(itemsById.values()), [itemsById]);

  return { items, itemsById, status, error, connected };
}
