const AUTH_TOKEN_KEY = "sicen_auth_token";

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
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
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

export function userForUpdate(id) {
  return apiFetch(
    `/api/users/update/userUpdate?id=${encodeURIComponent(id)}`
  );
}

export function userUpdate(id, body) {
  return apiFetch(`/api/users/updateUser/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
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

export function createUserAdmin(body) {
  return apiFetch("/api/users/createAndSendEmail", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
