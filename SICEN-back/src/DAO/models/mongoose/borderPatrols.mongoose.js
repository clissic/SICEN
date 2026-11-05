import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const incidentSchema = new Schema(
  {
    detail: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const fulfillmentSchema = new Schema(
  {
    area: {
      type: String,
      enum: ["rio-uruguay", "rio-de-la-plata", "oceano-atlantico"],
      required: true,
    },
    vehicle: { type: String, required: true, trim: true, maxlength: 80 },
    registeredCraft: { type: Number, required: true, min: 0, default: 0 },
    controlledCraft: {
      sports: { type: Number, required: true, min: 0, default: 0 },
      merchant: { type: Number, required: true, min: 0, default: 0 },
      fishing: { type: Number, required: true, min: 0, default: 0 },
    },
    identifiedPersons: { type: Number, required: true, min: 0, default: 0 },
    fuel: {
      type: {
        type: String,
        enum: [
          "nafta-super",
          "nafta-premium",
          "gasoil-comun",
          "gasoil-especial",
          "jet-a1",
        ],
        required: true,
      },
      liters: { type: Number, required: true, min: 0, default: 0 },
    },
    incidents: { type: [incidentSchema], default: [] },
    incidentCount: { type: Number, required: true, min: 0, default: 0 },
    /** Millas náuticas (patrullas fluviales). */
    distanceNm: { type: Number, required: true, min: 0, default: 0 },
    /** Kilómetros (patrullas terrestres). */
    distanceKm: { type: Number, required: true, min: 0, default: 0 },
    breakdowns: { type: Number, required: true, min: 0, default: 0 },
    personnel: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const borderPatrolSchema = new Schema(
  {
    unitAcronym: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    /** Día de la patrulla, sin hora: YYYY-MM-DD. */
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    kind: {
      type: String,
      required: true,
      enum: ["fluvial", "terrestre"],
    },
    typeId: {
      type: Schema.Types.ObjectId,
      ref: "borderPatrolTypes",
      required: true,
    },
    /** Copia del número al asignar, para la planilla. */
    number: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    /** Copia del área al asignar. */
    area: {
      type: String,
      required: true,
      enum: ["rio-uruguay", "rio-de-la-plata", "oceano-atlantico"],
    },
    status: {
      type: String,
      required: true,
      enum: ["planned", "fulfilled", "missed"],
      default: "planned",
    },
    observations: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    fulfillment: {
      type: fulfillmentSchema,
      default: undefined,
    },
    metadata: {
      createdBy: { type: String, default: "", trim: true },
      lastModifiedBy: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

borderPatrolSchema.index(
  { unitAcronym: 1, date: 1, typeId: 1 },
  { unique: true }
);

borderPatrolSchema.plugin(mongoosePaginate);

export const BorderPatrolsMongoose = model("borderPatrols", borderPatrolSchema);
