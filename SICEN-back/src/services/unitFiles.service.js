import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "../public");

/** Subcarpeta bajo cada división: `.../DIV-I/Procedimientos`, `.../DIV-II/Procedimientos`. */
export const PROCEDIMIENTOS_SUBDIR = "Procedimientos";

export const UNIT_FILES_PROC_DIVISIONS = Object.freeze(
  new Set(["DIV-I", "DIV-II"])
);

/** Repo: `SICEN/SICEN-front/...` (desde este archivo: `src/services` → subir 3 niveles). */
const FRONT_UNITS_ROOT = path.resolve(
  path.join(__dirname, "../../../SICEN-front/public/files/units")
);
const DIST_UNITS_ROOT = path.join(CLIENT_DIST, "files", "units");

/**
 * Renombra `public/files/units/<viejaSigla>/` → `<nuevaSigla>/` en front y back si existe.
 */
export function renameUnitsFilesFolder(oldUnitUpper, newUnitUpper) {
  if (oldUnitUpper === newUnitUpper) return;
  for (const root of [FRONT_UNITS_ROOT, DIST_UNITS_ROOT]) {
    const from = path.join(root, oldUnitUpper);
    const to = path.join(root, newUnitUpper);
    try {
      if (!fs.existsSync(from) || !fs.statSync(from).isDirectory()) continue;
      fs.mkdirSync(root, { recursive: true });
      if (fs.existsSync(to)) {
        throw new Error(
          `Ya existe carpeta de archivos para la unidad ${newUnitUpper}. Elimine o fusione antes de renombrar.`
        );
      }
      fs.renameSync(from, to);
    } catch (e) {
      if (e.code === "ENOENT") continue;
      throw e;
    }
  }
}

function pathPartsFor(divisionDir) {
  return [divisionDir, PROCEDIMIENTOS_SUBDIR];
}

function procedimientosDir(unitsRoot, unit, divisionDir) {
  return path.resolve(path.join(unitsRoot, unit, ...pathPartsFor(divisionDir)));
}

function normalizeUnitFolder(unit) {
  const u = typeof unit === "string" ? unit.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{4,6}$/.test(u)) {
    return null;
  }
  return u;
}

function resolveUnitsRoot(unit, divisionDir) {
  const candidates = [FRONT_UNITS_ROOT, DIST_UNITS_ROOT];
  for (const root of candidates) {
    const dir = procedimientosDir(root, unit, divisionDir);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      return path.resolve(root);
    }
  }
  for (const root of candidates) {
    if (fs.existsSync(root)) {
      return path.resolve(root);
    }
  }
  return path.resolve(DIST_UNITS_ROOT);
}

function fileKind(fileName) {
  const n = fileName.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".doc")) return "doc";
  return null;
}

function listDocsRecursive(absDir, baseDir, out) {
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return;
  for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
    const full = path.join(absDir, e.name);
    if (e.isDirectory()) {
      listDocsRecursive(full, baseDir, out);
      continue;
    }
    const kind = fileKind(e.name);
    if (!kind) continue;
    const relativePath = path.relative(baseDir, full).split(path.sep).join("/");
    out.push({ name: e.name, relativePath, kind });
  }
}

export function procedimientoPublicUrl(unit, divisionDir, relativePosix) {
  const segs = [
    "files",
    "units",
    unit,
    ...pathPartsFor(divisionDir),
    ...relativePosix.split("/").filter(Boolean),
  ];
  return `/${segs.map((s) => encodeURIComponent(s)).join("/")}`;
}

/**
 * Lista .doc, .docx y .pdf bajo `files/units/<unit>/<divisionDir>/Procedimientos`.
 * @param {string} divisionDir `DIV-I` | `DIV-II`
 */
export function listProcedimientosFiles(unit, divisionDir) {
  const u = normalizeUnitFolder(unit);
  if (!u) {
    return { error: "invalid_unit", files: [] };
  }
  if (!UNIT_FILES_PROC_DIVISIONS.has(divisionDir)) {
    return { error: "invalid_division", files: [] };
  }

  const unitsRoot = resolveUnitsRoot(u, divisionDir);
  const unitRoot = path.resolve(path.join(unitsRoot, u));
  const target = path.resolve(path.join(unitRoot, ...pathPartsFor(divisionDir)));
  const rel = path.relative(unitRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return { error: "path", files: [] };
  }

  const raw = [];
  listDocsRecursive(target, target, raw);
  const files = raw
    .map((f) => ({
      ...f,
      url: procedimientoPublicUrl(u, divisionDir, f.relativePath),
    }))
    .sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath, "es", { sensitivity: "base" })
    );

  return { error: null, files };
}

export function listProcedimientosDivIFiles(unit) {
  return listProcedimientosFiles(unit, "DIV-I");
}

export function listProcedimientosDivIIFiles(unit) {
  return listProcedimientosFiles(unit, "DIV-II");
}

const INVALID_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Crea si hace falta `files/units/<unit>/<divisionDir>/Procedimientos` y devuelve la ruta absoluta.
 */
export function ensureProcedimientosDir(unit, divisionDir) {
  const u = normalizeUnitFolder(unit);
  if (!u) {
    throw new Error("INVALID_UNIT");
  }
  if (!UNIT_FILES_PROC_DIVISIONS.has(divisionDir)) {
    throw new Error("INVALID_DIVISION");
  }

  const unitsRoot = resolveUnitsRoot(u, divisionDir);
  const unitRoot = path.resolve(path.join(unitsRoot, u));
  const target = path.resolve(path.join(unitRoot, ...pathPartsFor(divisionDir)));
  const rel = path.relative(unitRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("PATH");
  }
  fs.mkdirSync(target, { recursive: true });
  return target;
}

export function sanitizeUploadFilename(originalname) {
  let base = path.basename(originalname || "documento");
  base = base.replace(INVALID_NAME_CHARS, "_").replace(/\s+/g, " ").trim();
  if (!base || base === "." || base === "..") {
    base = "documento.pdf";
  }
  let ext = path.extname(base).toLowerCase();
  const allowed = [".pdf", ".doc", ".docx"];
  if (!allowed.includes(ext)) {
    ext = ".pdf";
  }
  let stem = path.basename(base, path.extname(base)) || "documento";
  stem = stem.slice(0, 180);
  return `${stem}${ext}`;
}

export function uniqueFilenameInDir(dir, filename) {
  const abs = path.join(dir, filename);
  if (!fs.existsSync(abs)) {
    return filename;
  }
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  let n = 1;
  let candidate;
  do {
    candidate = `${stem}_${n}${ext}`;
    n += 1;
  } while (fs.existsSync(path.join(dir, candidate)) && n < 10000);
  return candidate;
}

/**
 * Ruta relativa segura bajo Procedimientos (segmentos sin `..`).
 * @returns {string | null}
 */
export function normalizeProcedimientoRelativePath(raw) {
  if (raw == null || typeof raw !== "string") {
    return null;
  }
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) {
    return null;
  }
  const parts = decoded
    .replace(/\\/g, "/")
    .split("/")
    .filter((p) => p.length > 0);
  for (const p of parts) {
    if (p === "." || p === "..") {
      return null;
    }
    if (p.length > 200) {
      return null;
    }
  }
  if (parts.length === 0 || parts.length > 32) {
    return null;
  }
  return parts.join("/");
}

/**
 * Borra un archivo bajo `Procedimientos` si existe y es .pdf/.doc/.docx.
 */
export function deleteProcedimientoFile(unit, divisionDir, relativePosixRaw) {
  const u = normalizeUnitFolder(unit);
  if (!u) {
    return { error: "invalid_unit" };
  }
  if (!UNIT_FILES_PROC_DIVISIONS.has(divisionDir)) {
    return { error: "invalid_division" };
  }

  const norm = normalizeProcedimientoRelativePath(relativePosixRaw);
  if (!norm) {
    return { error: "invalid_path" };
  }

  const baseDir = ensureProcedimientosDir(u, divisionDir);
  const absFile = path.resolve(path.join(baseDir, ...norm.split("/")));
  const relFromBase = path.relative(baseDir, absFile);
  if (relFromBase.startsWith("..") || path.isAbsolute(relFromBase)) {
    return { error: "path" };
  }

  if (!fs.existsSync(absFile)) {
    return { error: "not_found" };
  }
  const stat = fs.statSync(absFile);
  if (!stat.isFile()) {
    return { error: "not_file" };
  }
  if (!fileKind(path.basename(absFile))) {
    return { error: "invalid_type" };
  }

  fs.unlinkSync(absFile);
  return { error: null };
}
