const AUTH_TOKEN_KEY = "sicen_auth_token";
const USER_UNIT_CACHE_KEY = "sicen_user_unit_cache";

/** `{ acronym: string, unit: object | null }` — datos de la unidad del usuario en sesión. */
export function readUserUnitCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_UNIT_CACHE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.acronym !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function writeUserUnitCache(acronym, unitDoc) {
  if (typeof window === "undefined") return;
  const a = acronym?.trim()?.toUpperCase();
  if (!a) {
    localStorage.removeItem(USER_UNIT_CACHE_KEY);
    return;
  }
  localStorage.setItem(
    USER_UNIT_CACHE_KEY,
    JSON.stringify({ acronym: a, unit: unitDoc ?? null })
  );
}

export function clearUserUnitCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_UNIT_CACHE_KEY);
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  setAuthToken(null);
  clearUserUnitCache();
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAuthToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.msg || data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    if (data?.code) err.code = data.code;
    throw err;
  }
  return data;
}

export function completeUserTutorial() {
  return apiFetch("/api/users/complete-user-tutorial", { method: "POST" });
}

export function getMe() {
  return apiFetch("/api/sessions/me");
}

/** .pdf / .doc / .docx en `files/units/<su unidad>/DIV-I/Procedimientos`. */
export function listProcedimientosDivIFiles() {
  return apiFetch("/api/unit-files/procedimientos-div-i");
}

/** .pdf / .doc / .docx en `files/units/<su unidad>/DIV-II/Procedimientos`. */
export function listProcedimientosDivIIFiles() {
  return apiFetch("/api/unit-files/procedimientos-div-ii");
}

/** Sube un archivo a la carpeta Procedimientos de la unidad del usuario (JWT). */
export async function uploadProcedimientosFile(file, division) {
  const path =
    division === "DIV-II"
      ? "/api/unit-files/procedimientos-div-ii/upload"
      : "/api/unit-files/procedimientos-div-i/upload";
  const token = getAuthToken();
  const form = new FormData();
  form.append("file", file);
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.msg || data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Unidades registradas en BD (admin). */
export function listUnitsRegistered() {
  return apiFetch("/api/units");
}

/** Listado público mínimo (`{ acronym, name }`) para formularios sin sesión. */
export function listUnitsRegisteredPublic() {
  return apiFetch("/api/units/public");
}

/** Alta de unidad (admin). `formData`: nombre, sigla (4–6 caracteres), …; escudo opcional (sin archivo → URL PRENA.png). */
export async function createUnit(formData) {
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch("/api/units", {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.msg || data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Detalle de una unidad por sigla (sesión iniciada). */
export function getUnit(acronym) {
  const enc = encodeURIComponent(acronym);
  return apiFetch(`/api/units/${enc}`);
}

/** Unidades que cumplen aniversario hoy (TZ Uruguay). */
export function getUnitAnniversariesToday() {
  return apiFetch(`/api/units/anniversaries/today`);
}

/** Actualiza una unidad (admin). `formData`: campos de alta; `sigla` puede cambiar; escudo opcional. */
export async function updateUnit(acronym, formData) {
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const enc = encodeURIComponent(acronym);
  const res = await fetch(`/api/units/${enc}`, {
    method: "PUT",
    credentials: "include",
    headers,
    body: formData,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.msg || data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Elimina una unidad por sigla (admin). */
export function deleteUnit(acronym) {
  const enc = encodeURIComponent(acronym);
  return apiFetch(`/api/units/${enc}`, { method: "DELETE" });
}

/** Listado paginado del catálogo `licences` (JWT). `kind`: title | license (default license). */
export function licencesCatalogList({ page = 1, pageSize = 10, q = "", kind }) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const t = String(q ?? "").trim();
  if (t) params.set("q", t);
  const k = String(kind ?? "").trim().toLowerCase();
  if (k === "title") params.set("kind", "title");
  else params.set("kind", "license");
  return apiFetch(`/api/licences?${params}`);
}

/** Alta en catálogo `licences` (JWT). */
export function createLicenceCatalogEntry(payload) {
  return apiFetch("/api/licences", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Actualiza un registro del catálogo `licences` (JWT). */
export function updateLicenceCatalogEntry(id, payload) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/licences/${enc}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** Elimina un registro del catálogo `licences` (JWT). */
export function deleteLicenceCatalogEntry(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/licences/${enc}`, { method: "DELETE" });
}

/** Listado paginado del catálogo `titles` (JWT). */
export function titlesCatalogList({ page = 1, pageSize = 10, q = "" }) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const t = String(q ?? "").trim();
  if (t) params.set("q", t);
  return apiFetch(`/api/titles?${params}`);
}

/** Alta en catálogo `titles` (JWT). */
export function createTitleCatalogEntry(payload) {
  return apiFetch("/api/titles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Actualiza un registro del catálogo `titles` (JWT). */
export function updateTitleCatalogEntry(id, payload) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/titles/${enc}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** Elimina un registro del catálogo `titles` (JWT). */
export function deleteTitleCatalogEntry(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/titles/${enc}`, { method: "DELETE" });
}

/** Alta de gente de mar (JWT). Solo datos iniciales; licencias, cursos, etc. en otras pantallas. */
export function createSeafarer(payload) {
  return apiFetch("/api/seafarers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Estadísticas agregadas de gente de mar para el menú de gestión (JWT). */
export function seafarersStats() {
  return apiFetch("/api/seafarers/stats");
}

/** Busca gente de mar por DNI, pasaporte o CC (JWT). */
export function findSeafarerByDocument(
  documentType,
  documentNumber,
  ccSeries = "",
  ccNumber = "",
) {
  const q = new URLSearchParams({
    documentType: String(documentType ?? "").trim(),
    documentNumber: String(documentNumber ?? "").trim(),
  });
  if (String(documentType ?? "").trim() === "CC") {
    q.set("ccSeries", String(ccSeries ?? "").trim());
    q.set("ccNumber", String(ccNumber ?? "").trim());
  }
  return apiFetch(`/api/seafarers/by-document?${q}`);
}

export function updateSeafarerBasicData(seafarerId, payload) {
  const sid = encodeURIComponent(String(seafarerId ?? "").trim());
  return apiFetch(`/api/seafarers/${sid}/basic-data`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSeafarer(seafarerId) {
  const sid = encodeURIComponent(String(seafarerId ?? "").trim());
  return apiFetch(`/api/seafarers/${sid}`, { method: "DELETE" });
}

export function addSeafarerTitle(seafarerId, entry) {
  return apiFetch(`/api/seafarers/${encodeURIComponent(seafarerId)}/titles`, {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
}

export function updateSeafarerHeldTitle(seafarerId, heldEntryId, entry) {
  const sid = encodeURIComponent(String(seafarerId ?? "").trim());
  const eid = encodeURIComponent(String(heldEntryId ?? "").trim());
  return apiFetch(`/api/seafarers/${sid}/titles/${eid}`, {
    method: "PATCH",
    body: JSON.stringify({ entry }),
  });
}

export function deleteSeafarerHeldTitle(seafarerId, heldEntryId) {
  const sid = encodeURIComponent(String(seafarerId ?? "").trim());
  const eid = encodeURIComponent(String(heldEntryId ?? "").trim());
  return apiFetch(`/api/seafarers/${sid}/titles/${eid}`, { method: "DELETE" });
}

export function addSeafarerHeldLicense(seafarerId, entry) {
  return apiFetch(
    `/api/seafarers/${encodeURIComponent(seafarerId)}/held-licenses`,
    {
      method: "POST",
      body: JSON.stringify({ entry }),
    },
  );
}

export function updateSeafarerHeldLicense(seafarerId, heldEntryId, entry) {
  const sid = encodeURIComponent(String(seafarerId ?? "").trim());
  const eid = encodeURIComponent(String(heldEntryId ?? "").trim());
  return apiFetch(`/api/seafarers/${sid}/held-licenses/${eid}`, {
    method: "PATCH",
    body: JSON.stringify({ entry }),
  });
}

export function deleteSeafarerHeldLicense(seafarerId, heldEntryId) {
  const sid = encodeURIComponent(String(seafarerId ?? "").trim());
  const eid = encodeURIComponent(String(heldEntryId ?? "").trim());
  return apiFetch(`/api/seafarers/${sid}/held-licenses/${eid}`, {
    method: "DELETE",
  });
}

export function addSeafarerLicense(seafarerId, bucket, entry) {
  return apiFetch(`/api/seafarers/${encodeURIComponent(seafarerId)}/licenses`, {
    method: "POST",
    body: JSON.stringify({ bucket, entry }),
  });
}

export function addSeafarerCourse(seafarerId, entry) {
  return apiFetch(`/api/seafarers/${encodeURIComponent(seafarerId)}/courses`, {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
}

export function addSeafarerSanction(seafarerId, entry) {
  return apiFetch(`/api/seafarers/${encodeURIComponent(seafarerId)}/sanctions`, {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
}

export function addSeafarerObservation(seafarerId, entry) {
  return apiFetch(
    `/api/seafarers/${encodeURIComponent(seafarerId)}/observations`,
    {
      method: "POST",
      body: JSON.stringify({ entry }),
    },
  );
}

/** Listados agregados para METADATOS (JWT): cursos / sanciones en todos los marineros. */
export function seafarerMetadataCourses({ page = 1, pageSize = 10, q = "" }) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const t = String(q ?? "").trim();
  if (t) params.set("q", t);
  return apiFetch(`/api/seafarers/metadata/courses?${params}`);
}

export function seafarerMetadataSanctions({ page = 1, pageSize = 10, q = "" }) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const t = String(q ?? "").trim();
  if (t) params.set("q", t);
  return apiFetch(`/api/seafarers/metadata/sanctions?${params}`);
}

/** Alta inicial de buque (JWT). */
export function createVessel(payload) {
  return apiFetch("/api/vessels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Estadísticas agregadas de buques para el menú de gestión (JWT). */
export function vesselsStats() {
  return apiFetch("/api/vessels/stats");
}

/** Consulta paginada de buques (JWT). */
export function vesselsPaginated(params) {
  const q = new URLSearchParams(params);
  return apiFetch(`/api/vessels/paginated?${q}`);
}

/** Lista todos los buques paginados, sin filtros. */
export function vesselsAllPaginated(params) {
  const q = new URLSearchParams(params);
  return apiFetch(`/api/vessels/all-paginated?${q}`);
}

/**
 * Lista buques por tipo (Ultramar / Cabotaje / Deportivo) para alimentar
 * comboboxes. Devuelve `{ ok, vessels: [{ _id, vesselType, name, imoNumber,
 * nationalRegistryNumber, flagState, portOfRegistry }] }`. Hasta 500 buques;
 * pensado para pickers chicos (p. ej. Ultramar). Para Deportivo / catálogos
 * grandes usar `vesselsByTypeSearch`.
 */
export function vesselsByType(vesselType) {
  const t = encodeURIComponent(String(vesselType ?? "").trim());
  return apiFetch(`/api/vessels/by-type/${t}`);
}

/**
 * Búsqueda parcial de buques por tipo + nombre y/o matrícula (JWT).
 * Params: `{ vesselType, name?, nationalRegistryNumber?, limit? }`.
 * El backend exige ≥ 2 caracteres en al menos un filtro; default limit 15.
 */
export function vesselsByTypeSearch(params = {}) {
  const t = encodeURIComponent(String(params.vesselType ?? "").trim());
  const q = new URLSearchParams();
  if (params.name) q.set("name", String(params.name).trim());
  if (params.nationalRegistryNumber) {
    q.set(
      "nationalRegistryNumber",
      String(params.nationalRegistryNumber).trim()
    );
  }
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiFetch(
    `/api/vessels/by-type/${t}/search${qs ? `?${qs}` : ""}`
  );
}

/** Datos del buque para la vista de certificados (JWT). */
export function getVesselForCertificates(vesselId) {
  const enc = encodeURIComponent(String(vesselId ?? "").trim());
  return apiFetch(`/api/vessels/by-business-id/${enc}`);
}

/** Formulario plano del buque para edición (JWT). */
export function getVesselForEdit(vesselId) {
  const enc = encodeURIComponent(String(vesselId ?? "").trim());
  return apiFetch(`/api/vessels/by-business-id/${enc}/for-edit`);
}

/** Actualiza datos de registro del buque (JWT). */
export function updateVessel(vesselId, payload) {
  const enc = encodeURIComponent(String(vesselId ?? "").trim());
  return apiFetch(`/api/vessels/by-business-id/${enc}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Elimina el buque por id de negocio o _id MongoDB (JWT). */
export function deleteVessel(vesselId) {
  const enc = encodeURIComponent(String(vesselId ?? "").trim());
  return apiFetch(`/api/vessels/by-business-id/${enc}`, {
    method: "DELETE",
  });
}

/** Guarda o actualiza un certificado del buque (`certificates` en MongoDB). */
export function saveVesselCertificate(vesselId, payload) {
  const enc = encodeURIComponent(String(vesselId ?? "").trim());
  return apiFetch(`/api/vessels/by-business-id/${enc}/certificates`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Añade un certificado adicional (`other_*`) a la lista del buque (persistido). */
export function addVesselExtraCertificatePreset(vesselId, key) {
  const enc = encodeURIComponent(String(vesselId ?? "").trim());
  return apiFetch(
    `/api/vessels/by-business-id/${enc}/extra-certificate-presets`,
    {
      method: "POST",
      body: JSON.stringify({ key }),
    }
  );
}

/**
 * Inspecciones de buques (PSC / Estado Rector de Puertos).
 * El backend valida que `vesselId` pertenezca a la colección `vessels`.
 *
 * Estructura de payload:
 * {
 *   vesselId: string,            // _id de Mongo o id de negocio del buque
 *   arrivalDate: string|Date,    // fecha de ingreso al puerto
 *   inspectionDate: string|Date, // fecha en que se realizó la inspección
 *                                // (suele coincidir con arrivalDate)
 *   arrivalPort: string,         // puerto de ingreso
 *   cialaPriority: string,       // prioridad CIALA (texto libre)
 *   inspectionPerformed: boolean,
 *   inspectors?: string[],       // emails (lowercase) de los inspectores
 *                                 // que firmaron la diligencia. Opcional:
 *                                 // si se omite, el backend agrega solo el
 *                                 // email del usuario autenticado cuando
 *                                 // el registro pasa a `inspectionPerformed:
 *                                 // true`.
 *   deficiencies: Array<{
 *     code: string,
 *     name: string,
 *     rule: string,
 *     actionsTaken: number[],
 *     ISMrelated: boolean,
 *   }>,
 * }
 *
 * `pdfFile` (opcional) es un `File` con el PDF de la inspección (≤ 1 MB).
 * Si está presente, la request se manda como `multipart/form-data` y los
 * campos no string (`deficiencies`, `inspectors`, `inspectionPerformed`) se
 * serializan;
 * el archivo se almacena en `SICEN-back/storage/inspectionsERP/<_id>.pdf` y
 * la URL pública (`/uploads/inspectionsERP/...`) queda guardada en el campo
 * `inspectionPDF` del documento.
 */
export function createVesselInspection(payload, pdfFile = null) {
  if (pdfFile instanceof File) {
    const fd = new FormData();
    appendInspectionFields(fd, payload);
    fd.append("inspectionPDF", pdfFile, pdfFile.name);
    return apiFetch("/api/vesselInspections", {
      method: "POST",
      body: fd,
    });
  }
  return apiFetch("/api/vesselInspections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function appendInspectionFields(fd, payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  if (p.vesselId != null) fd.append("vesselId", String(p.vesselId));
  if (p.arrivalDate != null) fd.append("arrivalDate", String(p.arrivalDate));
  if (p.inspectionDate != null) {
    fd.append("inspectionDate", String(p.inspectionDate));
  }
  if (p.arrivalPort != null) fd.append("arrivalPort", String(p.arrivalPort));
  if (p.cialaPriority != null) {
    fd.append("cialaPriority", String(p.cialaPriority));
  }
  if (p.inspectionPerformed !== undefined) {
    fd.append("inspectionPerformed", p.inspectionPerformed ? "true" : "false");
  }
  if (Array.isArray(p.deficiencies)) {
    fd.append("deficiencies", JSON.stringify(p.deficiencies));
  }
  if (Array.isArray(p.inspectors)) {
    fd.append("inspectors", JSON.stringify(p.inspectors));
  }
  if (p.removeInspectionPDF) {
    fd.append("removeInspectionPDF", "true");
  }
}

/**
 * Lista paginada de inspecciones.
 *
 * Params soportados (todos opcionales):
 *  - `page`, `limit` — control de paginación.
 *  - `vesselId` — filtra por un buque puntual.
 *  - `arrivalPort` — filtra por puerto de ingreso (mayúsculas, exact match).
 *  - `inspectionPerformed` — boolean o "all".
 *  - `year` — año de ejercicio (filtra por `arrivalDate`).
 *  - `search` — busca por OMI o nombre del buque (case-insensitive, parcial).
 *  - `mine` — `true` para devolver sólo las inspecciones que el usuario
 *    autenticado **realizó** (su email figura en el array `inspectors`).
 *    El backend resuelve el email contra `req.user.email` del JWT. No usa
 *    `metadata.createdBy`, así que si un OSERP carga el ingreso y otro
 *    firma la diligencia, la inspección aparece en el listado del que
 *    firma (no del que cargó).
 *  - `inspectorEmail` — email arbitrario que debe figurar en `inspectors`.
 *    Equivalente a `mine` pero permite consultar al inspector de otro
 *    usuario (uso administrativo). Case-insensitive.
 *  - `inspectionDate` — string `YYYY-MM-DD`. Filtra por el día exacto en que
 *    se realizó la inspección (campo `inspectionDate` del esquema). Útil
 *    para la pantalla de eliminación.
 *  - `includePlaceholders` — `true` para incluir registros con
 *    `arrivalDate: null` (placeholder automático del alta de Ultramar).
 *    Por defecto, los placeholders quedan fuera.
 */
export function vesselInspectionsPaginated(params) {
  const q = new URLSearchParams();
  const p = params && typeof params === "object" ? params : {};
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined || value === null || value === "") continue;
    q.set(key, String(value));
  }
  return apiFetch(`/api/vesselInspections/paginated?${q}`);
}

/** Años con inspecciones registradas, descendentes (más reciente primero). */
export function vesselInspectionYears() {
  return apiFetch("/api/vesselInspections/years");
}

/**
 * Estadísticas del módulo Inspecciones acotadas a un ejercicio anual.
 * Respuesta:
 * {
 *   ok: true,
 *   stats: {
 *     year, totalArrivals, totalInspections,
 *     inspectionsWithDeficiencies, inspectionsClean, inspectionsWithIsm,
 *     totalDeficiencies, avgDeficienciesPerInspection,
 *     byPriority: { p1, p2, noPriority } con { arrivals, inspections, deficient, deficientPct },
 *     topPorts: [{ port, p1Arrivals, p1Inspections, p1CoveragePct }] (top 5 por cobertura P1),
 *     topDeficiencies: [{ code, count }],
 *     byInspector: [{ email, firstName, lastName, rank, unit, avatar, count, countP1, countP2 }]
 *       — atribuye cada inspección a los emails del array `inspectors` del
 *       documento (no a `metadata.createdBy`). Si una inspección tiene
 *       varios inspectores, cada uno suma 1 a su contador.
 *   }
 * }
 */
export function vesselInspectionsStats(year) {
  const q = new URLSearchParams({ year: String(year ?? "") });
  return apiFetch(`/api/vesselInspections/stats?${q}`);
}

export function getVesselInspection(inspectionId) {
  const enc = encodeURIComponent(String(inspectionId ?? "").trim());
  return apiFetch(`/api/vesselInspections/${enc}`);
}

/**
 * Actualiza una inspección. Si `pdfFile` es un `File`, se envía como
 * multipart y reemplaza el PDF previo en disco. Si `payload.removeInspectionPDF`
 * es `true`, el backend elimina el PDF existente y deja el campo vacío.
 */
export function updateVesselInspection(inspectionId, payload, pdfFile = null) {
  const enc = encodeURIComponent(String(inspectionId ?? "").trim());
  if (pdfFile instanceof File) {
    const fd = new FormData();
    appendInspectionFields(fd, payload);
    fd.append("inspectionPDF", pdfFile, pdfFile.name);
    return apiFetch(`/api/vesselInspections/${enc}`, {
      method: "PUT",
      body: fd,
    });
  }
  return apiFetch(`/api/vesselInspections/${enc}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteVesselInspection(inspectionId) {
  const enc = encodeURIComponent(String(inspectionId ?? "").trim());
  return apiFetch(`/api/vesselInspections/${enc}`, { method: "DELETE" });
}

/** Borra un archivo en Procedimientos (`relativePath` como en el listado). */
export function deleteProcedimientoFile(division, relativePath) {
  const base =
    division === "DIV-II"
      ? "/api/unit-files/procedimientos-div-ii/file"
      : "/api/unit-files/procedimientos-div-i/file";
  const q = `relativePath=${encodeURIComponent(relativePath)}`;
  return apiFetch(`${base}?${q}`, { method: "DELETE" });
}

export async function login(email, password) {
  const data = await apiFetch("/api/sessions/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

export async function signup(body) {
  const data = await apiFetch("/api/sessions/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

export async function logout() {
  try {
    return await apiFetch("/api/sessions/logout", { method: "POST" });
  } finally {
    clearAuthToken();
  }
}

export function carFinesPaginated(params) {
  const q = new URLSearchParams(params);
  return apiFetch(`/api/carFines/paginated?${q}`);
}

export function carFinesCounts() {
  return apiFetch(`/api/carFines/counts`);
}

export function carFinesStats(params = {}) {
  const q = new URLSearchParams(params);
  const query = q.toString();
  return apiFetch(`/api/carFines/stats${query ? `?${query}` : ""}`);
}

export function carFinesMine() {
  return apiFetch("/api/carFines/mine");
}

export function carFineCreateAndRender(fields, proveFiles = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v == null) continue;
    fd.append(k, String(v));
  }
  for (const f of proveFiles) {
    if (f) fd.append("fine_proves", f, f.name);
  }
  return apiFetch("/api/carFines/createAndRender", {
    method: "POST",
    body: fd,
  });
}

export function carFineForUpdate(fine_number) {
  return apiFetch(
    `/api/carFines/findBy/number/update?fine_number=${encodeURIComponent(fine_number)}`
  );
}

export function carFineUpdate(fine_number, body) {
  return apiFetch(`/api/carFines/update/${fine_number}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Actualiza una multa enviando también cambios en las pruebas (multipart).
 * `proveSlots`: array de 3 entradas `{ action, file? }` con `action` en
 * `"keep" | "replace" | "remove"`. Cuando hay al menos un `replace` o `remove`,
 * se manda como `multipart/form-data`; si no, cae al endpoint JSON normal.
 */
export function carFineUpdateWithProves(fine_number, fields, proveSlots) {
  const slots = Array.isArray(proveSlots) ? proveSlots.slice(0, 3) : [];
  while (slots.length < 3) slots.push({ action: "keep" });
  const hasChanges = slots.some(
    (s) => s?.action === "replace" || s?.action === "remove"
  );
  if (!hasChanges) {
    return carFineUpdate(fine_number, fields);
  }
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v == null) continue;
    fd.append(k, String(v));
  }
  slots.forEach((slot, idx) => {
    const action = slot?.action === "replace" || slot?.action === "remove"
      ? slot.action
      : "keep";
    fd.append(`prove_slot_${idx + 1}_action`, action);
    if (action === "replace" && slot?.file) {
      fd.append(`prove_slot_${idx + 1}`, slot.file, slot.file.name);
    }
  });
  return apiFetch(`/api/carFines/update/${fine_number}`, {
    method: "PUT",
    body: fd,
  });
}

export function carFineForDelete(fine_number) {
  return apiFetch(
    `/api/carFines/findBy/number/delete?fine_number=${encodeURIComponent(fine_number)}`
  );
}

export function carFineDelete(fine_number) {
  return apiFetch(`/api/carFines/delete/${fine_number}`, { method: "GET" });
}

/* ============================== Multas de buques ============================== */

export function shipFinesPaginated(params) {
  const q = new URLSearchParams(params);
  return apiFetch(`/api/shipFines/paginated?${q}`);
}

export function shipFinesStats(params = {}) {
  const q = new URLSearchParams(params);
  const query = q.toString();
  return apiFetch(`/api/shipFines/stats${query ? `?${query}` : ""}`);
}

export function shipFinesCounts() {
  return apiFetch(`/api/shipFines/counts`);
}

export function shipFineCreateAndRender(fields, proveFiles = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v == null) continue;
    fd.append(k, String(v));
  }
  for (const f of proveFiles) {
    if (f) fd.append("fine_proves", f, f.name);
  }
  return apiFetch("/api/shipFines/createAndRender", {
    method: "POST",
    body: fd,
  });
}

export function shipFineUpdate(fine_number, body) {
  return apiFetch(`/api/shipFines/update/${fine_number}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Variante multipart: igual lógica que `carFineUpdateWithProves` pero contra
 * el endpoint de multas de buques.
 */
export function shipFineUpdateWithProves(fine_number, fields, proveSlots) {
  const slots = Array.isArray(proveSlots) ? proveSlots.slice(0, 3) : [];
  while (slots.length < 3) slots.push({ action: "keep" });
  const hasChanges = slots.some(
    (s) => s?.action === "replace" || s?.action === "remove"
  );
  if (!hasChanges) {
    return shipFineUpdate(fine_number, fields);
  }
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v == null) continue;
    fd.append(k, String(v));
  }
  slots.forEach((slot, idx) => {
    const action =
      slot?.action === "replace" || slot?.action === "remove"
        ? slot.action
        : "keep";
    fd.append(`prove_slot_${idx + 1}_action`, action);
    if (action === "replace" && slot?.file) {
      fd.append(`prove_slot_${idx + 1}`, slot.file, slot.file.name);
    }
  });
  return apiFetch(`/api/shipFines/update/${fine_number}`, {
    method: "PUT",
    body: fd,
  });
}

export function shipFineForDelete(fine_number) {
  return apiFetch(
    `/api/shipFines/findBy/number/delete?fine_number=${encodeURIComponent(fine_number)}`
  );
}

export function shipFineDelete(fine_number) {
  return apiFetch(`/api/shipFines/delete/${fine_number}`, { method: "GET" });
}

/* ============================== Multas personales ============================== */

export function personalFinesPaginated(params) {
  const q = new URLSearchParams(params);
  return apiFetch(`/api/personalFines/paginated?${q}`);
}

export function personalFinesCounts() {
  return apiFetch(`/api/personalFines/counts`);
}

export function personalFinesStats(params = {}) {
  const q = new URLSearchParams(params);
  const query = q.toString();
  return apiFetch(`/api/personalFines/stats${query ? `?${query}` : ""}`);
}

export function personalFineCreateAndRender(fields, proveFiles = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v == null) continue;
    fd.append(k, String(v));
  }
  for (const f of proveFiles) {
    if (f) fd.append("fine_proves", f, f.name);
  }
  return apiFetch("/api/personalFines/createAndRender", {
    method: "POST",
    body: fd,
  });
}

export function personalFineUpdate(fine_number, body) {
  return apiFetch(`/api/personalFines/update/${fine_number}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Variante multipart: igual lógica que `carFineUpdateWithProves` pero contra
 * el endpoint de multas personales.
 */
export function personalFineUpdateWithProves(fine_number, fields, proveSlots) {
  const slots = Array.isArray(proveSlots) ? proveSlots.slice(0, 3) : [];
  while (slots.length < 3) slots.push({ action: "keep" });
  const hasChanges = slots.some(
    (s) => s?.action === "replace" || s?.action === "remove"
  );
  if (!hasChanges) {
    return personalFineUpdate(fine_number, fields);
  }
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v == null) continue;
    fd.append(k, String(v));
  }
  slots.forEach((slot, idx) => {
    const action =
      slot?.action === "replace" || slot?.action === "remove"
        ? slot.action
        : "keep";
    fd.append(`prove_slot_${idx + 1}_action`, action);
    if (action === "replace" && slot?.file) {
      fd.append(`prove_slot_${idx + 1}`, slot.file, slot.file.name);
    }
  });
  return apiFetch(`/api/personalFines/update/${fine_number}`, {
    method: "PUT",
    body: fd,
  });
}

export function personalFineForDelete(fine_number) {
  return apiFetch(
    `/api/personalFines/findBy/number/delete?fine_number=${encodeURIComponent(fine_number)}`
  );
}

export function personalFineDelete(fine_number) {
  return apiFetch(`/api/personalFines/delete/${fine_number}`, {
    method: "GET",
  });
}

export function usersPaginated(params) {
  const q = new URLSearchParams(params);
  return apiFetch(`/api/users/paginated?${q}`);
}

/** Lista completa de usuarios (admin). GET /api/users */
export function usersGetAll() {
  return apiFetch("/api/users");
}

export function userForUpdate(id) {
  return apiFetch(
    `/api/users/update/userUpdate?id=${encodeURIComponent(id)}`
  );
}

export function userUpdate(id, body, avatarFile) {
  if (avatarFile instanceof File) {
    const fd = new FormData();
    const fields = ["first_name", "last_name", "rank", "unit", "email", "role"];
    for (const key of fields) {
      if (body[key] !== undefined && body[key] !== null) {
        fd.append(key, String(body[key]));
      }
    }
    if (body.states !== undefined && body.states !== null) {
      fd.append(
        "states",
        typeof body.states === "string"
          ? body.states
          : JSON.stringify(body.states),
      );
    }
    fd.append("avatar", avatarFile);
    return apiFetch(`/api/users/updateUser/${id}`, {
      method: "PUT",
      body: fd,
    });
  }
  const { avatar: _drop, ...rest } = body;
  return apiFetch(`/api/users/updateUser/${id}`, {
    method: "PUT",
    body: JSON.stringify(rest),
  });
}

export function userForDelete(id) {
  return apiFetch(`/api/users/findBy/id/delete?id=${encodeURIComponent(id)}`);
}

export function userDelete(id) {
  return apiFetch(`/api/users/delete/${id}`);
}

export async function updatePassword(newPassword, confirmPassword) {
  const data = await apiFetch("/api/users/updatePasswordForm", {
    method: "POST",
    body: JSON.stringify({ newPassword, confirmPassword }),
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

export function updateDataRequest(body) {
  return apiFetch("/api/users/updateDataForm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function newAccountRequest(body) {
  return apiFetch("/api/users/newAccount", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function forgotPassword(email) {
  return apiFetch("/api/tokens/recoverPassword", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function validateRecoveryToken(token, email) {
  return apiFetch(
    `/api/tokens/recoverPassword?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  );
}

export function resetPassword(email, newPassword, confirmPassword) {
  return apiFetch("/api/tokens/recoverForm", {
    method: "POST",
    body: JSON.stringify({ email, newPassword, confirmPassword }),
  });
}

export function createUserAdmin(body, avatarFile) {
  if (avatarFile instanceof File) {
    const fd = new FormData();
    fd.append("first_name", body.first_name ?? "");
    fd.append("last_name", body.last_name ?? "");
    fd.append("rank", body.rank ?? "");
    fd.append("unit", body.unit ?? "");
    fd.append("email", body.email ?? "");
    fd.append("role", body.role ?? "user");
    fd.append("avatar", avatarFile);
    return apiFetch("/api/users/createAndSendEmail", {
      method: "POST",
      body: fd,
    });
  }
  return apiFetch("/api/users/createAndSendEmail", {
    method: "POST",
    body: JSON.stringify({
      first_name: body.first_name,
      last_name: body.last_name,
      rank: body.rank,
      unit: body.unit,
      email: body.email,
      role: body.role ?? "user",
      avatar: "/img/avatar.png",
    }),
  });
}

/* ——— Movimientos deportivos ——— */

/** Alta de movimiento deportivo (JWT). */
export function createSportMovement(payload) {
  return apiFetch("/api/sportMovements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * ¿El buque tiene movimiento abierto?
 * Respuesta: `{ available, msg?, openMovement? }`.
 */
export function checkSportMovementVesselAvailable(vesselId) {
  const enc = encodeURIComponent(String(vesselId || ""));
  return apiFetch(`/api/sportMovements/availability/vessel/${enc}`);
}

/** Despachos de la unidad del usuario (standBy + expired). */
export function sportMovementsDispatches(params) {
  const q = new URLSearchParams(params || {});
  return apiFetch(`/api/sportMovements/dispatches?${q}`);
}

/** Despachos confirmados (inTransit) de la unidad origen. */
export function sportMovementsConfirmedDispatches(params) {
  const q = new URLSearchParams(params || {});
  return apiFetch(`/api/sportMovements/dispatches/confirmed?${q}`);
}

/** Arribos esperados (inTransit, ETA futura) para la unidad del usuario. */
export function sportMovementsArrivals(params) {
  const q = new URLSearchParams(params || {});
  return apiFetch(`/api/sportMovements/arrivals?${q}`);
}

/** Demorados (inTransit, ETA pasada) para la unidad del usuario. */
export function sportMovementsDelayed(params) {
  const q = new URLSearchParams(params || {});
  return apiFetch(`/api/sportMovements/delayed?${q}`);
}

/** Casos cerrados (buques arribados) para la unidad destino.
 *  Pasar `onlyDelayed: true` para el historial de demorados resueltos
 *  (excluye arribos cerrados antes de la ETA).
 */
export function sportMovementsClosed(params) {
  const q = new URLSearchParams();
  const src = params || {};
  Object.entries(src).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  return apiFetch(`/api/sportMovements/closed?${q}`);
}

/** Alerta breve de demorados (legado; la UI usa `/api/notifications`). */
export function sportMovementsDelayedAlert() {
  return apiFetch("/api/sportMovements/delayed/alert");
}

export function getSportMovement(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/sportMovements/${enc}`);
}

export function updateSportMovement(id, payload) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/sportMovements/${enc}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function confirmSportMovement(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/sportMovements/${enc}/confirm`, { method: "POST" });
}

export function renewSportMovement(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/sportMovements/${enc}/renew`, { method: "POST" });
}

/** Cierra un demorado: outcome `arrived` | `maritimeIncident`. */
export function closeSportMovement(id, payload) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/sportMovements/${enc}/close`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

/**
 * Anula un movimiento confirmado (inTransit) con motivo.
 * Body: `{ reason }`.
 */
export function cancelConfirmedSportMovement(id, payload) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/sportMovements/${enc}/cancel`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export function deleteSportMovement(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/sportMovements/${enc}`, { method: "DELETE" });
}

/* ——— Notificaciones (inbox) ——— */

/** Listado paginado de notificaciones del usuario. */
export function listNotifications(params) {
  const q = new URLSearchParams(params || {});
  return apiFetch(`/api/notifications?${q}`);
}

/** Conteo de no leídas (también materializa demorados en el backend). */
export function notificationsUnreadCount() {
  return apiFetch("/api/notifications/unread-count");
}

export function markNotificationRead(id) {
  const enc = encodeURIComponent(String(id ?? "").trim());
  return apiFetch(`/api/notifications/${enc}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiFetch("/api/notifications/read-all", { method: "POST" });
}

/** Estado del bridge AIS (El Centinela). */
export function aisStatus() {
  return apiFetch("/api/ais/status");
}

/**
 * Viento a 10 m (proxy Open-Meteo + cache en backend).
 * @param {{ lat: number, lon: number }[]} points
 * @param {number} forecastHoursOffset
 */
export function windFetchPoints(
  points,
  forecastHoursOffset = 0,
  { signal } = {}
) {
  return apiFetch("/api/wind/points", {
    method: "POST",
    body: JSON.stringify({ points, forecastHoursOffset }),
    signal,
  });
}

/**
 * Corrientes superficiales (proxy Open-Meteo Marine + cache).
 * @param {{ lat: number, lon: number }[]} points
 * @param {number} forecastHoursOffset
 */
export function currentsFetchPoints(
  points,
  forecastHoursOffset = 0,
  { signal } = {}
) {
  return apiFetch("/api/currents/points", {
    method: "POST",
    body: JSON.stringify({ points, forecastHoursOffset }),
    signal,
  });
}

/**
 * Oleaje Hs + período (proxy Open-Meteo Marine + cache).
 * @param {{ lat: number, lon: number }[]} points
 * @param {number} forecastHoursOffset
 */
export function wavesFetchPoints(
  points,
  forecastHoursOffset = 0,
  { signal } = {}
) {
  return apiFetch("/api/waves/points", {
    method: "POST",
    body: JSON.stringify({ points, forecastHoursOffset }),
    signal,
  });
}

/**
 * Batimetría GEBCO (profundidad; proxy + cache).
 * @param {{ lat: number, lon: number }[]} points
 */
export function bathymetryFetchPoints(points, { signal } = {}) {
  return apiFetch("/api/bathymetry/points", {
    method: "POST",
    body: JSON.stringify({ points }),
    signal,
  });
}

/** Snapshot de buques AIS en el bbox configurado. */
export function aisVessels() {
  return apiFetch("/api/ais/vessels");
}

/**
 * Abre un stream SSE autenticado hacia `/api/ais/stream`.
 * Usa fetch + ReadableStream (EventSource no envía Authorization).
 * @param {{
 *   onSnapshot?: (vessels: object[]) => void,
 *   onUpdate?: (vessel: object) => void,
 *   onRemove?: (payload: { mmsi: string }) => void,
 *   onStatus?: (status: object) => void,
 *   onError?: (err: Error) => void,
 *   signal?: AbortSignal,
 * }} handlers
 */
export async function openAisStream(handlers = {}) {
  const token = getAuthToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/ais/stream", {
    method: "GET",
    credentials: "include",
    headers,
    signal: handlers.signal,
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      if (data?.msg) msg = data.msg;
    } catch {
      /* ignore */
    }
    const err = new Error(msg || "No se pudo abrir el stream AIS");
    err.status = res.status;
    throw err;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("El navegador no soporta streaming de respuesta.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  function dispatchEvent(eventName, dataRaw) {
    let data;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      return;
    }
    if (eventName === "snapshot") handlers.onSnapshot?.(data);
    else if (eventName === "update") handlers.onUpdate?.(data);
    else if (eventName === "remove") handlers.onRemove?.(data);
    else if (eventName === "status") handlers.onStatus?.(data);
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";
      for (const chunk of chunks) {
        if (!chunk.trim() || chunk.startsWith(":")) continue;
        let eventName = "message";
        const dataLines = [];
        for (const line of chunk.split("\n")) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }
        if (dataLines.length) {
          dispatchEvent(eventName, dataLines.join("\n"));
        }
      }
    }
  } catch (e) {
    if (e?.name === "AbortError") return;
    /* Corte de red / reinicio del API: el hook reintenta. */
    const err = e instanceof Error ? e : new Error(String(e));
    handlers.onError?.(err);
  }
}
