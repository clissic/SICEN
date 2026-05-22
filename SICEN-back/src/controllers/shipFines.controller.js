import { ShipFinesMongoose } from "../DAO/models/mongoose/shipFines.mongoose.js";
import { shipFinesServices } from "../services/shipFines.service.js";
import {
  applyProveUpdatesForFine,
  deleteStoredProveFiles,
  renameProveFilesByFineNumber,
} from "../utils/shipFineProveFiles.js";
import { logger } from "../utils/logger.js";
import ShipFineDTO from "./DTO/shipFine.dto.js";

class ShipFinesController {
  async getAll(req, res) {
    try {
      const shipFines = await shipFinesServices.getAll();
      if (shipFines) {
        return res.status(200).json({
          status: "success",
          msg: "All ship fines found",
          payload: shipFines,
        });
      }
      return res.status(404).json({
        status: "failed",
        msg: "Ship fines not found",
        payload: [],
      });
    } catch (e) {
      logger.error("Error on shipFinesController.getAll: " + e);
      return res
        .status(500)
        .json({ status: "error", msg: "Server error", payload: [] });
    }
  }

  async findById(req, res) {
    try {
      const user = req.user;
      const { id } = req.params;
      const shipFine = await shipFinesServices.findById(id);
      if (!shipFine) {
        return res.status(404).json({
          status: "failed",
          msg: "Ship fine not found by ID",
          payload: [],
        });
      }
      const privileged = ["admin", "superAdmin", "contable"].includes(
        user.role
      );
      const isAuthor =
        shipFine.fine_author && shipFine.fine_author === user.email;
      if (!privileged && !isAuthor) {
        return res.status(403).json({
          status: "error",
          msg: "No autorizado a consultar esta multa.",
          payload: [],
        });
      }
      return res.status(200).json({
        status: "success",
        msg: "Ship fine found by ID",
        payload: shipFine,
      });
    } catch (e) {
      logger.error("Error on shipFinesController.findById: " + e);
      return res
        .status(500)
        .json({ status: "error", msg: "Server error", payload: [] });
    }
  }

  async createAndRender(req, res) {
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    let fine_proves = [];
    try {
      const fine_author = req.user.email;
      const last_modified_by = "S/M";
      const {
        fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        omi,
        ship_reg_number,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
      } = req.body;

      if (uploadedFiles.length === 0) {
        return res.status(400).json({
          status: "failed",
          msg: "Debe adjuntar al menos una foto de prueba (.jpg, hasta 5 MB).",
          payload: {},
        });
      }

      const omiNumber = Number(omi);
      if (!Number.isFinite(omiNumber) || omiNumber <= 0) {
        deleteStoredProveFiles(
          uploadedFiles.map(
            (f) => `/uploads/shipFineProves/${f.filename}`
          )
        );
        return res.status(400).json({
          status: "failed",
          msg: "El número OMI debe ser un valor numérico mayor a 0.",
          payload: {},
        });
      }

      const fine_number = await shipFinesServices.getNextFineNumber();
      fine_proves = renameProveFilesByFineNumber(uploadedFiles, fine_number);

      const shipFineDTO = new ShipFineDTO(
        fine_number,
        fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        fine_author,
        fine_proves,
        omiNumber,
        ship_reg_number,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
        last_modified_by
      );
      const shipFineCreated = await shipFinesServices.create(shipFineDTO);
      logger.info(
        `Ship fine: ${JSON.stringify(shipFineCreated)} created by ${fine_author}`
      );
      if (shipFineCreated) {
        return res.status(201).json({
          status: "success",
          msg: `Multa N° ${shipFineCreated.fine_number} creada correctamente.`,
          payload: shipFineCreated,
        });
      }
      deleteStoredProveFiles(fine_proves);
      return res.status(400).json({
        status: "failed",
        msg: "Algunas propiedades son incorrectas en la creación de la multa de buque.",
        payload: {},
      });
    } catch (e) {
      deleteStoredProveFiles(fine_proves);
      logger.error("Error on shipFinesController.createAndRender: " + e);
      return res
        .status(500)
        .json({ status: "error", msg: "Server error", payload: {} });
    }
  }

  async mine(req, res) {
    try {
      const user = req.user;
      const userFines = await shipFinesServices.findByEmail(user.email);
      const filteredUserFines = (userFines || []).map((fine) => ({
        _id: fine._id,
        fine_number: fine.fine_number,
        fine_date: fine.fine_date,
        fine_time: fine.fine_time,
        fine_article: fine.fine_article,
        fine_amount: fine.fine_amount,
        fine_extra_amount: fine.fine_extra_amount,
        fine_author: fine.fine_author,
        fine_proves: fine.fine_proves,
        fine_status: fine.fine_status,
        omi: fine.omi,
        ship_reg_number: fine.ship_reg_number,
        owner_ci: fine.owner_ci,
        owner_name: fine.owner_name,
        owner_tel: fine.owner_tel,
        owner_dir: fine.owner_dir,
      }));
      return res
        .status(200)
        .json({ status: "success", payload: filteredUserFines });
    } catch (e) {
      logger.error("Error on shipFinesController.mine: " + e);
      return res.status(500).json({ status: "error", msg: "Server error" });
    }
  }

  async paginateList(req, res) {
    try {
      let {
        currentPage,
        pageSize,
        sort,
        fine_number,
        fine_date,
        fine_article,
        fine_amount,
        fine_author,
        fine_status,
        omi,
        ship_reg_number,
        owner_ci,
        owner_name,
      } = req.query;
      const sortOption =
        sort === "asc"
          ? { fine_date: 1 }
          : sort === "desc"
            ? { fine_date: -1 }
            : {};

      const options = {
        sort: sortOption,
        limit: parseInt(pageSize, 10) || 10,
        page: parseInt(currentPage, 10) || 1,
      };

      const mongooseFilter = {};
      if (fine_number) mongooseFilter.fine_number = fine_number;
      if (fine_date) {
        mongooseFilter.fine_date = { $regex: new RegExp(fine_date) };
      }
      if (fine_article) {
        mongooseFilter.fine_article = { $regex: new RegExp(fine_article, "i") };
      }
      if (fine_amount) mongooseFilter.fine_amount = fine_amount;
      if (fine_author) {
        mongooseFilter.fine_author = { $regex: new RegExp(fine_author, "i") };
      }
      if (fine_status) mongooseFilter.fine_status = fine_status;
      if (omi) mongooseFilter.omi = omi;
      if (ship_reg_number) {
        mongooseFilter.ship_reg_number = {
          $regex: new RegExp(ship_reg_number, "i"),
        };
      }
      if (owner_ci) {
        mongooseFilter.owner_ci = { $regex: new RegExp(owner_ci) };
      }
      if (owner_name) {
        mongooseFilter.owner_name = { $regex: new RegExp(owner_name, "i") };
      }

      const queryResult = await ShipFinesMongoose.paginate(
        mongooseFilter,
        options
      );

      const paginatedFines = queryResult.docs.map((fine) => ({
        _id: fine._id,
        fine_number: fine.fine_number,
        fine_date: fine.fine_date,
        fine_time: fine.fine_time,
        fine_article: fine.fine_article,
        fine_amount: fine.fine_amount,
        fine_extra_amount: fine.fine_extra_amount,
        fine_author: fine.fine_author,
        fine_proves: fine.fine_proves,
        fine_status: fine.fine_status,
        omi: fine.omi,
        ship_reg_number: fine.ship_reg_number,
        owner_ci: fine.owner_ci,
        owner_name: fine.owner_name,
        owner_tel: fine.owner_tel,
        owner_dir: fine.owner_dir,
      }));

      const {
        totalDocs,
        limit,
        totalPages,
        page,
        pagingCounter,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
      } = queryResult;

      return res.status(200).json({
        status: "success",
        msg: "Ship fines list",
        payload: {
          paginatedFines,
          totalDocs,
          limit,
          totalPages,
          prevPage,
          nextPage,
          page,
          hasPrevPage,
          hasNextPage,
          pagingCounter,
        },
      });
    } catch (error) {
      logger.error("Error getting ship fines and pagination: " + error);
      return res.status(500).json({
        status: "error",
        msg: "Error getting ship fines and pagination.",
      });
    }
  }

  async deleteOne(req, res) {
    try {
      const { id } = req.params;
      const shipFineDeleted = await shipFinesServices.deleteOne(id);
      if (shipFineDeleted) {
        return res.status(200).json({
          status: "success",
          msg: "Ship fine deleted",
          payload: shipFineDeleted,
        });
      }
      return res.status(404).json({
        status: "failed",
        msg: "Ship fine to delete not found",
        payload: {},
      });
    } catch (e) {
      logger.error("Error on shipFinesController.deleteOne: " + e);
      return res
        .status(500)
        .json({ status: "error", msg: "Server error", payload: [] });
    }
  }

  async findByNumberAndRenderForUpdate(req, res) {
    try {
      const { fine_number } = req.query;
      const shipFine = await shipFinesServices.findByNumber(fine_number);
      if (shipFine) {
        return res.status(200).json({ ok: true, shipFine });
      }
      return res.status(404).json({
        ok: false,
        msg: "Multa no encontrada. Verifique la numeración.",
      });
    } catch (e) {
      logger.error(
        "Error on shipFinesController.findByNumberAndRenderForUpdate: " + e
      );
      return res
        .status(500)
        .json({ ok: false, msg: "Error del servidor al buscar la multa." });
    }
  }

  async findByNumberAndUpdate(req, res) {
    const user = req.user;
    const { fine_number } = req.params;
    const updatedShipFine = { ...req.query, ...req.body };
    delete updatedShipFine.fine_number;
    delete updatedShipFine.prove_slot_1_action;
    delete updatedShipFine.prove_slot_2_action;
    delete updatedShipFine.prove_slot_3_action;
    updatedShipFine.last_modified_by = user.email;

    if (typeof updatedShipFine.fine_amount === "string") {
      const n = Number(updatedShipFine.fine_amount);
      if (!Number.isNaN(n)) updatedShipFine.fine_amount = n;
    }
    if (typeof updatedShipFine.fine_extra_amount === "string") {
      const n = Number(updatedShipFine.fine_extra_amount);
      if (!Number.isNaN(n)) updatedShipFine.fine_extra_amount = n;
    }
    if (typeof updatedShipFine.omi === "string") {
      const n = Number(updatedShipFine.omi);
      if (!Number.isNaN(n)) updatedShipFine.omi = n;
    }

    const reqFiles = req.files;
    const filesBySlot = [null, null, null];
    if (reqFiles && !Array.isArray(reqFiles)) {
      for (let i = 0; i < 3; i++) {
        const arr = reqFiles[`prove_slot_${i + 1}`];
        if (Array.isArray(arr) && arr[0]) filesBySlot[i] = arr[0];
      }
    }
    const slotActions = [
      String(req.body?.prove_slot_1_action || "").toLowerCase(),
      String(req.body?.prove_slot_2_action || "").toLowerCase(),
      String(req.body?.prove_slot_3_action || "").toLowerCase(),
    ];
    const hasProveChanges = slotActions.some(
      (a) => a === "replace" || a === "remove"
    );

    let cleanupFiles = filesBySlot
      .filter(Boolean)
      .map((f) => `${"/uploads/shipFineProves/"}${f.filename}`);

    try {
      if (hasProveChanges) {
        const current = await shipFinesServices.findByNumber(fine_number);
        if (!current) {
          deleteStoredProveFiles(cleanupFiles);
          return res.status(404).json({
            ok: false,
            msg: `La multa N°${fine_number} no fue encontrada.`,
          });
        }
        const finalUrls = applyProveUpdatesForFine({
          existingProves: Array.isArray(current.fine_proves)
            ? current.fine_proves
            : current.fine_proves
              ? [current.fine_proves]
              : [],
          slotActions,
          slotFiles: filesBySlot,
          fineNumber: fine_number,
        });
        updatedShipFine.fine_proves = finalUrls;
        cleanupFiles = [];
      } else {
        delete updatedShipFine.fine_proves;
      }

      const shipFine = await shipFinesServices.findOneAndUpdate(
        { fine_number },
        updatedShipFine
      );
      if (shipFine) {
        logger.info(
          `Multa de buque N° ${fine_number} actualizada con éxito por ${user.rank} ${user.first_name} ${user.last_name}.`
        );
        return res.status(200).json({
          ok: true,
          msg: `Multa N°${fine_number} actualizada correctamente.`,
          payload: shipFine,
        });
      }
      logger.info(
        `No se encontró la multa de buque con el N° ${fine_number}.`
      );
      deleteStoredProveFiles(cleanupFiles);
      return res.status(404).json({
        ok: false,
        msg: `La multa N°${fine_number} no fue encontrada.`,
      });
    } catch (error) {
      deleteStoredProveFiles(cleanupFiles);
      logger.error(
        `Error de servidor al actualizar la multa de buque N° ${fine_number}: ` +
          error
      );
      return res.status(500).json({
        ok: false,
        msg: `La multa N°${fine_number} no pudo ser actualizada por un error del servidor.`,
      });
    }
  }

  async findByNumberAndRenderForDelete(req, res) {
    try {
      const { fine_number } = req.query;
      const shipFine = await shipFinesServices.findByNumber(fine_number);
      if (shipFine) {
        return res.status(200).json({ ok: true, shipFine });
      }
      return res.status(404).json({
        ok: false,
        msg: "Multa no encontrada. Verifique la numeración.",
      });
    } catch (e) {
      logger.error(
        "Error on shipFinesController.findByNumberAndRenderForDelete: " + e
      );
      return res
        .status(500)
        .json({ ok: false, msg: "Error del servidor al buscar la multa." });
    }
  }

  async findByNumberAndDelete(req, res) {
    const user = req.user;
    const { fine_number } = req.params;
    try {
      const shipFineDeleted = await shipFinesServices.findOneAndDelete({
        fine_number,
      });
      if (shipFineDeleted) {
        const provesToDelete = Array.isArray(shipFineDeleted.fine_proves)
          ? shipFineDeleted.fine_proves
          : shipFineDeleted.fine_proves
            ? [shipFineDeleted.fine_proves]
            : [];
        deleteStoredProveFiles(provesToDelete);
        logger.info(
          `Multa de buque N° ${fine_number} eliminada con éxito por ${user.rank} ${user.first_name} ${user.last_name} (${user.email}).`
        );
        return res.status(200).json({
          ok: true,
          msg: `Multa N°${fine_number} eliminada correctamente.`,
        });
      }
      return res.status(404).json({
        ok: false,
        msg: `La multa N°${fine_number} no fue encontrada.`,
      });
    } catch (error) {
      logger.error(
        `Error de servidor al eliminar la multa de buque N° ${fine_number}: ` +
          error
      );
      return res.status(500).json({
        ok: false,
        msg: `La multa N°${fine_number} no pudo ser eliminada por un error del servidor.`,
      });
    }
  }
}

export const shipFinesController = new ShipFinesController();
