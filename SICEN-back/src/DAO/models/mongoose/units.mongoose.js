import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    acronym: {
      type: String,
      required: true,
      unique: true,
      maxlength: 20,
      trim: true,
    },
    name: { type: String, required: true, maxlength: 200 },
    address: { type: String, default: "", maxlength: 500 },
    phone: { type: String, default: "", maxlength: 50 },
    emailRadio: { type: String, default: "", maxlength: 120 },
    emailPoliciaMaritima: { type: String, default: "", maxlength: 120 },
    emailMarinaMercante: { type: String, default: "", maxlength: 120 },
    emailApoyoLogistico: { type: String, default: "", maxlength: 120 },
    emailSecretaria: { type: String, default: "", maxlength: 120 },
    heraldica: { type: String, default: "", maxlength: 20000 },
    foundationDate: { type: Date, required: true },
    shieldRelativeUrl: {
      type: String,
      required: true,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

export const UnitMongoose = model("units", schema);
