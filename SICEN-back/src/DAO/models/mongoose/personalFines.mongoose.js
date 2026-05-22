import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

/**
 * Multa personal: el objetivo es la persona física que cometió la infracción.
 * Mantiene paridad con `carFines` y `shipFines` excepto por los datos del
 * "objeto" infraccionado (no aplica) y los datos de identidad de la persona.
 */
const schema = new Schema({
  fine_number: { type: Number, required: true },
  fine_date: { type: String, required: true },
  fine_time: { type: String, required: true },
  fine_article: { type: String, required: true },
  fine_amount: { type: Number, required: true },
  fine_extra_amount: { type: Number },
  fine_author: { type: String, required: true },
  fine_proves: { type: [String], default: [] },
  fine_status: { type: String, default: "due" },
  /** Datos identificatorios de la persona infractora. */
  person_ci: { type: String, required: true, index: true },
  person_first_name: { type: String, required: true },
  person_last_name: { type: String, required: true },
  person_nationality: { type: String, required: true },
  /** Fecha de nacimiento en formato ISO YYYY-MM-DD. */
  person_birth_date: { type: String, required: true },
  /** Sexo registral: "M" | "F" | "X". */
  person_sex: { type: String, required: true },
  person_tel: { type: String },
  person_dir: { type: String },
  last_modified_by: { type: String, default: "S/M" },
});

schema.plugin(mongoosePaginate);

export const PersonalFinesMongoose = model("personalFines", schema);
