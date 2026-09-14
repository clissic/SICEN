import { randomUUID } from "crypto";
import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";

const JOB_TTL_MS = 60 * 60 * 1000;
const MAX_JOBS = 100;
const ALLOWED_HORIZONS = new Set([6, 12, 24]);
const OIL_IDS = new Set(["diesel", "ifo180", "crude_light", "crude_heavy"]);

/** @type {Map<string, object>} */
const jobs = new Map();

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

export function isHcSimEnabled() {
  return Boolean(env.hcSimEnabled && String(env.hcSimUrl || "").trim());
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

export async function getHcStatus() {
  const configured = isHcSimEnabled();
  const worker = configured
    ? await pingWorker()
    : { ok: false, detail: "HC_SIM_ENABLED off" };
  return {
    enabled: configured,
    workerOk: Boolean(worker.ok),
    workerDetail: worker.detail,
    urlConfigured: Boolean(String(env.hcSimUrl || "").trim()),
    url: configured ? String(env.hcSimUrl).replace(/\/+$/, "") : null,
    oils: [
      { id: "diesel", label: "Diesel / gasoil" },
      { id: "ifo180", label: "Fuel oil intermedio (IFO 180)" },
      { id: "crude_light", label: "Crudo genérico liviano" },
      { id: "crude_heavy", label: "Crudo genérico pesado" },
    ],
    horizons: [6, 12, 24],
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
  const volumeM3 = Number(body.volumeM3);
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0 || volumeM3 > 50_000) {
    throw httpError("Volumen inválido (m³).", 400);
  }
  const oilTypeId = String(body.oilTypeId || "diesel").trim();
  if (!OIL_IDS.has(oilTypeId)) {
    throw httpError("Tipo de HC no soportado.", 400);
  }
  const horizonHours = Number(body.horizonHours || 12);
  if (!ALLOWED_HORIZONS.has(horizonHours)) {
    throw httpError("Horizonte inválido (6, 12 o 24 h).", 400);
  }
  const releaseDurationHours = Number(body.releaseDurationHours || 0);
  if (
    !Number.isFinite(releaseDurationHours) ||
    releaseDurationHours < 0 ||
    releaseDurationHours > 48
  ) {
    throw httpError("Duración de liberación inválida.", 400);
  }
  const numParticles = Math.min(
    5000,
    Math.max(50, Number(body.numParticles) || 2000)
  );
  return {
    lat,
    lon,
    volumeM3,
    oilTypeId,
    horizonHours,
    releaseDurationHours,
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
    const res = await fetch(`${base}/run`, {
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
      throw httpError("SICEN-sim: timeout de simulación.", 504);
    }
    if (e.status) throw e;
    throw httpError(`SICEN-sim no disponible: ${e.message || e}`, 503);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Encola una simulación y la ejecuta en background.
 * @param {object} body
 * @param {{ userId?: string }} meta
 */
export function enqueueHcSimulation(body, meta = {}) {
  if (!isHcSimEnabled()) {
    throw httpError(
      "Simulador HC deshabilitado. Configurá HC_SIM_ENABLED=true y HC_SIM_URL.",
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
          budget: result.budget || null,
          meta: result.meta || null,
        };
        current.updatedAt = Date.now();
      } catch (e) {
        current.status = "error";
        current.error = e.message || String(e);
        current.updatedAt = Date.now();
        logger.warning(`HC sim job ${id}: ${current.error}`);
      }
    })();
  });

  return { jobId: id, status: "pending" };
}

export function getHcJob(jobId) {
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
