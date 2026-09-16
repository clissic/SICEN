import { Schema, model } from "mongoose";

const latLngSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const circleSchema = new Schema(
  {
    center: { type: latLngSchema, required: true },
    edge: { type: latLngSchema, required: true },
    radiusM: { type: Number, required: true },
    centerIdx: { type: Number, default: -1 },
  },
  { _id: false }
);

const mapMeasurementSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    unit: { type: String, enum: ["nm", "km"], default: "nm" },
    /** Vértices de la polilínea de distancia. */
    points: { type: [latLngSchema], default: [] },
    /** Deducción (m) aplicada a cada tramo points[i]→points[i+1]. */
    deducts: { type: [Number], default: [] },
    /** Índice de círculo que originó cada deducción (−1 si ninguna). */
    deductSource: { type: [Number], default: [] },
    circles: { type: [circleSchema], default: [] },
    totalMeters: { type: Number, default: 0 },
    hidden: { type: Boolean, default: false },
    metadata: {
      createdBy: { type: String, default: "", trim: true },
      lastModifiedBy: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

mapMeasurementSchema.index({ userId: 1, createdAt: -1 });

export const MapMeasurementsMongoose = model(
  "mapMeasurements",
  mapMeasurementSchema
);
