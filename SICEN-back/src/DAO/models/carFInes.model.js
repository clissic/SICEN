import { logger } from "../../utils/logger.js";
import { CarFinesMongoose } from "./mongoose/carFines.mongoose.js";

export async function getNextCarFineNumber() {
  const highest = await CarFinesMongoose.findOne()
    .sort({ fine_number: -1 })
    .select("fine_number")
    .lean()
    .exec();
  const n = Number(highest?.fine_number);
  return Number.isFinite(n) ? n + 1 : 1;
  return Number.isFinite(n) ? n + 1 : 1;
}

class CarFinesModel {
  async getAll() {
    const carFines = await CarFinesMongoose.find(
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
        car_brand: true,
        car_model: true,
        car_reg_number: true,
        owner_ci: true,
        owner_name: true,
        owner_tel: true,
        owner_dir: true,
      }
    );
    return carFines;
  }

  async findById(id) {
    const carFine = await CarFinesMongoose.findById(id);
    return carFine;
  }

  async findByNumber(fine_number) {
    const numberFines = await CarFinesMongoose.find(
      { fine_number: fine_number },
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
        car_brand: true,
        car_model: true,
        car_reg_number: true,
        owner_ci: true,
        owner_name: true,
        owner_tel: true,
        owner_dir: true,
      }
    );
    return numberFines;
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
    car_brand,
    car_model,
    car_reg_number,
    owner_ci,
    owner_name,
    owner_tel,
    owner_dir,
    last_modified_by,
  }) {
    const carFineCreated = await CarFinesMongoose.create({
      fine_number,
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
    });
    return carFineCreated;
  }

  async deleteOne(id) {
    const carFineDeleted = await CarFinesMongoose.deleteOne({_id: id});
    return carFineDeleted;
  }

  async findByEmail(email) {
    try {
      const userFines = await CarFinesMongoose.find(
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
          car_brand: true,
          car_model: true,
          car_reg_number: true,
          owner_ci: true,
          owner_name: true,
          owner_tel: true,
          owner_dir: true,
        }
      );
      if (!userFines) {
        throw new Error("No se encontraron multas para el correo electrónico proporcionado.");
      }
      return userFines;
    } catch (error) {
      logger.error("Error al buscar multas por correo electrónico: " + error);
      throw error;
    }
  }

  async findByNumber(fine_number) {
    const carFine = await CarFinesMongoose.findOne({fine_number: fine_number});
    return carFine;
  }

  async findOneAndUpdate(query, update) {
    try {

      const updatedCarFine = await CarFinesMongoose.findOneAndUpdate(query, update, { new: true });

      if (!updatedCarFine) {
        throw new Error('No se encontró la multa para actualizar');
      }

      return updatedCarFine;
    } catch (error) {
      throw new Error(`Error al actualizar la multa: ${error.message}`);
    }
  }

  async findOneAndDelete(query) {
    try {

      const carFineDeleted = await CarFinesMongoose.deleteOne(query);

      if (!carFineDeleted) {
        throw new Error('No se encontró la multa para eliminar');
      }

      return carFineDeleted;
    } catch (error) {
      throw new Error(`Error al eliminar la multa: ${error.message}`);
    }
  }
}

export const carFinesModel = new CarFinesModel();