import { describe, expect, it } from "vitest";
import { stackedBarPercents } from "../../utils/stackedBarPercents.js";
import { buildFuelStats, fuelMixItems } from "./BorderPatrolFuelStats.jsx";

const INSIDE_LABEL_MIN_PERCENT = 10;

function fulfilled(date, unitAcronym, type, liters) {
  return {
    status: "fulfilled",
    date,
    unitAcronym,
    fulfillment: { fuel: { type, liters } },
  };
}

describe("buildFuelStats + barra de mezcla", () => {
  it("agrupa litros reales de patrullas cumplidas", () => {
    const stats = buildFuelStats([
      fulfilled("2026-03-02", "PRENA", "gasoil-comun", 120),
      fulfilled("2026-03-10", "COMFLO", "nafta-super", 40),
      fulfilled("2026-03-18", "PRENA", "nafta-premium", 8),
      { status: "planned", date: "2026-03-20", unitAcronym: "PRENA", fulfillment: { fuel: { type: "jet-a1", liters: 999 } } },
      fulfilled("2026-04-01", "PRENA", "gasoil-especial", 50),
    ]);

    expect(stats.yearTotal).toBe(218);
    expect(stats.months[2].total).toBe(168);
    expect(stats.months[2].byFuel.get("gasoil-comun")).toBe(120);
    expect(stats.months[2].byFuel.get("nafta-super")).toBe(40);
    expect(stats.months[2].byFuel.get("nafta-premium")).toBe(8);
    expect(stats.months[2].byUnit.get("PRENA").byFuel.get("gasoil-comun")).toBe(120);
  });

  it("pone el % a 1 decimal en cada tipo y oculta tramos chicos", () => {
    const stats = buildFuelStats([
      fulfilled("2026-03-02", "PRENA", "gasoil-comun", 80),
      fulfilled("2026-03-10", "COMFLO", "nafta-super", 15),
      fulfilled("2026-03-18", "PRENA", "nafta-premium", 5),
    ]);
    const rows = stackedBarPercents(fuelMixItems(stats.months[2].byFuel), {
      minLabelPercent: INSIDE_LABEL_MIN_PERCENT,
    });

    expect(rows.map((r) => r.key)).toEqual([
      "nafta-super",
      "nafta-premium",
      "gasoil-comun",
    ]);
    expect(rows.map((r) => r.percent)).toEqual([15, 5, 80]);
    expect(rows.reduce((s, r) => s + r.percent, 0)).toBe(100);
    expect(rows.find((r) => r.key === "gasoil-comun").showLabel).toBe(true);
    expect(rows.find((r) => r.key === "nafta-super").showLabel).toBe(true);
    expect(rows.find((r) => r.key === "nafta-premium").showLabel).toBe(false);
  });
});
