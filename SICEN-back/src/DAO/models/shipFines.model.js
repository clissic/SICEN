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
  async findById(id) {
    return ShipFinesMongoose.findById(id).lean().exec();
  }

  async findByNumber(fine_number) {
    return ShipFinesMongoose.findOne({ fine_number }).lean().exec();
  }

  async create(doc) {
    const created = await ShipFinesMongoose.create(doc);
    return created.toObject ? created.toObject() : created;
  }

  async findOneAndUpdate(query, update) {
    return ShipFinesMongoose.findOneAndUpdate(query, update, {
      new: true,
    })
      .lean()
      .exec();
  }

  async deleteById(id) {
    return ShipFinesMongoose.deleteOne({ _id: id }).exec();
  }

  async paginate(filter, options) {
    return ShipFinesMongoose.paginate(filter, options);
  }
}

export const shipFinesModel = new ShipFinesModel();
