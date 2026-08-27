/**
 * Restaura un checkpoint de la franja Categoría B.
 *
 * Uso (desde SICEN-front):
 *   node scripts/restore-brevet-b-checkpoint.mjs v1
 *
 * Checkpoints en: src/constants/data/checkpoints/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const id = (process.argv[2] || "").trim();
if (!id) {
  console.error("Uso: node scripts/restore-brevet-b-checkpoint.mjs <id>");
  console.error("Ej.: node scripts/restore-brevet-b-checkpoint.mjs v1");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../src/constants/data");
const cpDir = path.join(dataDir, "checkpoints");
const metaPath = path.join(cpDir, `brevet-b-${id}.meta.json`);

if (!fs.existsSync(metaPath)) {
  console.error("No existe checkpoint:", metaPath);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
const cutsSrc = path.join(cpDir, meta.files.cuts);
const polySrc = path.join(cpDir, meta.files.polygon);
const cutsDst = path.join(dataDir, "brevetBStripCuts.js");
const polyDst = path.join(dataDir, "brevetBStripPolygon.js");

for (const f of [cutsSrc, polySrc]) {
  if (!fs.existsSync(f)) {
    console.error("Falta archivo del checkpoint:", f);
    process.exit(1);
  }
}

fs.copyFileSync(cutsSrc, cutsDst);
fs.copyFileSync(polySrc, polyDst);

console.log(`Restaurado checkpoint «${meta.id}»: ${meta.label}`);
console.log("  → brevetBStripCuts.js");
console.log("  → brevetBStripPolygon.js");
console.log("Recargá el front para ver la franja.");
