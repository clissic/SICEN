import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetNmeaReceiverForTests,
  getNmeaReceiverStatus,
  hasValidNmeaChecksum,
  isSourceAllowed,
  parseNmeaLine,
} from "./aisNmeaReceiver.service.js";

/** Calcula checksum NMEA para armar sentencias de prueba. */
function withChecksum(body) {
  let x = 0;
  for (const c of body) x ^= c.charCodeAt(0);
  return `!${body}*${x.toString(16).toUpperCase().padStart(2, "0")}`;
}

// Generadas con pyais.encode_dict (tipo 1 MMSI 770000001 en -34.93,-56.20).
const POS = "!AIVDO,1,1,,A,1;NE4POP1pKvg:1d0ll4d3h1P000,0*40";

describe("hasValidNmeaChecksum", () => {
  it("acepta checksum correcto", () => {
    expect(hasValidNmeaChecksum(POS)).toBe(true);
  });
  it("rechaza checksum incorrecto o ausente", () => {
    expect(hasValidNmeaChecksum(POS.replace(/\*40$/, "*41"))).toBe(false);
    expect(hasValidNmeaChecksum(POS.replace(/\*40$/, ""))).toBe(false);
    expect(hasValidNmeaChecksum("")).toBe(false);
  });
});

describe("parseNmeaLine", () => {
  beforeEach(() => _resetNmeaReceiverForTests());

  it("decodifica posición tipo 1", () => {
    const v = parseNmeaLine(POS);
    expect(String(v.mmsi)).toBe("770000001");
    expect(v.lat).toBeCloseTo(-34.93, 5);
    expect(v.lon).toBeCloseTo(-56.2, 5);
    expect(v.aisClass).toBe("A");
  });

  it("descarta y cuenta sentencias con checksum inválido", () => {
    expect(parseNmeaLine(POS.replace(/\*40$/, "*00"))).toBeNull();
    const { metrics } = getNmeaReceiverStatus();
    expect(metrics.invalidChecksum).toBe(1);
    expect(metrics.valid).toBe(0);
    expect(metrics.discarded).toBe(1);
  });

  it("ensambla tipo 5 multi-fragmento y obtiene el nombre", async () => {
    // Fragmentos tipo 5 generados con pyais (MMSI 770000001, "DEMO RIO PLATA").
    const { encodeType5 } = await import("./__fixtures__/type5.js");
    const [a, b] = encodeType5;
    expect(parseNmeaLine(a, { source: "127.0.0.1" })).toBeNull();
    const v = parseNmeaLine(b, { source: "127.0.0.1" });
    expect(v).not.toBeNull();
    expect(String(v.mmsi)).toBe("770000001");
    expect(v.name).toBe("DEMO RIO PLATA");
  });

  it("no mezcla fragmentos de orígenes distintos", async () => {
    const { encodeType5 } = await import("./__fixtures__/type5.js");
    const [a, b] = encodeType5;
    expect(parseNmeaLine(a, { source: "10.0.0.1" })).toBeNull();
    expect(parseNmeaLine(b, { source: "10.0.0.2" })).toBeNull();
  });

  it("ignora líneas que no son AIVDM/AIVDO", () => {
    expect(parseNmeaLine(withChecksum("GPGGA,1,2,3"))).toBeNull();
    expect(getNmeaReceiverStatus().metrics.malformed).toBe(1);
  });
});

describe("isSourceAllowed", () => {
  it("lista vacía permite todo", () => {
    expect(isSourceAllowed("1.2.3.4", [])).toBe(true);
  });
  it("respeta la allowlist (incluye IPv4-mapped)", () => {
    const allow = ["172.17.0.2", "127.0.0.1"];
    expect(isSourceAllowed("172.17.0.2", allow)).toBe(true);
    expect(isSourceAllowed("::ffff:127.0.0.1", allow)).toBe(true);
    expect(isSourceAllowed("10.0.0.9", allow)).toBe(false);
  });
});
