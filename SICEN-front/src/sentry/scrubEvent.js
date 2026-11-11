/**
 * Redacción de datos sensibles antes de enviar eventos/breadcrumbs a Sentry (front).
 * Sistema Prefectura: nunca enviar Authorization, Cookie, JWT, passwords, MFA/TOTP ni bodies.
 */

const REDACTED = "[Filtered]";

const SENSITIVE_HEADER =
  /^(authorization|cookie|set-cookie|x-api-key|x-auth-token)$/i;

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|password|passwd|pwd|secret|token|access[_-]?token|refresh[_-]?token|id[_-]?token|jwt|bearer|mfa|mfa[_-]?token|mfa[_-]?challenge|totp|otp|code|recovery[_-]?code|google[_-]?pass|api[_-]?key|api[_-]?token)$/i;

const JWT_LIKE =
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

export function isSensitiveKey(key) {
  if (key == null) return false;
  return SENSITIVE_KEY.test(String(key));
}

export function isSensitiveHeader(name) {
  if (name == null) return false;
  return SENSITIVE_HEADER.test(String(name));
}

export function scrubStringValue(value) {
  if (typeof value !== "string") return value;
  if (!value) return value;
  return value.replace(JWT_LIKE, REDACTED);
}

export function scrubHeaders(headers) {
  if (!headers || typeof headers !== "object") return headers;
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] =
      isSensitiveHeader(key) || isSensitiveKey(key) ? REDACTED : scrubDeep(value);
  }
  return out;
}

export function scrubDeep(value, opts = {}) {
  const depth = opts.depth ?? 0;
  if (depth > 8) return REDACTED;
  if (value == null) return value;
  if (typeof value === "string") return scrubStringValue(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => scrubDeep(item, { depth: depth + 1 }));
  }
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveKey(key) || isSensitiveHeader(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = scrubDeep(child, { depth: depth + 1 });
    }
  }
  return out;
}

export function beforeSend(event) {
  if (!event || typeof event !== "object") return event;

  if (event.request) {
    const req = { ...event.request };
    if (req.headers) {
      req.headers = scrubHeaders(req.headers);
    }
    if (req.cookies) {
      req.cookies = REDACTED;
    }
    if ("data" in req) {
      req.data = REDACTED;
    }
    if (typeof req.query_string === "string") {
      req.query_string = scrubStringValue(req.query_string);
    }
    event.request = req;
  }

  if (event.extra) {
    event.extra = scrubDeep(event.extra);
  }
  if (event.contexts) {
    event.contexts = scrubDeep(event.contexts);
  }
  if (event.user) {
    const { ip_address: _ip, email: _email, username: _user, ...rest } =
      event.user;
    event.user = scrubDeep(rest);
  }
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs
      .map((b) => beforeBreadcrumb(b))
      .filter(Boolean);
  }

  return event;
}

export function beforeBreadcrumb(breadcrumb) {
  if (!breadcrumb || typeof breadcrumb !== "object") return breadcrumb;
  const bc = { ...breadcrumb };
  if (bc.data && typeof bc.data === "object") {
    const data = { ...bc.data };
    if (data.headers) {
      data.headers = scrubHeaders(data.headers);
    }
    if ("body" in data || "data" in data || "request_body" in data) {
      if ("body" in data) data.body = REDACTED;
      if ("data" in data) data.data = REDACTED;
      if ("request_body" in data) data.request_body = REDACTED;
    }
    bc.data = scrubDeep(data);
  }
  if (typeof bc.message === "string") {
    bc.message = scrubStringValue(bc.message);
  }
  return bc;
}

export const SCRUB_REDACTED = REDACTED;
