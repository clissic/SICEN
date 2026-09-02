import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VESSEL_ADMIN_PROOF_DIR = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "vesselAdminProofs"
);

export function ensureVesselAdminProofDirSync() {
  try {
    fs.mkdirSync(VESSEL_ADMIN_PROOF_DIR, { recursive: true });
  } catch (e) {
    logger.error("ensureVesselAdminProofDirSync: " + e);
  }
}

export function deleteVesselAdminProofFile(storedName) {
  const name = String(storedName || "").trim();
  if (
    !name ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    return;
  }
  ensureVesselAdminProofDirSync();
  const absolute = path.join(VESSEL_ADMIN_PROOF_DIR, name);
  const resolvedRoot = path.resolve(VESSEL_ADMIN_PROOF_DIR);
  if (!absolute.startsWith(resolvedRoot)) return;
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (e) {
    logger.warn("deleteVesselAdminProofFile: " + e);
  }
}

export function resolveVesselAdminProofAbsolute(storedName) {
  const name = String(storedName || "").trim();
  if (
    !name ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    return null;
  }
  ensureVesselAdminProofDirSync();
  const absolute = path.join(VESSEL_ADMIN_PROOF_DIR, name);
  const resolvedRoot = path.resolve(VESSEL_ADMIN_PROOF_DIR);
  if (!absolute.startsWith(resolvedRoot)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}
