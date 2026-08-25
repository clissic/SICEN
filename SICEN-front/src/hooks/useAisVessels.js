import { useEffect, useMemo, useRef, useState } from "react";
import { openAisStream } from "../api/client.js";

/**
 * Suscribe al stream AIS del backend y mantiene un mapa MMSI → buque.
 */
export function useAisVessels({ enabled = true } = {}) {
  const [vesselsByMmsi, setVesselsByMmsi] = useState(() => new Map());
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

    async function connect() {
      if (cancelled || !enabledRef.current) return;
      setError("");
      try {
        await openAisStream({
          signal: ac.signal,
          onSnapshot(list) {
            const next = new Map();
            for (const v of list || []) {
              if (v?.mmsi != null) next.set(String(v.mmsi), v);
            }
            setVesselsByMmsi(next);
            setConnected(true);
          },
          onUpdate(vessel) {
            if (vessel?.mmsi == null) return;
            setVesselsByMmsi((prev) => {
              const next = new Map(prev);
              next.set(String(vessel.mmsi), vessel);
              return next;
            });
          },
          onRemove({ mmsi }) {
            if (mmsi == null) return;
            setVesselsByMmsi((prev) => {
              const next = new Map(prev);
              next.delete(String(mmsi));
              return next;
            });
          },
          onStatus(s) {
            setStatus(s);
            setConnected(Boolean(s?.connected || s?.configured));
          },
          onError(err) {
            setError(err.message || "Error en el stream AIS");
            setConnected(false);
          },
        });
        if (!cancelled && enabledRef.current) {
          setConnected(false);
          retryTimer = setTimeout(connect, 3_000);
        }
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        /* Reinicio del API o proxy caído: reintentar sin alarmar de más. */
        const soft =
          /ECONNRESET|ECONNREFUSED|network|fetch|502|unavailable/i.test(
            e?.message || ""
          );
        setError(
          soft
            ? "Reconectando AIS…"
            : e?.message || "No se pudo conectar al AIS"
        );
        setConnected(false);
        retryTimer = setTimeout(connect, soft ? 2_000 : 5_000);
      }
    }

    connect();

    return () => {
      cancelled = true;
      ac.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled]);

  const vessels = useMemo(
    () => Array.from(vesselsByMmsi.values()),
    [vesselsByMmsi]
  );

  return { vessels, vesselsByMmsi, status, error, connected };
}
