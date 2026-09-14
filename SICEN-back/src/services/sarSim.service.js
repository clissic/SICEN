import { randomUUID } from "crypto";
import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";

const JOB_TTL_MS = 60 * 60 * 1000;
const MAX_JOBS = 100;
const ALLOWED_HORIZONS = new Set([6, 12, 24, 48]);
const OBJECT_IDS = new Set([
  "piw_unknown",
  "piw_pfd",
  "piw_deceased_surface",
  "piw_deceased_submerged",
  "kayak",
  "liferaft",
  "small_boat",
  "fishing_vessel",
]);

const DEFAULT_OBJECTS = [
  {
    id: "piw_unknown",
    label: "Persona en agua (estado desconocido)",
    category: "person",
    startsSubmerged: false,
  },
  {
    id: "piw_pfd",
    label: "Persona con chaleco (consciente)",
    category: "person",
    startsSubmerged: false,
  },
  {
    id: "piw_deceased_surface",
    label: "Persona fallecida (flotando)",
    category: "person",
    startsSubmerged: false,
  },
  {
    id: "piw_deceased_submerged",
    label: "Persona fallecida (hundida → reaparece)",
    category: "person",
    startsSubmerged: true,
  },
  {
    id: "kayak",
    label: "Kayak / embarcación chica",
    category: "craft",
    startsSubmerged: false,
  },
  {
    id: "liferaft",
    label: "Balsa salvavidas (valores medios)",
    category: "craft",
    startsSubmerged: false,
  },
  {
    id: "small_boat",
    label: "Bote / lancha",
    category: "craft",
    startsSubmerged: false,
  },
  {
    id: "fishing_vessel",
    label: "Buque pesquero / mayor",
    category: "craft",
    startsSubmerged: false,
  },
];

/** @type {Map<string, object>} */
const jobs = new Map();

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

export function isSarSimEnabled() {
  return Boolean(env.sarSimEnabled && String(env.hcSimUrl || "").trim());
}

async function pingWorker() {
  const base = String(env.hcSimUrl || "").replace(/\/+$/, "");
  if (!base) return { ok: false, detail: "Sin HC_SIM_URL" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${base}/health`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    return { ok: true, detail: "ok" };
  } catch (e) {
    return { ok: false, detail: e?.message || String(e) };
  }
}

async function fetchObjectsFromWorker() {
  const base = String(env.hcSimUrl || "").replace(/\/+$/, "");
  if (!base) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${base}/sar-objects`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.objects) && data.objects.length) return data.objects;
  } catch {
    /* fallback local */
  }
  return null;
}

export async function getSarStatus() {
  const configured = isSarSimEnabled();
  const worker = configured
    ? await pingWorker()
    : { ok: false, detail: "SAR_SIM_ENABLED off" };
  const objects =
    configured && worker.ok
      ? (await fetchObjectsFromWorker()) || DEFAULT_OBJECTS
      : DEFAULT_OBJECTS;
  return {
    enabled: configured,
    workerOk: Boolean(worker.ok),
    workerDetail: worker.detail,
    urlConfigured: Boolean(String(env.hcSimUrl || "").trim()),
    url: configured ? String(env.hcSimUrl).replace(/\/+$/, "") : null,
    objects,
    horizons: [6, 12, 24, 48],
  };
}

function pruneJobs(now = Date.now()) {
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
  while (jobs.size > MAX_JOBS) {
    const first = jobs.keys().next().value;
    jobs.delete(first);
  }
}

function validateBody(body = {}) {
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw httpError("Latitud inválida.", 400);
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw httpError("Longitud inválida.", 400);
  }
  const objectTypeId = String(body.objectTypeId || "piw_unknown").trim();
  if (!OBJECT_IDS.has(objectTypeId)) {
    throw httpError("Tipo de objeto SAR no soportado.", 400);
  }
  const horizonHours = Number(body.horizonHours || 12);
  if (!ALLOWED_HORIZONS.has(horizonHours)) {
    throw httpError("Horizonte inválido (6, 12, 24 o 48 h).", 400);
  }
  const uncertaintyRadiusM = Number(body.uncertaintyRadiusM ?? 500);
  if (
    !Number.isFinite(uncertaintyRadiusM) ||
    uncertaintyRadiusM < 0 ||
    uncertaintyRadiusM > 50_000
  ) {
    throw httpError("Radio de incertidumbre inválido.", 400);
  }
  const numParticles = Math.min(
    5000,
    Math.max(50, Number(body.numParticles) || 2000)
  );
  return {
    lat,
    lon,
    objectTypeId,
    horizonHours,
    uncertaintyRadiusM,
    numParticles,
    startTime: body.startTime || new Date().toISOString(),
    constantForcing: Boolean(body.constantForcing),
  };
}

async function callWorker(payload) {
  const base = env.hcSimUrl.replace(/\/+$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), env.hcSimTimeoutMs || 120_000);
  try {
    const res = await fetch(`${base}/run-sar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw httpError(`SICEN-sim respuesta no JSON (${res.status}).`, 502);
    }
    if (!res.ok || data?.ok === false) {
      throw httpError(
        data?.detail || data?.msg || `SICEN-sim HTTP ${res.status}`,
        res.status >= 400 && res.status < 600 ? res.status : 502
      );
    }
    return data;
  } catch (e) {
    if (e.name === "AbortError") {
      throw httpError("SICEN-sim: timeout de simulación SAR.", 504);
    }
    if (e.status) throw e;
    throw httpError(`SICEN-sim no disponible: ${e.message || e}`, 503);
  } finally {
    clearTimeout(timer);
  }
}

export function enqueueSarSimulation(body, meta = {}) {
  if (!isSarSimEnabled()) {
    throw httpError(
      "Simulador SAR deshabilitado. Configurá SAR_SIM_ENABLED=true y HC_SIM_URL.",
      503
    );
  }
  const payload = validateBody(body);
  pruneJobs();
  const id = randomUUID();
  const job = {
    id,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userId: meta.userId || null,
    input: payload,
    result: null,
    error: null,
  };
  jobs.set(id, job);

  setImmediate(() => {
    void (async () => {
      const current = jobs.get(id);
      if (!current) return;
      current.status = "running";
      current.updatedAt = Date.now();
      try {
        const result = await callWorker(payload);
        current.status = "done";
        current.result = {
          timesteps: result.timesteps || [],
          contours: result.contours || [],
          meta: result.meta || null,
        };
        current.updatedAt = Date.now();
      } catch (e) {
        current.status = "error";
        current.error = e.message || String(e);
        current.updatedAt = Date.now();
        logger.warning(`SAR sim job ${id}: ${current.error}`);
      }
    })();
  });

  return { jobId: id, status: "pending" };
}

export function getSarJob(jobId) {
  pruneJobs();
  const job = jobs.get(String(jobId || ""));
  if (!job) throw httpError("Job no encontrado.", 404);
  return {
    jobId: job.id,
    status: job.status,
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
    input: job.input,
    error: job.error,
    result: job.status === "done" ? job.result : null,
  };
}
