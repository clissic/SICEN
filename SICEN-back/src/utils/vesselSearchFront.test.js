import { describe, expect, it } from "vitest";
import {
  collectVesselSearchHits,
  mergeRemoteAisHits,
} from "../../../SICEN-front/src/components/centinela/CentinelaVesselSearch.jsx";

const remote = [
  { mmsi: "770000001", name: "DEMO RIO PLATA", callsign: "DEMO", lat: -34.93, lon: -56.2, positionSource: "nmea-udp", updatedAt: 2 },
  { mmsi: "412000999", name: "Río de la Plata Star", lat: -35, lon: -56, positionSource: "skylight", updatedAt: 1 },
];

describe("buscador del front con resultados AIS del backend", () => {
  it("sin buques cargados en el mapa usa los del backend (capa AIS apagada)", () => {
    const local = collectVesselSearchHits({ query: "demo", aisVessels: [] });
    const hits = mergeRemoteAisHits(local, remote, "demo");
    expect(hits.map((h) => h.id)).toEqual(["ais:770000001"]);
    expect(hits[0].kind).toBe("ais");
    expect(hits[0].vessel.positionSource).toBe("nmea-udp");
  });
  it("'rio plata' encuentra ambos y no duplica MMSI ya cargados", () => {
    const local = collectVesselSearchHits({ query: "rio plata", aisVessels: [remote[0]] });
    const hits = mergeRemoteAisHits(local, remote, "rio plata");
    expect(hits.map((h) => h.id)).toEqual(["ais:770000001", "ais:412000999"]);
  });
  it("MMSI exacto", () => {
    const hits = mergeRemoteAisHits([], remote, "770000001");
    expect(hits[0].id).toBe("ais:770000001");
  });
  it("descarta buques del backend sin posición", () => {
    expect(mergeRemoteAisHits([], [{ mmsi: "1", name: "DEMO X" }], "demo")).toEqual([]);
  });
});
