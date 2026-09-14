import { Schema, model } from "mongoose";

const mapZoneSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    color: { type: String, required: true, trim: true },
    /** Vértices [lat, lng] en orden (mín. 3). */
    positions: {
      type: [[Number]],
      required: true,
    },
    hidden: { type: Boolean, default: false },
    metadata: {
      createdBy: { type: String, default: "", trim: true },
      lastModifiedBy: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

mapZoneSchema.index({ userId: 1, createdAt: -1 });

export const MapZonesMongoose = model("mapZones", mapZoneSchema);
