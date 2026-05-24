import {
  shipFinesModel,
  getNextShipFineNumber,
} from "../DAO/models/shipFines.model.js";
import { logger } from "../utils/logger.js";

class ShipFinesService {
  async getAll() {
    try {
      return await shipFinesModel.getAll();
    } catch (error) {
      throw logger.error("Failed to get all ship fines: " + error);
    }
  }

  async findById(id) {
    try {
      return await shipFinesModel.findById(id);
    } catch (error) {
      throw logger.error("Failed to find ship fine by ID: " + error);
    }
  }

  async findByNumber(fine_number) {
    try {
      return await shipFinesModel.findByNumber(fine_number);
    } catch (error) {
      throw logger.error("Failed to find ship fine by number: " + error);
    }
  }

  async getNextFineNumber() {
    return getNextShipFineNumber();
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
    flag,
    owner_ci,
    owner_name,
    owner_tel,
    owner_dir,
    last_modified_by,
  }) {
    try {
      const resolvedFineNumber =
        Number.isFinite(Number(fine_number)) && Number(fine_number) > 0
          ? Number(fine_number)
          : await getNextShipFineNumber();
      const shipFineCreated = await shipFinesModel.create({
        fine_number: resolvedFineNumber,
        fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        fine_author,
        fine_proves,
        omi,
        ship_reg_number,
        flag,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
        last_modified_by,
      });
      await shipFineCreated.save();
      return shipFineCreated;
    } catch (error) {
      throw logger.error("Failed to create ship fine: " + error);
    }
  }

  async deleteOne(id) {
    try {
      return await shipFinesModel.deleteOne(id);
    } catch (error) {
      throw logger.error("Failed deleting ship fine by ID: " + error);
    }
  }

  async findByEmail(email) {
    try {
      return await shipFinesModel.findByEmail(email);
    } catch (error) {
      logger.error("Failed to get ship fines by email: " + error);
      throw error;
    }
  }

  async findOneAndUpdate(query, update) {
    try {
      return await shipFinesModel.findOneAndUpdate(query, update);
    } catch (error) {
      throw error;
    }
  }

  async findOneAndDelete(query) {
    try {
      return await shipFinesModel.findOneAndDelete(query);
    } catch (error) {
      throw error;
    }
  }
}

export const shipFinesServices = new ShipFinesService();
