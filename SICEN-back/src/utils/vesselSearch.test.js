import { describe, expect, it } from "vitest";
import { normalizeVesselSearchQuery, scoreVesselMatch, searchVessels } from "./vesselSearch.js";
import { aisIntelItemIdForVessel } from "../../../SICEN-front/src/constants/centinelaIntelLayers.js";

const now = Date.now();
const vessels = [
  { mmsi: "770000001", name: "DEMO RIO PLATA", callsign: "DEMO", positionSource: "nmea-udp", sources: { nmeaUdp: true }, updatedAt: now },
  { mmsi: "770000002", name: "DEMO MONTEVIDEO", callsign: "DEMO", positionSource: "nmea-udp", sources: { nmeaUdp: true }, updatedAt: now - 1000 },
  { mmsi: "725000123", name: "PESQUERO ÑANDÚ", imo: 9876543, callsign: "CX ABC", positionSource: "aisstream", sources: { aisstream: true }, updatedAt: now },
  { mmsi: "412000999", name: "Río de la Plata Star", positionSource: "skylight", sources: { skylight: true }, updatedAt: now },
];
const mmsis = (q) => searchVessels(vessels, q).map((v) => v.mmsi);

describe("normalizeVesselSearchQuery", () => {
  it("minúsculas, sin tildes ni espacios de más", () => {
    expect(normalizeVesselSearchQuery("  Río   DE la PLATA ")).toBe("rio de la plata");
  });
});

describe("searchVessels", () => {
  it("nombre parcial, sin mayúsculas, todas las fuentes (incl. nmea-udp)", () => {
    expect(mmsis("demo")).toEqual(["770000001", "770000002"]);
    expect(mmsis("rio plata")).toEqual(["770000001", "412000999"]); // contiguo primero, luego por palabras
    expect(mmsis("rio pla")[0]).toBe("770000001");
  });
  it("ignora tildes en ambos sentidos", () => {
    expect(mmsis("nandu")).toEqual(["725000123"]);
    expect(mmsis("RÍO DE LA")).toEqual(["412000999"]);
  });
  it("MMSI exacto y parcial", () => {
    expect(mmsis("770000001")[0]).toBe("770000001");
    expect(mmsis("7250")).toEqual(["725000123"]);
  });
  it("OMI e indicativo (con o sin espacios)", () => {
    expect(mmsis("9876543")).toEqual(["725000123"]);
    expect(mmsis("cxabc")).toEqual(["725000123"]);
    expect(mmsis("CX ABC")).toEqual(["725000123"]);
  });
  it("query vacía o sin coincidencias", () => {
    expect(searchVessels(vessels, "  ")).toEqual([]);
    expect(searchVessels(vessels, "zzz")).toEqual([]);
  });
  it("respeta limit y ordena por puntaje", () => {
    expect(searchVessels(vessels, "demo", { limit: 1 })).toHaveLength(1);
    expect(scoreVesselMatch(vessels[0], "demo rio plata")).toBeGreaterThan(
      scoreVesselMatch(vessels[0], "rio")
    );
  });
});

describe("aisIntelItemIdForVessel (front)", () => {
  it("elige la capa según la fuente de posición", () => {
    expect(aisIntelItemIdForVessel(vessels[2])).toBe("ais_live");
    expect(aisIntelItemIdForVessel(vessels[3])).toBe("ais_lastknown");
    expect(aisIntelItemIdForVessel(null)).toBeNull();
  });
});
