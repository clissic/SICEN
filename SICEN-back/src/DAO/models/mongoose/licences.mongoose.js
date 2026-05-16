import { Schema, model } from "mongoose";

const licenceNameSchema = new Schema(
  {
    es: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const licenceMetadataSchema = new Schema(
  {
    createdAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
    lastModifiedBy: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/** Catálogo de títulos y licencias (metadatos). `kind`: title | license */
const schema = new Schema(
  {
    kind: {
      type: String,
      enum: ["title", "license"],
      default: "license",
    },
    code: { type: String, default: "", trim: true },
    name: { type: licenceNameSchema, default: () => ({}) },
    category: { type: String, default: "", trim: true },
    authority: { type: String, default: "", trim: true },
    requiresRenewal: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    metadata: { type: licenceMetadataSchema, default: () => ({}) },
  },
  { timestamps: false },
);

export const LicenceMongoose = model("Licence", schema, "licences");
