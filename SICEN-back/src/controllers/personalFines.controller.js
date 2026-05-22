import { PersonalFinesMongoose } from "../DAO/models/mongoose/personalFines.mongoose.js";
import { personalFinesServices } from "../services/personalFines.service.js";
import {
  applyProveUpdatesForFine,
  deleteStoredProveFiles,
  renameProveFilesByFineNumber,
} from "../utils/personalFineProveFiles.js";
import { logger } from "../utils/logger.js";
import PersonalFineDTO from "./DTO/personalFine.dto.js";

const ALLOWED_SEX = new Set(["M", "F", "X"]);

function sanitizeCI(value) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

class PersonalFinesController {
  async getAll(req, res) {
    try {
      const fines = await personalFinesServices.getAll();
      if (fines) {
        return res.status(200).json({
          status: "success",
          msg: "All personal fines found",
          payload: fines,
        });
      }
      return res.status(404).json({
        status: "failed",
        msg: "Personal fines not found",
        payload: [],
      });
    } catch (e) {
      logger.error("Error on personalFinesController.getAll: " + e);
      return res
        .status(500)
        .json({ status: "error", msg: "Server error", payload: [] });
    }
  }

  async findById(req, res) {
    try {
      const user = req.user;
      const { id } = req.params;
      const fine = await personalFinesServices.findById(id);
      if (!fine) {
        return res.status(404).json({
          status: "failed",
          msg: "Personal fine not found by ID",
          payload: [],
        });
      }
      const privileged = ["admin", "superAdmin", "contable"].includes(
        user.role
      );
      const isAuthor =
        fine.fine_author && fine.fine_author === user.email;
      if (!privileged && !isAuthor) {
        return res.status(403).json({
          status: "error",
          msg: "No autorizado a consultar esta multa.",
          payload: [],
        });
      }
      return res.status(200).json({
        status: "success",
        msg: "Personal fine found by ID",
        payload: fine,
      });
    } catch (e) {
      logger.error("Error on personalFinesController.findById: " + e);
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
        person_ci,
        person_first_name,
        person_last_name,
        person_nationality,
        person_birth_date,
        person_sex,
        person_tel,
        person_dir,
      } = req.body;

      if (uploadedFiles.length === 0) {
        return res.status(400).json({
          status: "failed",
          msg: "Debe adjuntar al menos una foto de prueba (.jpg, hasta 5 MB).",
          payload: {},
        });
      }

      const ci = sanitizeCI(person_ci);
      if (ci.length < 6 || ci.length > 9) {
        deleteStoredProveFiles(
          uploadedFiles.map(
            (f) => `/uploads/personalFineProves/${f.filename}`
          )
        );
        return res.status(400).json({
          status: "failed",
          msg: "El número de DNI debe contener entre 6 y 9 dígitos.",
          payload: {},
        });
      }

      const sex = String(person_sex || "").trim().toUpperCase();
      if (!ALLOWED_SEX.has(sex)) {
        deleteStoredProveFiles(
          uploadedFiles.map(
            (f) => `/uploads/personalFineProves/${f.filename}`
          )
        );
        return res.status(400).json({
          status: "failed",
          msg: "Sexo inválido. Valores aceptados: M, F, X.",
          payload: {},
        });
      }
      if (
        !person_first_name ||
        !person_last_name ||
        !person_nationality ||
        !person_birth_date
      ) {
        deleteStoredProveFiles(
          uploadedFiles.map(
            (f) => `/uploads/personalFineProves/${f.filename}`
          )
        );
        return res.status(400).json({
          status: "failed",
          msg: "Nombre, apellido, nacionalidad y fecha de nacimiento son obligatorios.",
          payload: {},
        });
      }

      const fine_number = await personalFinesServices.getNextFineNumber();
      fine_proves = renameProveFilesByFineNumber(uploadedFiles, fine_number);

      const dto = new PersonalFineDTO(
        fine_number,
        fine_date,
        fine_time,
        fine_article,
        Number(fine_amount),
        fine_extra_amount ? Number(fine_extra_amount) : 0,
        fine_author,
        fine_proves,
        ci,
        String(person_first_name).trim(),
        String(person_last_name).trim(),
        String(person_nationality).trim(),
        String(person_birth_date).trim(),
        sex,
        person_tel,
        person_dir,
        last_modified_by
      );

      const created = await personalFinesServices.create(dto);
      logger.info(
        `Personal fine: ${JSON.stringify(created)} created by ${fine_author}`
      );
      if (created) {
        return res.status(201).json({
          status: "success",
          msg: `Multa N° ${created.fine_number} creada correctamente.`,
          payload: created,
        });
      }
      deleteStoredProveFiles(fine_proves);
      return res.status(400).json({
        status: "failed",
        msg: "Algunas propiedades son incorrectas al crear la multa personal.",
        payload: {},
      });
    } catch (e) {
      deleteStoredProveFiles(fine_proves);
      logger.error(
        "Error on personalFinesController.createAndRender: " + e
      );
      return res
        .status(500)
        .json({ status: "error", msg: "Server error", payload: {} });
    }
  }

  async mine(req, res) {
    try {
      const user = req.user;
      const userFines = await personalFinesServices.findByEmail(user.email);
      const filtered = (userFines || []).map((fine) => ({
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
        person_ci: fine.person_ci,
        person_first_name: fine.person_first_name,
        person_last_name: fine.person_last_name,
        person_nationality: fine.person_nationality,
        person_birth_date: fine.person_birth_date,
        person_sex: fine.person_sex,
        person_tel: fine.person_tel,
        person_dir: fine.person_dir,
      }));
      return res.status(200).json({ status: "success", payload: filtered });
    } catch (e) {
      logger.error("Error on personalFinesController.mine: " + e);
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
        person_ci,
        person_first_name,
        person_last_name,
        person_nationality,
        person_sex,
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
        mongooseFilter.fine_article = {
          $regex: new RegExp(fine_article, "i"),
        };
      }
      if (fine_amount) mongooseFilter.fine_amount = fine_amount;
      if (fine_author) {
        mongooseFilter.fine_author = { $regex: new RegExp(fine_author, "i") };
      }
      if (fine_status) mongooseFilter.fine_status = fine_status;
      if (person_ci) {
        mongooseFilter.person_ci = { $regex: new RegExp(person_ci) };
      }
      if (person_first_name) {
        mongooseFilter.person_first_name = {
          $regex: new RegExp(person_first_name, "i"),
        };
      }
      if (person_last_name) {
        mongooseFilter.person_last_name = {
          $regex: new RegExp(person_last_name, "i"),
        };
      }
      if (person_nationality) {
        mongooseFilter.person_nationality = {
          $regex: new RegExp(person_nationality, "i"),
        };
      }
      if (person_sex) {
        mongooseFilter.person_sex = String(person_sex).toUpperCase();
      }

      const queryResult = await PersonalFinesMongoose.paginate(
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
        person_ci: fine.person_ci,
        person_first_name: fine.person_first_name,
        person_last_name: fine.person_last_name,
        person_nationality: fine.person_nationality,
        person_birth_date: fine.person_birth_date,
        person_sex: fine.person_sex,
        person_tel: fine.person_tel,
        person_dir: fine.person_dir,
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
        msg: "Personal fines list",
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
      logger.error(
        "Error getting personal fines and pagination: " + error
      );
      return res.status(500).json({
        status: "error",
        msg: "Error getting personal fines and pagination.",
      });
    }
  }

  async deleteOne(req, res) {
    try {
      const { id } = req.params;
      const deleted = await personalFinesServices.deleteOne(id);
      if (deleted) {
        return res.status(200).json({
          status: "success",
          msg: "Personal fine deleted",
          payload: deleted,
        });
      }
      return res.status(404).json({
        status: "failed",
        msg: "Personal fine to delete not found",
        payload: {},
      });
    } catch (e) {
      logger.error("Error on personalFinesController.deleteOne: " + e);
      return res
        .status(500)
        .json({ status: "error", msg: "Server error", payload: [] });
    }
  }

  async findByNumberAndRenderForUpdate(req, res) {
    try {
      const { fine_number } = req.query;
      const fine = await personalFinesServices.findByNumber(fine_number);
      if (fine) {
        return res.status(200).json({ ok: true, personalFine: fine });
      }
      return res.status(404).json({
        ok: false,
        msg: "Multa no encontrada. Verifique la numeración.",
      });
    } catch (e) {
      logger.error(
        "Error on personalFinesController.findByNumberAndRenderForUpdate: " +
          e
      );
      return res
        .status(500)
        .json({ ok: false, msg: "Error del servidor al buscar la multa." });
    }
  }

  async findByNumberAndUpdate(req, res) {
    const user = req.user;
    const { fine_number } = req.params;
    const updated = { ...req.query, ...req.body };
    delete updated.fine_number;
    delete updated.prove_slot_1_action;
    delete updated.prove_slot_2_action;
    delete updated.prove_slot_3_action;
    updated.last_modified_by = user.email;

    if (typeof updated.fine_amount === "string") {
      const n = Number(updated.fine_amount);
      if (!Number.isNaN(n)) updated.fine_amount = n;
    }
    if (typeof updated.fine_extra_amount === "string") {
      const n = Number(updated.fine_extra_amount);
      if (!Number.isNaN(n)) updated.fine_extra_amount = n;
    }
    if (typeof updated.person_ci === "string") {
      updated.person_ci = sanitizeCI(updated.person_ci);
    }
    if (typeof updated.person_sex === "string") {
      const sex = updated.person_sex.trim().toUpperCase();
      if (sex && !ALLOWED_SEX.has(sex)) {
        return res.status(400).json({
          ok: false,
          msg: "Sexo inválido. Valores aceptados: M, F, X.",
        });
      }
      updated.person_sex = sex;
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
      .map((f) => `${"/uploads/personalFineProves/"}${f.filename}`);

    try {
      if (hasProveChanges) {
        const current = await personalFinesServices.findByNumber(fine_number);
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
        updated.fine_proves = finalUrls;
        cleanupFiles = [];
      } else {
        delete updated.fine_proves;
      }

      const fine = await personalFinesServices.findOneAndUpdate(
        { fine_number },
        updated
      );
      if (fine) {
        logger.info(
          `Multa personal N° ${fine_number} actualizada con éxito por ${user.rank} ${user.first_name} ${user.last_name}.`
        );
        return res.status(200).json({
          ok: true,
          msg: `Multa N°${fine_number} actualizada correctamente.`,
          payload: fine,
        });
      }
      logger.info(`No se encontró la multa personal con el N° ${fine_number}.`);
      deleteStoredProveFiles(cleanupFiles);
      return res.status(404).json({
        ok: false,
        msg: `La multa N°${fine_number} no fue encontrada.`,
      });
    } catch (error) {
      deleteStoredProveFiles(cleanupFiles);
      logger.error(
        `Error de servidor al actualizar la multa personal N° ${fine_number}: ` +
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
      const fine = await personalFinesServices.findByNumber(fine_number);
      if (fine) {
        return res.status(200).json({ ok: true, personalFine: fine });
      }
      return res.status(404).json({
        ok: false,
        msg: "Multa no encontrada. Verifique la numeración.",
      });
    } catch (e) {
      logger.error(
        "Error on personalFinesController.findByNumberAndRenderForDelete: " +
          e
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
      const deleted = await personalFinesServices.findOneAndDelete({
        fine_number,
      });
      if (deleted) {
        const provesToDelete = Array.isArray(deleted.fine_proves)
          ? deleted.fine_proves
          : deleted.fine_proves
            ? [deleted.fine_proves]
            : [];
        deleteStoredProveFiles(provesToDelete);
        logger.info(
          `Multa personal N° ${fine_number} eliminada con éxito por ${user.rank} ${user.first_name} ${user.last_name} (${user.email}).`
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
        `Error de servidor al eliminar la multa personal N° ${fine_number}: ` +
          error
      );
      return res.status(500).json({
        ok: false,
        msg: `La multa N°${fine_number} no pudo ser eliminada por un error del servidor.`,
      });
    }
  }
}

export const personalFinesController = new PersonalFinesController();
