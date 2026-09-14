import { Schema, model } from "mongoose";

const mapMarkerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    icon: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    metadata: {
      createdBy: { type: String, default: "", trim: true },
      lastModifiedBy: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

mapMarkerSchema.index({ userId: 1, createdAt: -1 });

export const MapMarkersMongoose = model("mapMarkers", mapMarkerSchema);
