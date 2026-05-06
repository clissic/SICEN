import { Schema, model } from "mongoose";

const schema = new Schema({
  token: { type: String, required: true},
  email: { type: String, required: true },
  expire: { type: Number, required: true},
});

export const RecoverTokensMongoose = model("recover-tokens", schema);