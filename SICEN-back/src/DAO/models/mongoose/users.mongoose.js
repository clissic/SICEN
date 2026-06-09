import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { buildDefaultUserStates } from "../../../constants/userStates.js";

const userStateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: false },
    /** Fecha/hora del último cambio de esta habilitación. */
    lastModify: { type: Date, default: null },
    /** Email del usuario que realizó el último cambio de esta habilitación. */
    modifyBy: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const schema = new Schema({
  avatar: { type: String, default: "/img/avatar.png" },
  first_name: { type: String, required: true, max: 100 },
  last_name: { type: String, required: true, max: 100 },
  rank: { type: String, required: true, max: 5},
  ci: { type: Number },
  mat: { type: Number },
  FN: { type: Date },
  unit: { type: String, default: "", maxlength: 20 },
  email: { type: String, required: true, max: 100, unique: true },
  password: { type: String, max: 100 },
  role: {
    type: String,
    enum: ["user", "admin", "superAdmin"],
    default: "user",
  },
  fines: { type: Array, default: [] },
  states: {
    type: [userStateSchema],
    default: buildDefaultUserStates,
  },
  userTutorial: { type: Boolean, default: false },
  last_modified_by: { type: String, default: "S/M" },
});

schema.plugin(mongoosePaginate);

export const UserMongoose = model("users", schema);
