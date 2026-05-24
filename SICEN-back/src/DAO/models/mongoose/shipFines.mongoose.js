import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

/** Multa de buque (colección propia, análoga a `carFines`). */
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
  /** Número OMI del buque (solo dígitos). */
  omi: { type: Number, required: true },
  /** Matrícula del buque. */
  ship_reg_number: { type: String, required: true },
  /** Bandera (pabellón) del buque al momento de la infracción. */
  flag: { type: String, default: "" },
  owner_ci: { type: String },
  owner_name: { type: String },
  owner_tel: { type: String },
  owner_dir: { type: String },
  last_modified_by: { type: String, default: "S/M" },
});

schema.plugin(mongoosePaginate);

export const ShipFinesMongoose = model("shipFines", schema);
