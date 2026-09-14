import {
  getSkylightStatus,
  getSkylightVesselDossier,
  searchSkylightAois,
  searchSkylightEvents,
  searchSkylightFrames,
} from "../services/skylightProxy.service.js";
import { logger } from "../utils/logger.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (
    code === 400 ||
    code === 403 ||
    code === 404 ||
    code === 409 ||
    code === 502 ||
    code === 503
  ) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: e.message || fallbackMsg });
}

export const skylightController = {
  status(req, res) {
    try {
      return res.json({ ok: true, ...getSkylightStatus() });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado de Skylight.");
    }
  },

  async events(req, res) {
    try {
      const {
        eventTypes,
        darkOnly,
        lookbackHours,
        limit,
        aoiIds,
      } = req.body ?? {};
      const result = await searchSkylightEvents({
        eventTypes,
        darkOnly,
        lookbackHours,
        limit,
        aoiIds,
      });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron obtener eventos de Skylight.");
    }
  },

  async frames(req, res) {
    try {
      const { lookbackHours, limit, eventTypes } = req.body ?? {};
      const result = await searchSkylightFrames({
        lookbackHours,
        limit,
        eventTypes,
      });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron obtener las pasadas satelitales."
      );
    }
  },

  async aois(req, res) {
    try {
      const { limit } = req.body ?? {};
      const result = await searchSkylightAois({ limit });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron obtener las AOIs de Skylight.");
    }
  },

  async vesselDossier(req, res) {
    try {
      const { mmsi, lat, lon, speedKts, heading, lookbackHours } =
        req.body ?? {};
      const result = await getSkylightVesselDossier({
        mmsi,
        lat,
        lon,
        speedKts,
        heading,
        lookbackHours,
      });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudo obtener el dossier del buque en Skylight."
      );
    }
  },
};
