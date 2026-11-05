import { describe, expect, it } from "vitest";
import {
  roundPercentsToOneDecimal,
  stackedBarPercents,
} from "./stackedBarPercents.js";

function sum(nums) {
  return nums.reduce((s, n) => s + n, 0);
}

describe("roundPercentsToOneDecimal", () => {
  it("reparte tercios a 1 decimal y suma 100.0", () => {
    const pcts = roundPercentsToOneDecimal([1, 1, 1]);
    expect(pcts).toEqual([33.4, 33.3, 33.3]);
    expect(sum(pcts)).toBeCloseTo(100, 5);
    expect(pcts.every((p) => Number.isInteger(Math.round(p * 10)))).toBe(true);
  });

  it("deja mitades exactas en 50.0", () => {
    expect(roundPercentsToOneDecimal([50, 50])).toEqual([50, 50]);
  });

  it("asigna el resto mayor al primer valor con más fracción", () => {
    expect(roundPercentsToOneDecimal([1, 2, 3])).toEqual([16.7, 33.3, 50]);
    expect(sum(roundPercentsToOneDecimal([1, 2, 3]))).toBeCloseTo(100, 5);
  });

  it("ignora ceros y negativos en el total", () => {
    expect(roundPercentsToOneDecimal([10, 0, -4, 10])).toEqual([50, 0, 0, 50]);
  });

  it("devuelve ceros si el total no es positivo", () => {
    expect(roundPercentsToOneDecimal([])).toEqual([]);
    expect(roundPercentsToOneDecimal([0, 0])).toEqual([0, 0]);
    expect(roundPercentsToOneDecimal([-1, 0])).toEqual([0, 0]);
  });

  it("maneja un único valor como 100.0", () => {
    expect(roundPercentsToOneDecimal([42])).toEqual([100]);
  });

  it("redondea un sliver chico a 1 decimal sin romper el 100%", () => {
    const pcts = roundPercentsToOneDecimal([100, 1]);
    expect(pcts[0] + pcts[1]).toBeCloseTo(100, 5);
    expect(pcts[1]).toBe(1);
    expect(pcts[0]).toBe(99);
  });
});

describe("stackedBarPercents", () => {
  it("omite segmentos vacíos y oculta etiquetas chicas", () => {
    const rows = stackedBarPercents(
      [
        { key: "a", label: "A", value: 90 },
        { key: "b", label: "B", value: 0 },
        { key: "c", label: "C", value: 7 },
        { key: "d", label: "D", value: 3 },
      ],
      { minLabelPercent: 8 }
    );
    expect(rows.map((r) => r.key)).toEqual(["a", "c", "d"]);
    expect(sum(rows.map((r) => r.percent))).toBeCloseTo(100, 5);
    expect(rows.find((r) => r.key === "a").showLabel).toBe(true);
    expect(rows.find((r) => r.key === "d").showLabel).toBe(false);
    expect(rows.find((r) => r.key === "c").showLabel).toBe(false);
  });

  it("muestra etiqueta desde el umbral inclusive", () => {
    const rows = stackedBarPercents(
      [
        { key: "a", label: "A", value: 92 },
        { key: "b", label: "B", value: 8 },
      ],
      { minLabelPercent: 8 }
    );
    expect(rows[1].percent).toBe(8);
    expect(rows[1].showLabel).toBe(true);
  });
});
