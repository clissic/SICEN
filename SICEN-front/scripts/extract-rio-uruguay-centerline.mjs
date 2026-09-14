import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src =
  "C:/Users/joaco/.cursor/projects/c-Users-joaco-OneDrive-Documents-Programaci-n-SICEN/agent-tools/328f7e29-567d-4bef-9220-7837d546ffbc.txt";
const j = JSON.parse(fs.readFileSync(src, "utf8"));
const g = j.features[0].geometry;

const northLat = -(30 + 11 / 60 + 44.6 / 3600);
const southLat = -33.93;
const northLon = -(57 + 38 / 60 + 49.4 / 3600);

/** @type {[number, number][]} lat,lon */
const raw = [];
for (const line of g.coordinates) {
  for (const [lon, lat] of line) {
    if (lat <= northLat + 0.02 && lat >= southLat) {
      raw.push([
        Number(lat.toFixed(6)),
        Number(lon.toFixed(6)),
      ]);
    }
  }
}

const sampled = [];
let last = null;
for (const p of raw) {
  if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.012) {
    sampled.push(p);
    last = p;
  }
}

const outPath = path.join(
  __dirname,
  "../src/constants/data/rioUruguayCenterline.js"
);
const out = `/**
 * Eje del Río Uruguay (OSM relation/380835), muestreado Punta Gorda → límite N.
 * Límite norte operacional: 30°11′44.6″S 057°38′49.4″O.
 * Fuente: OpenStreetMap (Nominatim). Regenerar: node scripts/extract-rio-uruguay-centerline.mjs
 */
export const RIO_URUGUAY_NORTH_TERMINUS = Object.freeze([
  ${northLat},
  ${northLon},
]);

export const RIO_URUGUAY_CENTERLINE = ${JSON.stringify(sampled)};
`;
fs.writeFileSync(outPath, out);
console.log("OK", outPath, "pts", sampled.length, "terminus", northLat, northLon);
