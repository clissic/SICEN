import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT_ROOT = path.resolve(__dirname, "..");
const OSERP_ROOT = path.join(FRONT_ROOT, "public", "files", "OSERP");
const OUT_FILE = path.join(FRONT_ROOT, "src", "generated", "oserpFilesManifest.js");
const ALLOWED = /\.(pdf|docx?|xlsx?)$/i;

/** Construye el descriptor de un archivo a partir de su entrada de directorio. */
function describeFile(absDir, name, urlPrefix) {
  const full = path.join(absDir, name);
  let sizeBytes = 0;
  let modifiedAt = null;
  try {
    const st = fs.statSync(full);
    sizeBytes = Number.isFinite(st.size) ? st.size : 0;
    modifiedAt = st.mtime?.toISOString?.() ?? null;
  } catch {
    /* sin metadatos si stat falla */
  }
  const kind = name.toLowerCase().endsWith(".pdf")
    ? "pdf"
    : /\.docx?$/i.test(name)
      ? "word"
      : "other";
  return {
    name,
    url: `${urlPrefix}/${encodeURIComponent(name)}`,
    kind,
    sizeBytes,
    modifiedAt,
  };
}

function readCategory(subdir) {
  const absDir = path.join(OSERP_ROOT, subdir);
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && ALLOWED.test(e.name))
    .map((e) => describeFile(absDir, e.name, `/files/OSERP/${subdir}`))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
}

/** Archivos sueltos en la raíz de `public/files/OSERP` (no en subcarpetas). */
function readRootFiles() {
  let entries;
  try {
    entries = fs.readdirSync(OSERP_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && ALLOWED.test(e.name))
    .map((e) => describeFile(OSERP_ROOT, e.name, "/files/OSERP"))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
}

/** @returns {{ internacionales: object[], nacionales: object[], root: object[] }} */
export function buildOserpManifestData() {
  return {
    internacionales: readCategory("Internacionales"),
    nacionales: readCategory("Nacionales"),
    root: readRootFiles(),
  };
}

/** Escribe `src/generated/oserpFilesManifest.js` para importarlo desde el código. */
export function writeOserpManifestFile() {
  const data = buildOserpManifestData();
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    "/** Generado automáticamente. No editar a mano. */\n" +
      `export default ${JSON.stringify(data, null, 2)};\n`,
    "utf8"
  );
  return data;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const data = writeOserpManifestFile();
  console.log(
    `[oserp-manifest] ${data.internacionales.length} internacionales, ${data.nacionales.length} nacionales → ${OUT_FILE}`
  );
}
