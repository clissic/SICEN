import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const borderPatrolTypeSchema = new Schema(
  {
    unitAcronym: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    /** Número de la columna en la planilla (1, 2, 3…). */
    number: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
    kind: {
      type: String,
      required: true,
      enum: ["fluvial", "terrestre"],
    },
    /** Tramo: de dónde a dónde. */
    detail: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    area: {
      type: String,
      required: true,
      enum: ["rio-uruguay", "rio-de-la-plata", "oceano-atlantico"],
    },
    metadata: {
      createdBy: { type: String, default: "", trim: true },
      lastModifiedBy: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

borderPatrolTypeSchema.index(
  { unitAcronym: 1, number: 1, kind: 1 },
  { unique: true }
);

borderPatrolTypeSchema.plugin(mongoosePaginate);

export const BorderPatrolTypesMongoose = model(
  "borderPatrolTypes",
  borderPatrolTypeSchema
);
