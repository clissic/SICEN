import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { UnitMongoose } from "../DAO/models/mongoose/units.mongoose.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "../public");
const FRONT_PUBLIC = path.resolve(
  path.join(__dirname, "../../../SICEN-front/public")
);

const ESCUDO_SUBDIR = path.join("img", "ESCUDO-UNIDADES-PNN");

function escudoTargets(siglaUpper) {
  const file = `${siglaUpper}.png`;
  return [
    path.join(CLIENT_DIST, ESCUDO_SUBDIR, file),
    path.join(FRONT_PUBLIC, ESCUDO_SUBDIR, file),
  ];
}

export function writeShieldPng(siglaUpper, buffer) {
  for (const dest of escudoTargets(siglaUpper)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buffer);
  }
}

export function deleteShieldPngFiles(siglaUpper) {
  for (const dest of escudoTargets(siglaUpper)) {
    try {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
    } catch {
      /* ignore */
    }
  }
}

/** Renombra SIGLA.png en ambas rutas públicas (sin subir archivo nuevo). */
export function renameShieldFiles(oldSiglaUpper, newSiglaUpper) {
  if (oldSiglaUpper === newSiglaUpper) return;
  const oldPaths = escudoTargets(oldSiglaUpper);
  const newPaths = escudoTargets(newSiglaUpper);
  for (let i = 0; i < oldPaths.length; i++) {
    const from = oldPaths[i];
    const to = newPaths[i];
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (!fs.existsSync(from)) continue;
    if (fs.existsSync(to)) fs.unlinkSync(to);
    fs.renameSync(from, to);
  }
}

export function shieldPublicUrl(siglaUpper) {
  return `/img/ESCUDO-UNIDADES-PNN/${encodeURIComponent(siglaUpper)}.png`;
}

/** Escudo genérico cuando no se sube archivo en el alta de unidad. */
export const FALLBACK_SHIELD_SIGLA = "PRENA";

export function fallbackShieldPublicUrl() {
  return shieldPublicUrl(FALLBACK_SHIELD_SIGLA);
}

export async function findUnitByAcronym(acronymUpper) {
  return UnitMongoose.findOne({ acronym: acronymUpper }).lean();
}

/** Solo comprueba duplicados en la colección `units`. */
export async function acronymExists(acronymUpper) {
  const doc = await UnitMongoose.findOne({ acronym: acronymUpper })
    .select("_id")
    .lean();
  return !!doc;
}

/** True si otra unidad (distinto `_id`) ya usa esa sigla. */
export async function acronymTakenByOther(acronymUpper, excludeMongoId) {
  const doc = await UnitMongoose.findOne({
    acronym: acronymUpper,
    _id: { $ne: excludeMongoId },
  })
    .select("_id")
    .lean();
  return !!doc;
}

export async function createUnitDocument(payload) {
  const doc = await UnitMongoose.create(payload);
  return doc.toObject();
}
