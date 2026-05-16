import { Schema, model } from "mongoose";

/** Valores permitidos para `department` (catálogo STCW / estructura orgánica). */
export const TITLE_DEPARTMENTS = [
  "PUENTE",
  "MÁQUINAS",
  "ELECTROTECNIA",
  "RADIOCOMUNICACIONES",
  "SEGURIDAD",
  "PROTECCIÓN",
  "MÉDICO",
  "TANQUEROS",
  "PASAJEROS",
];

/** Valores permitidos para `level`. */
export const TITLE_LEVELS = [
  "APOYO",
  "OPERACIONAL",
  "GESTIÓN",
  "BÁSICO",
  "AVANZADO",
  "ESPECIAL",
];

const titleNameSchema = new Schema(
  {
    es: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const titleMetadataSchema = new Schema(
  {
    createdAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
    lastModifiedBy: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/** Catálogo de títulos (metadatos STCW / competency). Colección `titles`. */
const schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    stcwRegulation: { type: String, required: true, trim: true },
    name: { type: titleNameSchema, required: true },
    department: {
      type: String,
      required: true,
      enum: TITLE_DEPARTMENTS,
    },
    level: {
      type: String,
      required: true,
      enum: TITLE_LEVELS,
    },
    function: { type: String, default: "", trim: true },
    application: { type: String, default: "", trim: true },
    requiresRenewal: { type: Boolean, default: true },
    validityYears: { type: Number, default: 5 },
    active: { type: Boolean, default: true },
    metadata: { type: titleMetadataSchema, default: () => ({}) },
  },
  { timestamps: false },
);

export const TitleMongoose = model("Title", schema, "titles");
