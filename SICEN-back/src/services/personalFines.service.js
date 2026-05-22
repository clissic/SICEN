import {
  personalFinesModel,
  getNextPersonalFineNumber,
} from "../DAO/models/personalFines.model.js";
import { logger } from "../utils/logger.js";

class PersonalFinesService {
  async getAll() {
    try {
      return await personalFinesModel.getAll();
    } catch (error) {
      throw logger.error("Failed to get all personal fines: " + error);
    }
  }

  async findById(id) {
    try {
      return await personalFinesModel.findById(id);
    } catch (error) {
      throw logger.error("Failed to find personal fine by ID: " + error);
    }
  }

  async findByNumber(fine_number) {
    try {
      return await personalFinesModel.findByNumber(fine_number);
    } catch (error) {
      throw logger.error("Failed to find personal fine by number: " + error);
    }
  }

  async getNextFineNumber() {
    return getNextPersonalFineNumber();
  }

  async create(dto) {
    try {
      const created = await personalFinesModel.create(dto);
      await created.save();
      return created;
    } catch (error) {
      throw logger.error("Failed to create personal fine: " + error);
    }
  }

  async deleteOne(id) {
    try {
      return await personalFinesModel.deleteOne(id);
    } catch (error) {
      throw logger.error("Failed deleting personal fine by ID: " + error);
    }
  }

  async findByEmail(email) {
    try {
      return await personalFinesModel.findByEmail(email);
    } catch (error) {
      logger.error("Failed to get personal fines by email: " + error);
      throw error;
    }
  }

  async findOneAndUpdate(query, update) {
    try {
      return await personalFinesModel.findOneAndUpdate(query, update);
    } catch (error) {
      throw error;
    }
  }

  async findOneAndDelete(query) {
    try {
      return await personalFinesModel.findOneAndDelete(query);
    } catch (error) {
      throw error;
    }
  }
}

export const personalFinesServices = new PersonalFinesService();
