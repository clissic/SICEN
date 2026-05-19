import { logger } from "../utils/logger.js";
import {
  createShipFine,
  deleteShipFineById,
  listShipFinesByVessel,
  updateShipFineByNumber,
} from "../services/shipFines.service.js";
import { shipFinesModel } from "../DAO/models/shipFines.model.js";

export const shipFinesController = {
  async create(req, res) {
    try {
      const created = await createShipFine(req.body || {}, req.user);
      return res.status(201).json({
        ok: true,
        msg: `Multa N° ${created.fine_number} registrada.`,
        payload: created,
      });
    } catch (e) {
      const code = e?.statusCode;
      if (code === 400 || code === 404) {
        return res.status(code).json({ ok: false, msg: e.message });
      }
      logger.error("shipFines.create: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo registrar la multa del buque.",
      });
    }
  },

  async listByVessel(req, res) {
    try {
      const vesselId =
        req.params.vesselId != null ? String(req.params.vesselId).trim() : "";
      if (!vesselId) {
        return res.status(400).json({
          ok: false,
          msg: "Indique el identificador del buque.",
        });
      }
      const items = await listShipFinesByVessel(vesselId);
      if (items === null) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      return res.status(200).json({ ok: true, payload: items });
    } catch (e) {
      logger.error("shipFines.listByVessel: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudieron listar las multas del buque.",
      });
    }
  },

  async findById(req, res) {
    try {
      const fine = await shipFinesModel.findById(req.params.id);
      if (!fine) {
        return res.status(404).json({ ok: false, msg: "Multa no encontrada." });
      }
      return res.status(200).json({ ok: true, payload: fine });
    } catch (e) {
      logger.error("shipFines.findById: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo obtener la multa.",
      });
    }
  },

  async updateByNumber(req, res) {
    try {
      const fine_number = req.params.fine_number;
      const updated = await updateShipFineByNumber(
        fine_number,
        req.body || {},
        req.user,
      );
      if (!updated) {
        return res.status(404).json({ ok: false, msg: "Multa no encontrada." });
      }
      return res.status(200).json({
        ok: true,
        msg: "Multa actualizada.",
        payload: updated,
      });
    } catch (e) {
      const code = e?.statusCode;
      if (code === 400 || code === 404) {
        return res.status(code).json({ ok: false, msg: e.message });
      }
      logger.error("shipFines.updateByNumber: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo actualizar la multa.",
      });
    }
  },

  async deleteById(req, res) {
    try {
      const deleted = await deleteShipFineById(req.params.id);
      return res.status(200).json({
        ok: true,
        msg: "Multa eliminada.",
        payload: deleted,
      });
    } catch (e) {
      const code = e?.statusCode;
      if (code === 404) {
        return res.status(code).json({ ok: false, msg: e.message });
      }
      logger.error("shipFines.deleteById: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo eliminar la multa.",
      });
    }
  },
};
