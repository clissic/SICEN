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
    throw err;
  }
  return data;
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

export function carFinesMine() {
  return apiFetch("/api/carFines/mine");
}

export function carFineCreateAndRender(body) {
  return apiFetch("/api/carFines/createAndRender", {
    method: "POST",
    body: JSON.stringify(body),
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

export function carFineForDelete(fine_number) {
  return apiFetch(
    `/api/carFines/findBy/number/delete?fine_number=${encodeURIComponent(fine_number)}`
  );
}

export function carFineDelete(fine_number) {
  return apiFetch(`/api/carFines/delete/${fine_number}`, { method: "GET" });
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
