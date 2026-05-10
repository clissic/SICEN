import { UnitMongoose } from "../DAO/models/mongoose/units.mongoose.js";

/** La sigla del usuario debe existir en la colección `units`. */
export async function isValidUserUnitAsync(unit) {
  if (typeof unit !== "string" || !unit.trim()) {
    return false;
  }
  const u = unit.trim().toUpperCase();
  const doc = await UnitMongoose.findOne({ acronym: u }).select("_id").lean();
  return !!doc;
}
