import { describe, expect, it } from "vitest";
import {
  isProtectedFileUrl,
  toAuthenticatedFileUrl,
} from "./authenticatedFileUrl.js";

describe("toAuthenticatedFileUrl", () => {
  it("convierte /uploads/:type/:filename a /api/files/:type/:filename", () => {
    expect(toAuthenticatedFileUrl("/uploads/avatars/foto.jpg")).toBe(
      "/api/files/avatars/foto.jpg"
    );
    expect(
      toAuthenticatedFileUrl("/uploads/inspectionsERP/abc.pdf")
    ).toBe("/api/files/inspectionsERP/abc.pdf");
  });

  it("deja intactas las URLs ya autenticadas y las públicas", () => {
    expect(toAuthenticatedFileUrl("/api/files/avatars/foto.jpg")).toBe(
      "/api/files/avatars/foto.jpg"
    );
    expect(toAuthenticatedFileUrl("/img/avatar.png")).toBe("/img/avatar.png");
  });
});

describe("isProtectedFileUrl", () => {
  it("reconoce rutas viejas y nuevas de uploads", () => {
    expect(isProtectedFileUrl("/uploads/carFineProves/a.jpg")).toBe(true);
    expect(isProtectedFileUrl("/api/files/carFineProves/a.jpg")).toBe(true);
    expect(isProtectedFileUrl("/img/avatar.png")).toBe(false);
  });
});
