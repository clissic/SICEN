import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../DAO/models/mongoose/borderPatrols.mongoose.js", () => ({
  BorderPatrolsMongoose: {
    syncIndexes: vi.fn().mockResolvedValue(undefined),
    find: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock("../DAO/models/mongoose/borderPatrolTypes.mongoose.js", () => ({
  BorderPatrolTypesMongoose: {
    findById: vi.fn(),
  },
}));

vi.mock("../DAO/models/mongoose/units.mongoose.js", () => ({
  UnitMongoose: {
    findOne: vi.fn(),
  },
}));

import { BorderPatrolsMongoose } from "../DAO/models/mongoose/borderPatrols.mongoose.js";
import { BorderPatrolTypesMongoose } from "../DAO/models/mongoose/borderPatrolTypes.mongoose.js";
import { UnitMongoose } from "../DAO/models/mongoose/units.mongoose.js";
import {
  createBorderPatrol,
  deleteBorderPatrol,
  listBorderPatrolsByMonth,
  updateBorderPatrolStatus,
} from "./borderPatrols.service.js";

const TYPE_ID = "507f1f77bcf86cd799439011";
const PATROL_ID = "507f191e810c19729de860ea";
const EMPRE_USER = { email: "empre@pnn.gub.uy", unit: "EMPRE" };
const PRENA_USER = { email: "prena@pnn.gub.uy", unit: "PRENA" };

function mockQuery(result) {
  const query = {
    sort: vi.fn(),
    select: vi.fn(),
    lean: vi.fn(),
    exec: vi.fn(),
  };
  query.sort.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.lean.mockResolvedValue(result);
  query.exec.mockResolvedValue(result);
  return query;
}

function makeDoc(fields) {
  const doc = {
    ...fields,
    save: vi.fn().mockImplementation(async () => doc),
    toObject: vi.fn().mockImplementation(() => {
      const { save, toObject, deleteOne, ...rest } = doc;
      return { ...rest };
    }),
    deleteOne: vi.fn().mockResolvedValue(undefined),
  };
  return doc;
}

describe("borderPatrols.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BorderPatrolsMongoose.syncIndexes.mockResolvedValue(undefined);
  });

  describe("listBorderPatrolsByMonth", () => {
    it("rechaza usuario sin unidad", async () => {
      await expect(
        listBorderPatrolsByMonth({ year: 2026, month: 3 }, { email: "x@y.z" })
      ).rejects.toMatchObject({ status: 403 });
    });

    it("rechaza año inválido", async () => {
      await expect(
        listBorderPatrolsByMonth({ year: "nope" }, EMPRE_USER)
      ).rejects.toMatchObject({ status: 400 });
    });

    it("EMPRE lista todas las del mes", async () => {
      const rows = [{ _id: PATROL_ID, unitAcronym: "PRENA" }];
      BorderPatrolsMongoose.find.mockReturnValue(mockQuery(rows));

      const result = await listBorderPatrolsByMonth(
        { year: 2026, month: 3 },
        EMPRE_USER
      );

      expect(result).toEqual(rows);
      expect(BorderPatrolsMongoose.find).toHaveBeenCalledWith({
        date: { $regex: "^2026-03-" },
      });
    });

    it("sin month filtra por año completo", async () => {
      BorderPatrolsMongoose.find.mockReturnValue(mockQuery([]));
      await listBorderPatrolsByMonth({ year: 2026 }, EMPRE_USER);
      expect(BorderPatrolsMongoose.find).toHaveBeenCalledWith({
        date: { $regex: "^2026-" },
      });
    });

    it("unidad de línea solo ve las suyas", async () => {
      BorderPatrolsMongoose.find.mockReturnValue(mockQuery([]));
      await listBorderPatrolsByMonth({ year: 2026, month: 11 }, PRENA_USER);
      expect(BorderPatrolsMongoose.find).toHaveBeenCalledWith({
        date: { $regex: "^2026-11-" },
        unitAcronym: "PRENA",
      });
    });
  });

  describe("createBorderPatrol", () => {
    it("bloquea a quien no es EMPRE", async () => {
      await expect(
        createBorderPatrol(
          { unitAcronym: "PRENA", typeId: TYPE_ID, kind: "fluvial", date: "2026-03-02" },
          PRENA_USER
        )
      ).rejects.toMatchObject({ status: 403 });
    });

    it("crea la asignación si la patrulla coincide", async () => {
      UnitMongoose.findOne.mockReturnValue(mockQuery({ _id: "u1" }));
      BorderPatrolTypesMongoose.findById.mockReturnValue(
        mockQuery({
          _id: TYPE_ID,
          unitAcronym: "PRENA",
          kind: "fluvial",
          number: 1,
          detail: "TCP a Acceso Norte",
          area: "rio-de-la-plata",
        })
      );
      const created = {
        toObject: () => ({ _id: PATROL_ID, unitAcronym: "PRENA", status: "planned" }),
      };
      BorderPatrolsMongoose.create.mockResolvedValue(created);

      const result = await createBorderPatrol(
        {
          unitAcronym: "PRENA",
          typeId: TYPE_ID,
          kind: "fluvial",
          date: "2026-03-02",
        },
        EMPRE_USER
      );

      expect(result).toEqual({
        _id: PATROL_ID,
        unitAcronym: "PRENA",
        status: "planned",
      });
      expect(BorderPatrolsMongoose.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unitAcronym: "PRENA",
          date: "2026-03-02",
          kind: "fluvial",
          number: 1,
          area: "rio-de-la-plata",
          status: "planned",
        })
      );
    });

    it("devuelve 409 si ya está asignada ese día", async () => {
      UnitMongoose.findOne.mockReturnValue(mockQuery({ _id: "u1" }));
      BorderPatrolTypesMongoose.findById.mockReturnValue(
        mockQuery({
          _id: TYPE_ID,
          unitAcronym: "PRENA",
          kind: "fluvial",
          number: 1,
          detail: "tramo",
          area: "rio-uruguay",
        })
      );
      const dup = new Error("dup");
      dup.code = 11000;
      BorderPatrolsMongoose.create.mockRejectedValue(dup);

      await expect(
        createBorderPatrol(
          {
            unitAcronym: "PRENA",
            typeId: TYPE_ID,
            kind: "fluvial",
            date: "2026-03-02",
          },
          EMPRE_USER
        )
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("updateBorderPatrolStatus", () => {
    it("rechaza id inválido", async () => {
      await expect(
        updateBorderPatrolStatus("nope", { status: "missed" }, EMPRE_USER)
      ).rejects.toMatchObject({ status: 400 });
    });

    it("la unidad dueña puede marcar incumplida", async () => {
      const doc = makeDoc({
        unitAcronym: "PRENA",
        kind: "fluvial",
        area: "rio-uruguay",
        status: "planned",
        observations: "",
        metadata: { createdBy: "empre@pnn.gub.uy" },
      });
      BorderPatrolsMongoose.findById.mockReturnValue(mockQuery(doc));

      const result = await updateBorderPatrolStatus(
        PATROL_ID,
        { status: "missed", observations: "mar picada" },
        PRENA_USER
      );

      expect(doc.status).toBe("missed");
      expect(doc.observations).toBe("mar picada");
      expect(doc.save).toHaveBeenCalled();
      expect(result.status).toBe("missed");
    });

    it("impide que otra unidad de línea edite", async () => {
      const doc = makeDoc({ unitAcronym: "PRENA", status: "planned" });
      BorderPatrolsMongoose.findById.mockReturnValue(mockQuery(doc));

      await expect(
        updateBorderPatrolStatus(
          PATROL_ID,
          { status: "missed" },
          { email: "comflo@pnn.gub.uy", unit: "COMFLO" }
        )
      ).rejects.toMatchObject({ status: 403 });
    });

    it("exige fulfillment al marcar cumplida", async () => {
      const doc = makeDoc({
        unitAcronym: "PRENA",
        kind: "fluvial",
        area: "rio-uruguay",
        status: "planned",
        observations: "",
        metadata: {},
      });
      BorderPatrolsMongoose.findById.mockReturnValue(mockQuery(doc));

      await expect(
        updateBorderPatrolStatus(PATROL_ID, { status: "fulfilled" }, PRENA_USER)
      ).rejects.toMatchObject({ status: 400 });
    });

    it("guarda fulfillment fluvial con combustible", async () => {
      const doc = makeDoc({
        unitAcronym: "PRENA",
        kind: "fluvial",
        area: "rio-uruguay",
        status: "planned",
        observations: "",
        metadata: { createdBy: "empre@pnn.gub.uy" },
      });
      BorderPatrolsMongoose.findById.mockReturnValue(mockQuery(doc));

      const result = await updateBorderPatrolStatus(
        PATROL_ID,
        {
          status: "fulfilled",
          fulfillment: {
            vehicle: "AB-1234",
            registeredCraft: 2,
            controlledCraft: { sports: 1, merchant: 0, fishing: 0 },
            identifiedPersons: 3,
            fuel: { type: "gasoil-comun", liters: 40.5 },
            incidents: [{ detail: "Nada" }],
            distanceNm: 12.3,
            breakdowns: 0,
            personnel: 4,
          },
        },
        PRENA_USER
      );

      expect(result.fulfillment).toMatchObject({
        area: "rio-uruguay",
        vehicle: "AB-1234",
        fuel: { type: "gasoil-comun", liters: 40.5 },
        distanceNm: 12.3,
        distanceKm: 0,
        incidentCount: 1,
        personnel: 4,
      });
    });
  });

  describe("deleteBorderPatrol", () => {
    it("solo EMPRE puede borrar", async () => {
      await expect(deleteBorderPatrol(PATROL_ID, PRENA_USER)).rejects.toMatchObject(
        { status: 403 }
      );
    });

    it("borra y devuelve el documento", async () => {
      const deleted = { _id: PATROL_ID, unitAcronym: "PRENA" };
      BorderPatrolsMongoose.findByIdAndDelete.mockReturnValue(
        mockQuery(deleted)
      );
      const result = await deleteBorderPatrol(PATROL_ID, EMPRE_USER);
      expect(result).toEqual(deleted);
      expect(BorderPatrolsMongoose.findByIdAndDelete).toHaveBeenCalledWith(
        PATROL_ID
      );
    });
  });
});
