import { describe, expect, it } from "vitest";
import {
  anyAisSourceVisible,
  filterVesselsByAisSources,
} from "../../../SICEN-front/src/constants/aisLayers.js";

const vessels = [
  { mmsi: "1", positionSource: "aisstream", sources: { aisstream: true } },
  { mmsi: "2", positionSource: "skylight", sources: { skylight: true } },
  { mmsi: "3", positionSource: "nmea-udp", sources: { nmeaUdp: true } },
];
const ids = (list) => list.map((v) => v.mmsi).sort();

describe("filterVesselsByAisSources (front)", () => {
  it("solo NMEA muestra únicamente los del receptor local", () => {
    expect(ids(filterVesselsByAisSources(vessels, { nmeaUdp: true }))).toEqual(["3"]);
  });
  it("AISStream + Skylight no muestran los NMEA", () => {
    expect(
      ids(filterVesselsByAisSources(vessels, { aisstream: true, skylight: true }))
    ).toEqual(["1", "2"]);
  });
  it("todas activas muestran todo; ninguna, nada", () => {
    expect(
      ids(filterVesselsByAisSources(vessels, { aisstream: true, skylight: true, nmeaUdp: true }))
    ).toEqual(["1", "2", "3"]);
    expect(filterVesselsByAisSources(vessels, {})).toEqual([]);
  });
  it("anyAisSourceVisible considera NMEA", () => {
    expect(anyAisSourceVisible({ nmeaUdp: true })).toBe(true);
    expect(anyAisSourceVisible({})).toBe(false);
  });
});
