import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const schema = new Schema({
  fine_number : { type: Number, required: true },
  fine_date: { type: String, required: true },
  fine_time: { type: String, required: true },
  fine_article: { type: String, required: true },
  fine_amount: { type: Number, required: true },
  fine_extra_amount: { type: Number },
  fine_author: { type: String, required: true },
  fine_proves: { type: String, required: true },
  fine_status: { type: String, default: "due" },
  car_brand: { type: String, required: true },
  car_model: { type: String, required: true },
  car_reg_number: { type: String, required: true},
  owner_ci: { type: String },
  owner_name: { type: String },
  owner_tel: { type: String },
  owner_dir: { type: String },
  last_modified_by: { type: String, default: "S/M" },
});

schema.plugin(mongoosePaginate);

export const CarFinesMongoose = model("carFines", schema);