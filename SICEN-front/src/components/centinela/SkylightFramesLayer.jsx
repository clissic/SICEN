import { useEffect, useRef, useState } from "react";
import { Polygon, Popup } from "react-leaflet";
import {
  SKYLIGHT_DEFAULT_LOOKBACK_HOURS,
  SKYLIGHT_EVENT_TYPE_LABELS,
} from "../../constants/skylightLayers.js";
import { skylightFetchFrames } from "../../api/client.js";
import { formatSkylightWhen } from "../../utils/skylightEventHelpers.js";

const REFRESH_MS = 5 * 60_000;
const FRAME_COLOR = "#64748b";

/**
 * Huellas de pasadas satelitales Skylight.
 * Popup anclado al polígono (no ventana arrastrable).
 */
export function SkylightFramesLayer({
  enabled,
  onStatusChange,
  selectedFrameId = null,
  onSelectFrame,
}) {
  const [frames, setFrames] = useState([]);
  const abortRef = useRef(null);
  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  useEffect(() => {
    if (!enabled) {
      setFrames([]);
      onStatusRef.current?.({
        loading: false,
        error: null,
        frameCount: 0,
      });
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      onStatusRef.current?.({ loading: true, error: null, frameCount: 0 });

      try {
        const data = await skylightFetchFrames(
          {
            lookbackHours: SKYLIGHT_DEFAULT_LOOKBACK_HOURS,
            limit: 80,
          },
          { signal: ac.signal }
        );
        if (cancelled) return;
        const list = Array.isArray(data?.frames) ? data.frames : [];
        setFrames(list);
        onStatusRef.current?.({
          loading: false,
          error: null,
          frameCount: list.length,
          total: data?.total ?? list.length,
        });
      } catch (e) {
        if (cancelled || e?.name === "AbortError") return;
        setFrames([]);
        onStatusRef.current?.({
          loading: false,
          error:
            e?.message ||
            e?.msg ||
            "No se pudieron cargar las pasadas satelitales.",
          frameCount: 0,
        });
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {frames.map((frame) => {
        if (!Array.isArray(frame.positions) || frame.positions.length < 3) {
          return null;
        }
        const selected = selectedFrameId === frame.frameId;
        const d = frame.detections || {};
        return (
          <Polygon
            key={frame.frameId}
            positions={frame.positions}
            pathOptions={{
              color: selected ? "#38bdf8" : FRAME_COLOR,
              weight: selected ? 2.5 : 1.5,
              dashArray: "7 5",
              fillColor: FRAME_COLOR,
              fillOpacity: selected ? 0.22 : 0.1,
            }}
            eventHandlers={{
              click: () => onSelectFrame?.(frame.frameId),
            }}
          >
            <Popup className="centinela-skylight-leaflet-popup">
              <div className="centinela-skylight-popup">
                <div className="centinela-skylight-popup__name">
                  Pasada{" "}
                  {SKYLIGHT_EVENT_TYPE_LABELS[frame.eventType] ||
                    frame.eventType ||
                    "satélite"}
                </div>
                <ul className="centinela-skylight-popup__meta list-unstyled mb-0">
                  <li>Captura: {formatSkylightWhen(frame.collectedAt)}</li>
                  {typeof d.total === "number" ? (
                    <li>Detecciones: {d.total}</li>
                  ) : null}
                  {typeof d.correlated === "number" ? (
                    <li>Con AIS: {d.correlated}</li>
                  ) : null}
                  {typeof d.uncorrelated === "number" ? (
                    <li>Sin AIS (dark): {d.uncorrelated}</li>
                  ) : null}
                  {frame.vendorId ? (
                    <li className="centinela-skylight-popup__vendor">
                      {frame.vendorId}
                    </li>
                  ) : null}
                </ul>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}
