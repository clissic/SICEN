import { logger } from "../utils/logger.js";
import {
  cancelConfirmedSportMovement,
  checkVesselAvailability,
  closeSportMovement,
  confirmSportMovement,
  createSportMovement,
  delayedAlertForUser,
  deleteSportMovement,
  findSportMovementById,
  listArrivalsForUser,
  listClosedForUser,
  listConfirmedDispatchesForUser,
  listDelayedForUser,
  listDispatchesForUser,
  renewSportMovement,
  updateSportMovement,
} from "../services/sportMovements.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 403 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const sportMovementsController = {
  async create(req, res) {
    try {
      const movement = await createSportMovement(req.body || {}, req.user);
      return res.status(201).json({
        ok: true,
        msg: "Movimiento registrado correctamente.",
        movement,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo registrar el movimiento.");
    }
  },

  async listDispatches(req, res) {
    try {
      const result = await listDispatchesForUser(req.user, req.query || {});
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar los despachos.");
    }
  },

  async listConfirmedDispatches(req, res) {
    try {
      const result = await listConfirmedDispatchesForUser(
        req.user,
        req.query || {}
      );
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron listar los despachos confirmados."
      );
    }
  },

  async listArrivals(req, res) {
    try {
      const result = await listArrivalsForUser(req.user, req.query || {});
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar los arribos.");
    }
  },

  async listDelayed(req, res) {
    try {
      const result = await listDelayedForUser(req.user, req.query || {});
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar los demorados.");
    }
  },

  async listClosed(req, res) {
    try {
      const result = await listClosedForUser(req.user, req.query || {});
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar los buques arribados.");
    }
  },

  async delayedAlert(req, res) {
    try {
      const alert = await delayedAlertForUser(req.user);
      return res.json({ ok: true, ...alert });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener la alerta de demorados.");
    }
  },

  async checkVessel(req, res) {
    try {
      const result = await checkVesselAvailability(req.params.vesselId);
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudo verificar la disponibilidad del buque."
      );
    }
  },

  async getById(req, res) {
    try {
      const movement = await findSportMovementById(req.params.id, req.user);
      return res.json({ ok: true, movement });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el movimiento.");
    }
  },

  async update(req, res) {
    try {
      const movement = await updateSportMovement(
        req.params.id,
        req.body || {},
        req.user
      );
      return res.json({
        ok: true,
        msg: "Movimiento actualizado correctamente.",
        movement,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar el movimiento.");
    }
  },

  async confirm(req, res) {
    try {
      const movement = await confirmSportMovement(req.params.id, req.user);
      return res.json({
        ok: true,
        msg: "Movimiento confirmado. Ya es visible para la prefectura de destino.",
        movement,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo confirmar el movimiento.");
    }
  },

  async renew(req, res) {
    try {
      const movement = await renewSportMovement(req.params.id, req.user);
      return res.json({
        ok: true,
        msg: "Movimiento renovado. Tiene 24 horas para confirmarlo.",
        movement,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo renovar el movimiento.");
    }
  },

  async close(req, res) {
    try {
      const movement = await closeSportMovement(
        req.params.id,
        req.body || {},
        req.user
      );
      const detail =
        movement.closureOutcome === "maritimeIncident"
          ? "Siniestrado"
          : "Arribado";
      return res.json({
        ok: true,
        msg: `Caso cerrado como ${detail}.`,
        movement,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo cerrar el caso.");
    }
  },

  async cancelConfirmed(req, res) {
    try {
      const movement = await cancelConfirmedSportMovement(
        req.params.id,
        req.body || {},
        req.user
      );
      return res.json({
        ok: true,
        msg: "Movimiento confirmado eliminado correctamente.",
        movement,
      });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudo eliminar el movimiento confirmado."
      );
    }
  },

  async remove(req, res) {
    try {
      const result = await deleteSportMovement(req.params.id, req.user);
      return res.json({
        ok: true,
        msg: "Movimiento eliminado correctamente.",
        deletedId: result.id,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar el movimiento.");
    }
  },
};
