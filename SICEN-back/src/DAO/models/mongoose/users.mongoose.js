import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { buildDefaultUserStates } from "../../../constants/userStates.js";
import { USER_ROLE_VALUES } from "../../../constants/userRoles.js";

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

/** Vinculación formal cuenta skipper ↔ ficha seafarers. */
const seafarerLinkSchema = new Schema(
  {
    seafarerId: {
      type: Schema.Types.ObjectId,
      ref: "seafarers",
      default: null,
    },
    status: {
      type: String,
      enum: ["none", "pending_link", "linked", "pending_unlink"],
      default: "none",
    },
    linkedAt: { type: Date, default: null },
    linkedBy: { type: String, default: "", trim: true },
    linkedByUnit: { type: String, default: "", trim: true, uppercase: true },
    activeRequestId: {
      type: Schema.Types.ObjectId,
      ref: "seafarerLinkRequests",
      default: null,
    },
  },
  { _id: false },
);

const schema = new Schema({
  avatar: { type: String, default: "/img/avatar.png" },
  first_name: { type: String, required: true, max: 100 },
  last_name: { type: String, required: true, max: 100 },
  rank: { type: String, required: true, maxlength: 100 },
  ci: { type: Number },
  mat: { type: Number },
  /** DNI / pasaporte (texto libre; p. ej. náutas). */
  documentId: { type: String, default: "", trim: true, maxlength: 40 },
  phone: { type: String, default: "", trim: true, maxlength: 40 },
  FN: { type: Date },
  unit: { type: String, default: "", maxlength: 20 },
  email: { type: String, required: true, max: 100, unique: true },
  password: { type: String, max: 100 },
  role: {
    type: String,
    enum: USER_ROLE_VALUES,
    default: "user",
  },
  fines: { type: Array, default: [] },
  states: {
    type: [userStateSchema],
    default: buildDefaultUserStates,
  },
  userTutorial: { type: Boolean, default: false },
  last_modified_by: { type: String, default: "S/M" },
  seafarerLink: {
    type: seafarerLinkSchema,
    default: () => ({
      seafarerId: null,
      status: "none",
      linkedAt: null,
      linkedBy: "",
      linkedByUnit: "",
      activeRequestId: null,
    }),
  },
});

/** Un seafarer solo puede estar linked a una cuenta a la vez. */
schema.index(
  { "seafarerLink.seafarerId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "seafarerLink.status": "linked",
      "seafarerLink.seafarerId": { $type: "objectId" },
    },
  }
);

schema.plugin(mongoosePaginate);

export const UserMongoose = model("users", schema);
