import { logger } from "../../utils/logger.js";
import { ShipFinesMongoose } from "./mongoose/shipFines.mongoose.js";

export async function getNextShipFineNumber() {
  const highest = await ShipFinesMongoose.findOne()
    .sort({ fine_number: -1 })
    .select("fine_number")
    .lean()
    .exec();
  const n = Number(highest?.fine_number);
  return Number.isFinite(n) ? n + 1 : 1;
}

class ShipFinesModel {
  async getAll() {
    return ShipFinesMongoose.find(
      {},
      {
        _id: true,
        fine_number: true,
        fine_date: true,
        fine_time: true,
        fine_article: true,
        fine_amount: true,
        fine_extra_amount: true,
        fine_author: true,
        fine_proves: true,
        fine_status: true,
        omi: true,
        ship_reg_number: true,
        owner_ci: true,
        owner_name: true,
        owner_tel: true,
        owner_dir: true,
      }
    );
  }

  async findById(id) {
    return ShipFinesMongoose.findById(id);
  }

  async findByNumber(fine_number) {
    return ShipFinesMongoose.findOne({ fine_number });
  }

  async create({
    fine_number,
    fine_date,
    fine_time,
    fine_article,
    fine_amount,
    fine_extra_amount,
    fine_author,
    fine_proves,
    omi,
    ship_reg_number,
    owner_ci,
    owner_name,
    owner_tel,
    owner_dir,
    last_modified_by,
  }) {
    const shipFineCreated = await ShipFinesMongoose.create({
      fine_number,
      fine_date,
      fine_time,
      fine_article,
      fine_amount,
      fine_extra_amount,
      fine_author,
      fine_proves,
      omi,
      ship_reg_number,
      owner_ci,
      owner_name,
      owner_tel,
      owner_dir,
      last_modified_by,
    });
    return shipFineCreated;
  }

  async deleteOne(id) {
    return ShipFinesMongoose.deleteOne({ _id: id });
  }

  async findByEmail(email) {
    try {
      const userFines = await ShipFinesMongoose.find(
        { fine_author: email },
        {
          _id: true,
          fine_number: true,
          fine_date: true,
          fine_time: true,
          fine_article: true,
          fine_amount: true,
          fine_extra_amount: true,
          fine_author: true,
          fine_proves: true,
          fine_status: true,
          omi: true,
          ship_reg_number: true,
          owner_ci: true,
          owner_name: true,
          owner_tel: true,
          owner_dir: true,
        }
      );
      return userFines;
    } catch (error) {
      logger.error(
        "Error al buscar multas de buques por correo electrónico: " + error
      );
      throw error;
    }
  }

  async findOneAndUpdate(query, update) {
    try {
      const updatedShipFine = await ShipFinesMongoose.findOneAndUpdate(
        query,
        update,
        { new: true }
      );
      if (!updatedShipFine) {
        throw new Error("No se encontró la multa de buque para actualizar");
      }
      return updatedShipFine;
    } catch (error) {
      throw new Error(
        `Error al actualizar la multa de buque: ${error.message}`
      );
    }
  }

  async findOneAndDelete(query) {
    try {
      const shipFineDeleted = await ShipFinesMongoose.findOneAndDelete(query);
      if (!shipFineDeleted) {
        throw new Error("No se encontró la multa de buque para eliminar");
      }
      return shipFineDeleted;
    } catch (error) {
      throw new Error(
        `Error al eliminar la multa de buque: ${error.message}`
      );
    }
  }
}

export const shipFinesModel = new ShipFinesModel();
