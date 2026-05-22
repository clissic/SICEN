import { logger } from "../../utils/logger.js";
import { PersonalFinesMongoose } from "./mongoose/personalFines.mongoose.js";

const PROJECTION = {
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
  person_ci: true,
  person_first_name: true,
  person_last_name: true,
  person_nationality: true,
  person_birth_date: true,
  person_sex: true,
  person_tel: true,
  person_dir: true,
};

export async function getNextPersonalFineNumber() {
  const highest = await PersonalFinesMongoose.findOne()
    .sort({ fine_number: -1 })
    .select("fine_number")
    .lean()
    .exec();
  const n = Number(highest?.fine_number);
  return Number.isFinite(n) ? n + 1 : 1;
}

class PersonalFinesModel {
  async getAll() {
    return PersonalFinesMongoose.find({}, PROJECTION);
  }

  async findById(id) {
    return PersonalFinesMongoose.findById(id);
  }

  async findByNumber(fine_number) {
    return PersonalFinesMongoose.findOne({ fine_number });
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
    person_ci,
    person_first_name,
    person_last_name,
    person_nationality,
    person_birth_date,
    person_sex,
    person_tel,
    person_dir,
    last_modified_by,
  }) {
    const created = await PersonalFinesMongoose.create({
      fine_number,
      fine_date,
      fine_time,
      fine_article,
      fine_amount,
      fine_extra_amount,
      fine_author,
      fine_proves,
      person_ci,
      person_first_name,
      person_last_name,
      person_nationality,
      person_birth_date,
      person_sex,
      person_tel,
      person_dir,
      last_modified_by,
    });
    return created;
  }

  async deleteOne(id) {
    return PersonalFinesMongoose.deleteOne({ _id: id });
  }

  async findByEmail(email) {
    try {
      return await PersonalFinesMongoose.find(
        { fine_author: email },
        PROJECTION
      );
    } catch (error) {
      logger.error(
        "Error al buscar multas personales por correo electrónico: " + error
      );
      throw error;
    }
  }

  async findOneAndUpdate(query, update) {
    try {
      const updated = await PersonalFinesMongoose.findOneAndUpdate(
        query,
        update,
        { new: true }
      );
      if (!updated) {
        throw new Error("No se encontró la multa personal para actualizar");
      }
      return updated;
    } catch (error) {
      throw new Error(
        `Error al actualizar la multa personal: ${error.message}`
      );
    }
  }

  async findOneAndDelete(query) {
    try {
      const deleted = await PersonalFinesMongoose.findOneAndDelete(query);
      if (!deleted) {
        throw new Error("No se encontró la multa personal para eliminar");
      }
      return deleted;
    } catch (error) {
      throw new Error(
        `Error al eliminar la multa personal: ${error.message}`
      );
    }
  }
}

export const personalFinesModel = new PersonalFinesModel();
