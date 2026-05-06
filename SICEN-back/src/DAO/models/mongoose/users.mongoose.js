import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const schema = new Schema({
  avatar: { type: String, default: "/img/avatar.png" },
  first_name: { type: String, required: true, max: 100 },
  last_name: { type: String, required: true, max: 100 },
  rank: { type: String, required: true, max: 5},
  email: { type: String, required: true, max: 100, unique: true },
  password: { type: String, max: 100 },
  role: { type: String, default: "user"},
  fines: { type: Array, default: [] },
  last_modified_by: { type: String, default: "S/M" },
});

schema.plugin(mongoosePaginate);

export const UserMongoose = model("users", schema);