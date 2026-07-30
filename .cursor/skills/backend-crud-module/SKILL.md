---
name: backend-crud-module
description: Implementa un módulo CRUD nuevo en el backend de SICEN (colección Mongoose + servicio + controlador + router + cliente API) siguiendo el patrón usado por vessels, seafarers y vesselInspections. Usar siempre que se cree una nueva colección de MongoDB o se exponga una nueva entidad por la API REST (ej. inspecciones, embarques, observaciones, catálogos, etc.).
---

# Patrón de módulo CRUD backend en SICEN

Toda nueva colección de MongoDB que SICEN exponga por la API debe respetar
las mismas convenciones de capas, nombres de archivo, manejo de errores y
forma de respuesta. Esto mantiene el front consumiendo el backend siempre
con la misma forma (`{ ok, msg, ... }`) y permite reutilizar guards,
helpers y skills.

## Capas y ubicación de archivos

Para una entidad con nombre en `camelCase` (ej. `vesselInspections`),
crear estos cinco archivos:

| Capa | Ruta | Responsabilidad |
|---|---|---|
| Modelo Mongoose | `SICEN-back/src/DAO/models/mongoose/<entity>.mongoose.js` | Schema, índices, plugin `mongoose-paginate-v2`, `model("<entity>", schema)`. |
| Servicio | `SICEN-back/src/services/<entity>.service.js` | Validación de payload, normalización, queries, throws con `httpError`. Sin Express. |
| Controlador | `SICEN-back/src/controllers/<entity>.controller.js` | Adaptador HTTP. Captura errores, mapea a `{ ok, msg, ... }`, no contiene lógica de negocio. |
| Router | `SICEN-back/src/routes/<entity>.router.js` | Define rutas, aplica guards (`guarded` / `adminGuarded`). |
| Cliente API | `SICEN-front/src/api/client.js` | Funciones `createX/getX/listX/updateX/deleteX` con `apiFetch`. |

Registrar el router en `SICEN-back/src/app.js`:

```js
import { vesselInspectionsRouter } from "./routes/vesselInspections.router.js";
// ...
app.use("/api/vesselInspections", vesselInspectionsRouter);
```

## Convenciones obligatorias

1. **Respuestas JSON**: siempre `{ ok: true|false, msg, ...payload }`. Nunca
   `status: "success"/"failed"` ni `payload: []` para errores.
2. **Errores del servicio**: lanzar `Error` con propiedad `status` (400, 404,
   409). El controlador los traduce a HTTP automáticamente; el resto cae en
   500 con `fallbackMsg`.
3. **Guards**: rutas de lectura → `...guarded`; rutas de borrado/admin →
   `...adminGuarded`; rutas de archivos de unidad → ver `authChains.js`.
4. **Sin DTOs**: los controladores hablan directo con servicios. Devolver
   `toObject()` o `.lean()` desde el servicio.
5. **Identificadores**: si la entidad referencia un buque, aceptar tanto
   `_id` de Mongo como `id` de negocio (UUID) — ver helper
   `resolveVesselObjectId` en `vesselInspections.service.js`.
6. **Paginación**: usar `mongoose-paginate-v2` con `safePage` ≥ 1 y
   `safeLimit` ≤ 50 (default 10).
7. **Timestamps**: agregar `{ timestamps: true }` al schema raíz salvo que
   haya razón explícita para no hacerlo.
8. **Auditoría**: incluir `metadata: { createdBy, lastModifiedBy }` con el
   email del `req.user`.
9. **Nombre de la colección**: pasar el nombre en `camelCase` y plural a
   `model("<plural>", schema)`. Coincide con el segmento de la URL
   (`/api/vesselInspections`).

## Antipatrones a evitar

- ❌ Lógica de negocio dentro del controlador.
- ❌ `res.status(500).send(err)` directo.
- ❌ Crear un DAO/Model wrapper sobre Mongoose (`models/X.model.js`). Eso
  pertenece al patrón legacy de multas; las entidades nuevas trabajan
  directo contra `XMongoose`.
- ❌ Acceder a `mongoose.Types.ObjectId` sin validar con `isValidObjectId`.
- ❌ Inventar formatos de respuesta diferentes a `{ ok, msg }`.

## Template del modelo

```js
import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const subdocSchema = new Schema(
  {
    /* campos del subdocumento */
  },
  { _id: false }
);

const schema = new Schema(
  {
    /* campos principales */
    metadata: {
      createdBy: { type: String, default: "" },
      lastModifiedBy: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

schema.plugin(mongoosePaginate);

export const XMongoose = model("xPlural", schema);
```

## Template del servicio

```js
import { isValidObjectId } from "mongoose";
import { XMongoose } from "../DAO/models/mongoose/x.mongoose.js";

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function str(v) {
  return String(v ?? "").trim();
}

async function buildPayload(body, { partial = false } = {}) {
  const out = {};
  // validar y normalizar cada campo respetando `partial`
  return out;
}

export async function createX(body, user) {
  const payload = await buildPayload(body, { partial: false });
  payload.metadata = {
    createdBy: str(user?.email),
    lastModifiedBy: str(user?.email),
  };
  const doc = await XMongoose.create(payload);
  return doc.toObject();
}

export async function findXById(id) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const doc = await XMongoose.findById(id).lean();
  if (!doc) throw httpError("Registro no encontrado.", 404);
  return doc;
}

export async function listXPaginated({ page, limit, ...filters } = {}) {
  const filter = { /* construir según filters */ };
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  return XMongoose.paginate(filter, {
    page: safePage,
    limit: safeLimit,
    sort: { createdAt: -1 },
  });
}

export async function updateXById(id, body, user) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const existing = await XMongoose.findById(id).exec();
  if (!existing) throw httpError("Registro no encontrado.", 404);
  const partial = await buildPayload(body, { partial: true });
  Object.assign(existing, partial);
  existing.metadata = {
    createdBy: existing.metadata?.createdBy || "",
    lastModifiedBy: str(user?.email),
  };
  await existing.save();
  return existing.toObject();
}

export async function deleteXById(id) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const deleted = await XMongoose.findByIdAndDelete(id).exec();
  if (!deleted) throw httpError("Registro no encontrado.", 404);
  return { id };
}
```

## Template del controlador

```js
import { logger } from "../utils/logger.js";
import {
  createX,
  deleteXById,
  findXById,
  listXPaginated,
  updateXById,
} from "../services/x.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const xController = {
  async create(req, res) {
    try {
      const x = await createX(req.body || {}, req.user);
      return res
        .status(201)
        .json({ ok: true, msg: "Registro creado correctamente.", x });
    } catch (e) {
      return handleError(res, e, "No se pudo crear el registro.");
    }
  },
  async getById(req, res) {
    try {
      const x = await findXById(req.params.id);
      return res.json({ ok: true, x });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el registro.");
    }
  },
  async listPaginated(req, res) {
    try {
      const result = await listXPaginated(req.query || {});
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar los registros.");
    }
  },
  async update(req, res) {
    try {
      const x = await updateXById(req.params.id, req.body || {}, req.user);
      return res.json({
        ok: true,
        msg: "Registro actualizado correctamente.",
        x,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar el registro.");
    }
  },
  async remove(req, res) {
    try {
      const result = await deleteXById(req.params.id);
      return res.json({
        ok: true,
        msg: "Registro eliminado correctamente.",
        deletedId: result.id,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar el registro.");
    }
  },
};
```

## Template del router

```js
import express from "express";
import { xController } from "../controllers/x.controller.js";
import { adminGuarded, guarded } from "../middlewares/authChains.js";

export const xRouter = express.Router();

xRouter.get("/paginated", ...guarded, xController.listPaginated);
xRouter.post("/", ...guarded, xController.create);
xRouter.get("/:id", ...guarded, xController.getById);
xRouter.put("/:id", ...guarded, xController.update);
xRouter.delete("/:id", ...adminGuarded, xController.remove);
```

## Template del cliente API

```js
export function createX(payload) {
  return apiFetch("/api/x", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function xPaginated(params) {
  const q = new URLSearchParams(params || {});
  return apiFetch(`/api/x/paginated?${q}`);
}

export function getX(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/x/${enc}`);
}

export function updateX(id, payload) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/x/${enc}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteX(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/x/${enc}`, { method: "DELETE" });
}
```

## Flujo recomendado al crear un módulo nuevo

1. Definir con el usuario los campos exactos del schema (tipos, requeridos,
   subdocumentos).
2. Crear el modelo Mongoose con `mongoose-paginate-v2` y `timestamps`.
3. Implementar `buildPayload(body, { partial })` con normalización (`str`,
   parseo numérico, `Boolean(...)`, validación de referencias a otras
   colecciones).
4. Crear `create / findById / listPaginated / updateById / deleteById` en
   el servicio.
5. Espejar el servicio en el controlador (un método por acción HTTP), todos
   con el mismo `handleError`.
6. Definir el router con `guarded` o `adminGuarded` según el caso y
   registrarlo en `app.js`.
7. Exponer las funciones equivalentes en `SICEN-front/src/api/client.js`,
   documentando arriba la forma del payload.
8. Si el front necesita borrar registros, usar el skill
   [`delete-flow-pattern`](../delete-flow-pattern/SKILL.md) para la UI.

## Ejemplos vivos en el repo

| Entidad | Modelo | Servicio | Controlador | Router |
|---|---|---|---|---|
| Buques | `vessels.mongoose.js` | `vessels.service.js` | `vessels.controller.js` | `vessels.router.js` |
| Gente de mar | `seafarers.mongoose.js` | `seafarers.service.js` | `seafarers.controller.js` | `seafarers.router.js` |
| Unidades | `units.mongoose.js` | `units.service.js` | `units.controller.js` | `units.router.js` |
| Inspecciones de buques | `vesselInspections.mongoose.js` | `vesselInspections.service.js` | `vesselInspections.controller.js` | `vesselInspections.router.js` |
| Movimientos deportivos | `sportMovements.mongoose.js` | `sportMovements.service.js` | `sportMovements.controller.js` | `sportMovements.router.js` |

Las **multas** (`carFines`, `shipFines`, `personalFines`) siguen un patrón
**legacy** con DAO/Model wrapper y respuestas `{ status, payload }`. **No
replicarlo** para entidades nuevas: usar el patrón documentado arriba.
