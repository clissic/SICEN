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

describe("scrubHeaders (front)", () => {
  it("redacta Authorization y Cookie", () => {
    const scrubbed = scrubHeaders({
      Authorization: `Bearer ${SAMPLE_JWT}`,
      Cookie: "a=1",
      Accept: "application/json",
    });
    expect(scrubbed.Authorization).toBe(SCRUB_REDACTED);
    expect(scrubbed.Cookie).toBe(SCRUB_REDACTED);
    expect(scrubbed.Accept).toBe("application/json");
  });
});

describe("beforeSend (front)", () => {
  it("filtra body, passwords, MFA y headers", () => {
    const out = beforeSend({
      request: {
        headers: { authorization: "Bearer x" },
        data: { password: "p", totp: "123456", code: "999999" },
      },
      extra: { mfaToken: "mfa", note: "ok" },
    });
    expect(out.request.data).toBe(SCRUB_REDACTED);
    expect(out.request.headers.authorization).toBe(SCRUB_REDACTED);
    expect(out.extra.mfaToken).toBe(SCRUB_REDACTED);
    expect(out.extra.note).toBe("ok");
  });
});

describe("beforeBreadcrumb (front)", () => {
  it("redacta body de breadcrumb", () => {
    const bc = beforeBreadcrumb({
      data: { body: { password: "x" }, headers: { Cookie: "a=1" } },
    });
    expect(bc.data.body).toBe(SCRUB_REDACTED);
    expect(bc.data.headers.Cookie).toBe(SCRUB_REDACTED);
  });
});
