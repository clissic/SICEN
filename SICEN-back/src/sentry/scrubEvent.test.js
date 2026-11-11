import { describe, expect, it } from "vitest";
import {
  beforeBreadcrumb,
  beforeSend,
  SCRUB_REDACTED,
  scrubHeaders,
} from "./scrubEvent.js";

/** JWT de fixture armado en runtime (evita literales eyJ… que disparan secret scanners). */
function buildSampleJwt() {
  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
  // La firma debe tener ≥10 chars (mismo umbral que scrubEvent.JWT_LIKE).
  return [
    b64url({ alg: "HS256", typ: "JWT" }),
    b64url({ sub: "1234567890" }),
    "x".repeat(12),
  ].join(".");
}

const SAMPLE_JWT = buildSampleJwt();

describe("scrubHeaders", () => {
  it("redacta Authorization, Cookie y Set-Cookie", () => {
    const scrubbed = scrubHeaders({
      Authorization: `Bearer ${SAMPLE_JWT}`,
      Cookie: "sid=abc",
      "Set-Cookie": "sid=abc; HttpOnly",
      "Content-Type": "application/json",
    });
    expect(scrubbed.Authorization).toBe(SCRUB_REDACTED);
    expect(scrubbed.Cookie).toBe(SCRUB_REDACTED);
    expect(scrubbed["Set-Cookie"]).toBe(SCRUB_REDACTED);
    expect(scrubbed["Content-Type"]).toBe("application/json");
  });
});

describe("beforeSend", () => {
  it("elimina body del request y redacta headers sensibles", () => {
    const event = {
      request: {
        headers: {
          authorization: "Bearer secret",
          accept: "application/json",
        },
        data: { password: "secreto", totp: "123456", email: "a@b.c" },
        cookies: { sid: "x" },
      },
      extra: { token: "abc", note: "ok" },
      user: { id: "u1", email: "a@b.c", ip_address: "1.2.3.4" },
    };

    const out = beforeSend(event);
    expect(out.request.data).toBe(SCRUB_REDACTED);
    expect(out.request.cookies).toBe(SCRUB_REDACTED);
    expect(out.request.headers.authorization).toBe(SCRUB_REDACTED);
    expect(out.request.headers.accept).toBe("application/json");
    expect(out.extra.token).toBe(SCRUB_REDACTED);
    expect(out.extra.note).toBe("ok");
    expect(out.user.email).toBeUndefined();
    expect(out.user.ip_address).toBeUndefined();
    expect(out.user.id).toBe("u1");
  });

  it("redacta JWT embebidos en strings", () => {
    const out = beforeSend({
      request: { query_string: `t=${SAMPLE_JWT}` },
    });
    expect(out.request.query_string).toContain(SCRUB_REDACTED);
    expect(out.request.query_string).not.toContain(SAMPLE_JWT);
  });
});

describe("beforeBreadcrumb", () => {
  it("redacta bodies y headers en breadcrumbs HTTP", () => {
    const bc = beforeBreadcrumb({
      type: "http",
      data: {
        headers: { Authorization: "Bearer x", Accept: "text/plain" },
        body: { password: "x", mfa: "123456" },
      },
      message: `token ${SAMPLE_JWT}`,
    });
    expect(bc.data.headers.Authorization).toBe(SCRUB_REDACTED);
    expect(bc.data.headers.Accept).toBe("text/plain");
    expect(bc.data.body).toBe(SCRUB_REDACTED);
    expect(bc.message).toContain(SCRUB_REDACTED);
    expect(bc.message).not.toContain(SAMPLE_JWT);
  });
});
