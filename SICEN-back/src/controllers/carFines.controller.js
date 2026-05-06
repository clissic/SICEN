import { CarFinesMongoose } from "../DAO/models/mongoose/carFines.mongoose.js";
import { carFinesServices } from "../services/carFines.service.js";
import { userService } from "../services/users.service.js";
import { logger } from "../utils/logger.js";
import CarFineDTO from "./DTO/carFine.dto.js";

class CarFinesController {
  async getAll(req, res) {
    try {
      const carFines = await carFinesServices.getAll();
      if (carFines) {
        return res.status(200).json({
          status: "success",
          msg: "All car fines found",
          payload: carFines,
        });
      } else {
        return res.status(404).json({
          status: "failed",
          msg: "Car fines not found",
          payload: [],
        });
      }
    } catch (e) {
      logger.error("Error on carFinesController.getAll: " + e);
      return res.status(500).json({
        status: "error",
        msg: "Server error",
        payload: [],
      });
      /* return res.status(500).render("errorPage", {msg: "Código 500. Error del servidor."}) */
    }
  }

  async findById(req, res) {
    try {
      const user = req.user;
      const { id } = req.params;
      const carFine = await carFinesServices.findById(id);
      if (!carFine) {
        return res.status(404).json({
          status: "failed",
          msg: "Car fine not found by ID",
          payload: [],
        });
      }
      const privileged = ["admin", "superAdmin", "contable"].includes(
        user.role
      );
      const isAuthor =
        carFine.fine_author && carFine.fine_author === user.email;
      if (!privileged && !isAuthor) {
        return res.status(403).json({
          status: "error",
          msg: "No autorizado a consultar esta multa.",
          payload: [],
        });
      }
      return res.status(200).json({
        status: "success",
        msg: "Car fine found by ID",
        payload: carFine,
      });
    } catch (e) {
      logger.error("Error on carFinesController.findById: " + e);
      return res.status(500).json({
        status: "error",
        msg: "Server error",
        payload: [],
      });
    }
  }

  async create(req, res) {
    try {
      const fine_author = req.user.email;
      const {
        fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        fine_proves,
        car_brand,
        car_model,
        car_reg_number,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
      } = req.body;
      const last_modified_by = "S/M";
      const carFineDTO = new CarFineDTO(
        fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        fine_author,
        fine_proves,
        car_brand,
        car_model,
        car_reg_number,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
        last_modified_by,
      );
      const carFineCreated = await carFinesServices.create(carFineDTO);
      if (carFineCreated) {
        return res.status(201).json({
          status: "success",
          msg: "Car fine created",
          payload: carFineCreated,
        });
      } else {
        return res.status(400).json({
          status: "failed",
          msg: "Some properties are incorrect in carFinesController.create, please check",
          payload: {},
        });
      }
    } catch (e) {
      logger.error("Error on carFinesController.create: " + e);
      return res.status(500).json({
        status: "error",
        msg: "Server error",
        payload: [],
      });
    }
  }

  async createAndRender(req, res) {
    try {
      const fine_author = req.user.email;
      const last_modified_by = "S/M";
      const {
        fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        fine_proves,
        car_brand,
        car_model,
        car_reg_number,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
      } = req.body;
      const carFineDTO = new CarFineDTO(
        fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        fine_author,
        fine_proves,
        car_brand,
        car_model,
        car_reg_number,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
        last_modified_by,
      );
      const carFineCreated = await carFinesServices.create(carFineDTO);
      logger.info(`Car fine: ${JSON.stringify(carFineCreated)} created by ${fine_author}`);
      if (carFineCreated) {
        const _id = req.user._id;
        const fullUser = await userService.findById(_id);
        const fines = [...(fullUser.fines || []), carFineCreated];
        await userService.updateFines({ _id, fines });
        return res.status(201).json({
          status: "success",
          msg: `Multa N° ${carFineCreated.fine_number} creada correctamente.`,
          payload: carFineCreated,
        });
      } else {
        return res.status(400).json({
          status: "failed",
          msg: "Some properties are incorrect in carFinesController.createAndRender, please check",
          payload: {},
        });
      }
    } catch (e) {
      logger.error("Error on carFinesController.createAndRender: " + e);
      return res.status(500).json({
        status: "error",
        msg: "Server error",
        payload: {},
      });
    }
  }

  async mine(req, res) {
    try {
      const user = req.user;
      const userFines = await carFinesServices.findByEmail(user.email);
      const filteredUserFines = userFines.map((fine) => ({
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
        car_brand: fine.car_brand,
        car_model: fine.car_model,
        car_reg_number: fine.car_reg_number,
        owner_ci: fine.owner_ci,
        owner_name: fine.owner_name,
        owner_tel: fine.owner_tel,
        owner_dir: fine.owner_dir,
      }));
      return res.status(200).json({
        status: "success",
        payload: filteredUserFines,
      });
    } catch (e) {
      logger.error("Error on carFinesController.mine: " + e);
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
        car_brand,
        car_model,
        car_reg_number,
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
      if (fine_number) {
        mongooseFilter.fine_number = fine_number;
      }
      if (fine_date) {
        mongooseFilter.fine_date = { $regex: new RegExp(fine_date) };
      }
      if (fine_article) {
        mongooseFilter.fine_article = { $regex: new RegExp(fine_article, "i") };
      }
      if (fine_amount) {
        mongooseFilter.fine_amount = fine_amount;
      }
      if (fine_author) {
        mongooseFilter.fine_author = { $regex: new RegExp(fine_author, "i") };
      }
      if (fine_status) {
        mongooseFilter.fine_status = fine_status;
      }
      if (car_brand) {
        mongooseFilter.car_brand = { $regex: new RegExp(car_brand, "i") };
      }
      if (car_model) {
        mongooseFilter.car_model = { $regex: new RegExp(car_model, "i") };
      }
      if (car_reg_number) {
        mongooseFilter.car_reg_number = {
          $regex: new RegExp(car_reg_number, "i"),
        };
      }
      if (owner_ci) {
        mongooseFilter.owner_ci = { $regex: new RegExp(owner_ci) };
      }
      if (owner_name) {
        mongooseFilter.owner_name = { $regex: new RegExp(owner_name, "i") };
      }

      const queryResult = await CarFinesMongoose.paginate(
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
        car_brand: fine.car_brand,
        car_model: fine.car_model,
        car_reg_number: fine.car_reg_number,
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
        msg: "Fines list",
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
      console.error("Error getting fines and pagination:", error);
      return res.status(500).json({
        status: "error",
        msg: "Error getting fines and pagination.",
      });
    }
  }

  async deleteOne(req, res) {
    try {
      const { id } = req.params;
      const carFineDeleted = await carFinesServices.deleteOne(id);
      if (carFineDeleted) {
        return res.status(200).json({
          status: "success",
          msg: "Car fine deleted",
          payload: carFineDeleted,
        });
      } else {
        return res.status(404).json({
          status: "failed",
          msg: "Car fine to delete not found",
          payload: {},
        });
      }
    } catch (e) {
      logger.error("Error on carFinesController.deleteOne: " + e);
      return res.status(500).json({
        status: "error",
        msg: "Server error",
        payload: [],
      });
    }
  }

  async findByNumberAndRenderForUpdate(req, res) {
    try {
      const { fine_number } = req.query;
      const carFine = await carFinesServices.findByNumber(fine_number);
      if (carFine) {
        return res.status(200).json({ ok: true, carFine });
      }
      return res.status(404).json({
        ok: false,
        msg: "Multa no encontrada. Verifique la numeración.",
      });
    } catch (e) {
      logger.error(
        "Error on carFinesController.findByNumberAndRenderForUpdates: " + e
      );
      return res
        .status(500)
        .json({ ok: false, msg: "Error del servidor al buscar la multa." });
    }
  }

  async findByNumberAndUpdate(req, res) {
    const user = req.user;
    const { fine_number } = req.params;
    const updatedCarFine = { ...req.query, ...req.body };
    delete updatedCarFine.fine_number;
    updatedCarFine.last_modified_by = user.email;
    try {
      const carFine = await carFinesServices.findOneAndUpdate(
        { fine_number },
        updatedCarFine
      );
      if (carFine) {
        logger.info(
          `Multa N° ${fine_number} actualizada con éxito por ${user.rank} ${user.first_name} ${user.last_name}: ${carFine}`
        );
        return res.status(200).json({
          ok: true,
          msg: `Multa N°${fine_number} actualizada correctamente.`,
          payload: carFine,
        });
      }
      logger.info(
        `No se encontró la multa con el N° ${fine_number} por ${user.rank} ${user.first_name} ${user.last_name}.`
      );
      return res.status(404).json({
        ok: false,
        msg: `La multa N°${fine_number} no fue encontrada.`,
      });
    } catch (error) {
      logger.error(
        `Error de servidor al actualizar la multa N° ${fine_number} por ${user.rank} ${user.first_name} ${user.last_name}:`,
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
      const carFine = await carFinesServices.findByNumber(fine_number);
      if (carFine) {
        return res.status(200).json({ ok: true, carFine });
      }
      return res.status(404).json({
        ok: false,
        msg: "Multa no encontrada. Verifique la numeración.",
      });
    } catch (e) {
      logger.error(
        "Error on userController.findByNumberAndRenderForDelete: " + e
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
      const carFineDeleted = await carFinesServices.findOneAndDelete({
        fine_number,
      });
      if (carFineDeleted) {
        logger.info(
          `Multa N° ${fine_number} eliminada con éxito por ${user.rank} ${user.first_name} ${user.last_name} (${user.email}).`
        );
        return res.status(200).json({
          ok: true,
          msg: `Multa N°${fine_number} eliminada correctamente.`,
        });
      }
      logger.info(
        `No se encontró la multa con el N° ${fine_number} por ${user.rank} ${user.first_name} ${user.last_name}.`
      );
      return res.status(404).json({
        ok: false,
        msg: `La multa N°${fine_number} no fue encontrada.`,
      });
    } catch (error) {
      logger.error(
        `Error de servidor al eliminar la multa N° ${fine_number} por ${user.rank} ${user.first_name} ${user.last_name}:`,
        error
      );
      return res.status(500).json({
        ok: false,
        msg: `La multa N°${fine_number} no pudo ser eliminada por un error del servidor.`,
      });
    }
  }
}

export const carFinesController = new CarFinesController();
