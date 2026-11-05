import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../DAO/models/mongoose/borderPatrolTypes.mongoose.js", () => ({
  BorderPatrolTypesMongoose: {
    find: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("../DAO/models/mongoose/units.mongoose.js", () => ({
  UnitMongoose: {
    findOne: vi.fn(),
  },
}));

import { BorderPatrolTypesMongoose } from "../DAO/models/mongoose/borderPatrolTypes.mongoose.js";
import { UnitMongoose } from "../DAO/models/mongoose/units.mongoose.js";
import {
  createBorderPatrolType,
  deleteBorderPatrolType,
  listBorderPatrolTypes,
  updateBorderPatrolType,
} from "./borderPatrolTypes.service.js";

const TYPE_ID = "507f1f77bcf86cd799439011";
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

describe("borderPatrolTypes.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listBorderPatrolTypes", () => {
    it("EMPRE puede listar las de otra unidad", async () => {
      const types = [{ number: 1, kind: "fluvial" }];
      BorderPatrolTypesMongoose.find.mockReturnValue(mockQuery(types));
      const result = await listBorderPatrolTypes("PRENA", EMPRE_USER);
      expect(result).toEqual(types);
      expect(BorderPatrolTypesMongoose.find).toHaveBeenCalledWith({
        unitAcronym: "PRENA",
      });
    });

    it("la unidad dueña puede listar las suyas", async () => {
      BorderPatrolTypesMongoose.find.mockReturnValue(mockQuery([]));
      await listBorderPatrolTypes("prena", PRENA_USER);
      expect(BorderPatrolTypesMongoose.find).toHaveBeenCalledWith({
        unitAcronym: "PRENA",
      });
    });

    it("otra unidad de línea no puede listar", async () => {
      await expect(
        listBorderPatrolTypes("PRENA", { email: "x@y.z", unit: "COMFLO" })
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe("createBorderPatrolType", () => {
    it("EMPRE no carga números (los carga la unidad de línea)", async () => {
      await expect(
        createBorderPatrolType(
          {
            number: 1,
            kind: "fluvial",
            detail: "TCP a Acceso Norte",
            area: "rio-de-la-plata",
          },
          EMPRE_USER
        )
      ).rejects.toMatchObject({ status: 403 });
    });

    it("la unidad dueña crea el tipo", async () => {
      UnitMongoose.findOne.mockReturnValue(mockQuery({ _id: "u1" }));
      BorderPatrolTypesMongoose.create.mockResolvedValue({
        toObject: () => ({
          _id: TYPE_ID,
          unitAcronym: "PRENA",
          number: 1,
          kind: "fluvial",
        }),
      });

      const result = await createBorderPatrolType(
        {
          number: 1,
          kind: "fluvial",
          detail: "TCP a Acceso Norte",
          area: "rio-de-la-plata",
        },
        PRENA_USER
      );

      expect(result.unitAcronym).toBe("PRENA");
      expect(BorderPatrolTypesMongoose.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unitAcronym: "PRENA",
          number: 1,
          kind: "fluvial",
          area: "rio-de-la-plata",
        })
      );
    });
  });

  describe("updateBorderPatrolType", () => {
    it("no deja modificar la patrulla de otra unidad", async () => {
      const doc = makeDoc({
        unitAcronym: "PRENA",
        number: 1,
        kind: "fluvial",
        detail: "viejo",
        area: "rio-uruguay",
        metadata: {},
      });
      BorderPatrolTypesMongoose.findById.mockReturnValue(mockQuery(doc));

      await expect(
        updateBorderPatrolType(
          TYPE_ID,
          {
            number: 2,
            kind: "terrestre",
            detail: "nuevo",
            area: "rio-uruguay",
          },
          { email: "comflo@pnn.gub.uy", unit: "COMFLO" }
        )
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe("deleteBorderPatrolType", () => {
    it("borra el tipo de la unidad dueña", async () => {
      const doc = makeDoc({
        unitAcronym: "PRENA",
        number: 3,
        kind: "terrestre",
      });
      BorderPatrolTypesMongoose.findById.mockReturnValue(mockQuery(doc));

      const result = await deleteBorderPatrolType(TYPE_ID, PRENA_USER);
      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ number: 3, kind: "terrestre" });
    });

    it("404 si no existe", async () => {
      BorderPatrolTypesMongoose.findById.mockReturnValue(mockQuery(null));
      await expect(
        deleteBorderPatrolType(TYPE_ID, PRENA_USER)
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
