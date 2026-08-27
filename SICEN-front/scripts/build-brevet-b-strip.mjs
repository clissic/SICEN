/**
 * Precomputa el polígono de Categoría B (unión de círculos 15 MN).
 * Uso (desde SICEN-front): node scripts/build-brevet-b-strip.mjs
 *
 * Cortes: ver `src/constants/data/brevetBStripCuts.js`
 * Luego se recorta al lado mar de la costa (no pinta tierra).
 * Checkpoint v1: node scripts/restore-brevet-b-checkpoint.mjs v1
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  BREVET_B_COAST_POINTS,
  BREVET_B_CIRCLE_RADIUS_NM,
} from "../src/constants/brevetBCoastPoints.js";
import { BREVET_B_STRIP_CUTS } from "../src/constants/data/brevetBStripCuts.js";
import {
  mergeCirclesPolygon,
  clipPolygonToSeawardOfCoast,
} from "../src/utils/mergeCirclesPolygon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(
  __dirname,
  "../src/constants/data/brevetBStripPolygon.js"
);

const CUTS = BREVET_B_STRIP_CUTS;

let positions = mergeCirclesPolygon(
  BREVET_B_COAST_POINTS,
  BREVET_B_CIRCLE_RADIUS_NM,
  72,
  CUTS
);

const before = positions.length;
positions = clipPolygonToSeawardOfCoast(positions, BREVET_B_COAST_POINTS);

const cutRegs = CUTS.flatMap((c) => c.indices.map((i) => i + 1));
console.log(
  "centers",
  BREVET_B_COAST_POINTS.length,
  "cut registers",
  cutRegs.join(", "),
  "verts before water-clip",
  before,
  "after",
  positions.length
);

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const out = `/**
 * Polígono Categoría B: unión de círculos de ${BREVET_B_CIRCLE_RADIUS_NM} MN
 * (puntos 1–219), solo lado mar (recortado con la costa).
 * Cortes en brevetBStripCuts.js.
 * Regenerar: node scripts/build-brevet-b-strip.mjs
 * Restaurar checkpoint: node scripts/restore-brevet-b-checkpoint.mjs v1
 */
export const BREVET_B_STRIP_POSITIONS = ${JSON.stringify(positions)};
`;

fs.writeFileSync(outPath, out);
console.log("OK", outPath);
