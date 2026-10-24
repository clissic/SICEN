/**
 * Tests para utilidades náuticas (nauticalUtils.js)
 */

import { describe, it, expect } from "vitest";
import {
  NAUTICAL_MILE_METERS,
  distanceMetersWgs84,
  distanceNauticalMiles,
  initialBearingDeg,
  finalBearingDeg,
  destinationPoint,
  midpoint,
  formatNauticalMiles,
  formatBearing,
  calculateLeg,
} from "./nauticalUtils.js";

describe("nauticalUtils", () => {
  describe("distanceMetersWgs84", () => {
    it("calcula distancia entre Montevideo y Buenos Aires", () => {
      // Montevideo: -34.9033° S, -56.1882° W
      // Buenos Aires: -34.6037° S, -58.3816° W
      const dist = distanceMetersWgs84(-34.9033, -56.1882, -34.6037, -58.3816);
      
      // Distancia aproximada: ~200 km = ~108 MN
      expect(dist).toBeGreaterThan(190000);
      expect(dist).toBeLessThan(210000);
    });

    it("retorna 0 para coordenadas inválidas", () => {
      expect(distanceMetersWgs84(NaN, 0, 0, 0)).toBe(0);
      expect(distanceMetersWgs84(0, 0, Infinity, 0)).toBe(0);
    });

    it("retorna 0 para mismo punto", () => {
      const dist = distanceMetersWgs84(-34.9, -56.2, -34.9, -56.2);
      expect(dist).toBeLessThan(1);
    });
  });

  describe("distanceNauticalMiles", () => {
    it("convierte metros a millas náuticas", () => {
      const nm = distanceNauticalMiles(-34.9033, -56.1882, -34.6037, -58.3816);
      
      // ~108 MN
      expect(nm).toBeGreaterThan(100);
      expect(nm).toBeLessThan(115);
    });

    it("una milla náutica son 1852 metros", () => {
      expect(NAUTICAL_MILE_METERS).toBe(1852);
    });
  });

  describe("initialBearingDeg", () => {
    it("calcula rumbo desde Montevideo a Buenos Aires", () => {
      // Rumbo aproximado: ~279° (oeste-noroeste)
      const bearing = initialBearingDeg(
        -34.9033,
        -56.1882,
        -34.6037,
        -58.3816
      );

      expect(bearing).toBeGreaterThan(275);
      expect(bearing).toBeLessThan(282);
    });

    it("rumbo norte desde ecuador", () => {
      const bearing = initialBearingDeg(0, 0, 10, 0);
      // Debería ser ~0° (norte)
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(1);
    });

    it("retorna 0 para coordenadas inválidas", () => {
      expect(initialBearingDeg(NaN, 0, 0, 0)).toBe(0);
    });
  });

  describe("finalBearingDeg", () => {
    it("calcula rumbo final", () => {
      const bearing = finalBearingDeg(-34.9033, -56.1882, -34.6037, -58.3816);
      
      // El rumbo final será diferente al inicial en rutas largas
      expect(bearing).toBeGreaterThan(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe("destinationPoint", () => {
    it("calcula punto destino a 10 MN al norte de Montevideo", () => {
      const start = { lat: -34.9033, lon: -56.1882 };
      const bearing = 0; // Norte
      const distanceM = 10 * NAUTICAL_MILE_METERS;

      const dest = destinationPoint(start.lat, start.lon, bearing, distanceM);

      // Debe estar ~0.167° más al norte (10 MN ≈ 18.52 km ≈ 0.167°)
      expect(dest.lat).toBeGreaterThan(start.lat);
      expect(dest.lat).toBeCloseTo(-34.73, 1);
      expect(dest.lng).toBeCloseTo(start.lon, 2);
    });

    it("retorna mismo punto para distancia 0", () => {
      const dest = destinationPoint(-34.9, -56.2, 90, 0);
      expect(dest.lat).toBeCloseTo(-34.9, 4);
      expect(dest.lng).toBeCloseTo(-56.2, 4);
    });

    it("maneja coordenadas inválidas", () => {
      const dest = destinationPoint(NaN, 0, 0, 1000);
      expect(dest.lat).toBe(0);
      expect(dest.lng).toBe(0);
    });
  });

  describe("midpoint", () => {
    it("calcula punto medio entre Montevideo y Buenos Aires", () => {
      const mid = midpoint(-34.9033, -56.1882, -34.6037, -58.3816);

      // Debe estar aproximadamente a mitad de camino
      expect(mid.lat).toBeCloseTo(-34.75, 1);
      expect(mid.lng).toBeCloseTo(-57.28, 1);
    });

    it("punto medio de mismo punto retorna el mismo punto", () => {
      const mid = midpoint(-34.9, -56.2, -34.9, -56.2);
      expect(mid.lat).toBeCloseTo(-34.9, 4);
      expect(mid.lng).toBeCloseTo(-56.2, 4);
    });
  });

  describe("formatNauticalMiles", () => {
    it("formatea millas náuticas con 2 decimales por defecto", () => {
      expect(formatNauticalMiles(12.3456)).toBe("12.35 MN");
      expect(formatNauticalMiles(0.5)).toBe("0.50 MN");
      expect(formatNauticalMiles(100.999)).toBe("101.00 MN");
    });

    it("maneja valores inválidos", () => {
      expect(formatNauticalMiles(NaN)).toBe("0.00 MN");
      expect(formatNauticalMiles(-5)).toBe("0.00 MN");
      expect(formatNauticalMiles(Infinity)).toBe("0.00 MN");
    });

    it("permite especificar decimales", () => {
      expect(formatNauticalMiles(12.3456, 3)).toBe("12.346 MN");
      expect(formatNauticalMiles(12.3456, 1)).toBe("12.3 MN");
    });
  });

  describe("formatBearing", () => {
    it("formatea rumbo en grados", () => {
      expect(formatBearing(0)).toBe("0°");
      expect(formatBearing(90)).toBe("90°");
      expect(formatBearing(180)).toBe("180°");
      expect(formatBearing(270)).toBe("270°");
      expect(formatBearing(359.9)).toBe("360°");
    });

    it("normaliza rumbos fuera de 0-360", () => {
      expect(formatBearing(361)).toBe("1°");
      expect(formatBearing(-10)).toBe("350°");
      expect(formatBearing(720)).toBe("0°");
    });

    it("maneja valores inválidos", () => {
      expect(formatBearing(NaN)).toBe("—");
      expect(formatBearing(Infinity)).toBe("—");
    });
  });

  describe("calculateLeg", () => {
    it("calcula todos los valores de un tramo náutico", () => {
      const leg = calculateLeg(-34.9033, -56.1882, -34.6037, -58.3816);

      expect(leg.distanceMeters).toBeGreaterThan(190000);
      expect(leg.distanceNauticalMiles).toBeGreaterThan(100);
      expect(leg.initialBearing).toBeGreaterThan(275);
      expect(leg.initialBearing).toBeLessThan(282);
      expect(leg.finalBearing).toBeGreaterThan(0);
      expect(leg.finalBearing).toBeLessThan(360);
      expect(leg.midpoint.lat).toBeCloseTo(-34.75, 1);
      expect(leg.midpoint.lng).toBeCloseTo(-57.28, 1);
    });

    it("maneja mismo punto", () => {
      const leg = calculateLeg(-34.9, -56.2, -34.9, -56.2);

      expect(leg.distanceMeters).toBeLessThan(1);
      expect(leg.distanceNauticalMiles).toBeLessThan(0.001);
    });
  });
});
