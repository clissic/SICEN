import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const vesselSchema = new Schema(
  {
    id: { type: String, default: null },
    name: { type: String, default: null },
    mmsi: { type: String, default: null },
    flag: { type: String, default: null },
    type: { type: String, default: null },
  },
  { _id: false }
);

const schema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: {
      type: String,
      required: true,
      enum: ["fishing", "encounter", "gap"],
    },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    vessel: { type: vesselSchema, default: null },
    secondVessel: { type: vesselSchema, default: null },
    encounterType: { type: String, default: null },
    distances: { type: Schema.Types.Mixed, default: null },
    regions: { type: Schema.Types.Mixed, default: null },
    source: { type: String, default: "gfw" },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

schema.index({ eventId: 1 }, { unique: true });
schema.index({ location: "2dsphere" });
schema.index({ eventType: 1, startTime: -1 });
schema.index({ fetchedAt: 1 });

schema.plugin(mongoosePaginate);

export const GfwEventsMongoose = model("gfwEvents", schema);
