import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

/** Multa de buque (colección propia, análoga a `carFines`). */
const schema = new Schema({
  fine_number: { type: Number, required: true },
  fine_date: { type: String, required: true, trim: true },
  fine_time: { type: String, required: true, trim: true },
  fine_article: { type: String, required: true, trim: true },
  fine_amount: { type: Number, required: true },
  fine_extra_amount: { type: Number, default: 0 },
  fine_author: { type: String, required: true, trim: true },
  fine_proves: { type: String, required: true, trim: true },
  fine_status: { type: String, default: "due", trim: true },
  /** Identificador de negocio del buque (`vessels.id`). */
  vesselId: { type: String, required: true, trim: true, index: true },
  vessel: {
    type: Schema.Types.ObjectId,
    ref: "vessels",
    required: true,
    index: true,
  },
  /** Snapshot al registrar (opcional). */
  vesselName: { type: String, default: "", trim: true },
  vesselImo: { type: String, default: "", trim: true },
  vesselRegistry: { type: String, default: "", trim: true },
  owner_ci: { type: String, default: "", trim: true },
  owner_name: { type: String, default: "", trim: true },
  owner_tel: { type: String, default: "", trim: true },
  owner_dir: { type: String, default: "", trim: true },
  last_modified_by: { type: String, default: "S/M", trim: true },
});

schema.plugin(mongoosePaginate);

export const ShipFinesMongoose = model("shipFines", schema);
