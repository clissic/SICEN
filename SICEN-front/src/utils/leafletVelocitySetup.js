import L from "leaflet";

let velocityReadyPromise = null;

/** Carga leaflet-velocity una sola vez (requiere `window.L` antes del script). */
export function ensureLeafletVelocity() {
  if (!velocityReadyPromise) {
    velocityReadyPromise = (async () => {
      if (typeof window !== "undefined") {
        window.L = L;
      }
      await import("leaflet-velocity/dist/leaflet-velocity.css");
      await import("leaflet-velocity/dist/leaflet-velocity.js");
      return L;
    })();
  }
  return velocityReadyPromise;
}

export { L };
