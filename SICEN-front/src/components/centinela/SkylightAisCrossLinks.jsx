import { Polyline } from "react-leaflet";
import { skylightEventMmsis } from "../../utils/skylightEventHelpers.js";

/**
 * Líneas visuales AIS ↔ evento Skylight cuando comparten MMSI.
 */
export function SkylightAisCrossLinks({
  vessels,
  events,
  matchedMmsis,
  selectedMmsi = null,
}) {
  if (
    !Array.isArray(vessels) ||
    !Array.isArray(events) ||
    !(matchedMmsis instanceof Set) ||
    matchedMmsis.size === 0
  ) {
    return null;
  }

  const byMmsi = new Map();
  for (const v of vessels) {
    const mmsi = String(v.mmsi ?? "").trim();
    if (!matchedMmsis.has(mmsi)) continue;
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
    byMmsi.set(mmsi, v);
  }
  if (byMmsi.size === 0) return null;

  const links = [];
  for (const ev of events) {
    if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) continue;
    for (const mmsi of skylightEventMmsis(ev)) {
      if (!matchedMmsis.has(mmsi)) continue;
      const vessel = byMmsi.get(mmsi);
      if (!vessel) continue;
      links.push({
        key: `${mmsi}:${ev.eventId}`,
        mmsi,
        positions: [
          [vessel.lat, vessel.lon],
          [ev.lat, ev.lon],
        ],
        selected: selectedMmsi != null && String(selectedMmsi) === mmsi,
      });
    }
  }

  return (
    <>
      {links.map((link) => (
        <Polyline
          key={link.key}
          positions={link.positions}
          pathOptions={{
            color: link.selected ? "#8e44ad" : "#9b59b6",
            weight: link.selected ? 3 : 1.75,
            opacity: link.selected ? 0.95 : 0.55,
            dashArray: "4 6",
          }}
        />
      ))}
    </>
  );
}
