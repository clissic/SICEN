import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://cdn.jsdelivr.net",
        "https://*.basemaps.cartocdn.com",
        "https://tiles.openseamap.org",
        "https://*.tile.openstreetmap.org",
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://cdn.jsdelivr.net",
      ],
      connectSrc: [
        "'self'",
        "https://*.basemaps.cartocdn.com",
        "https://tiles.openseamap.org",
        "https://*.tile.openstreetmap.org",
        "https://stream.aisstream.io",
        "https://api.skylight.earth",
        "https://gateway.api.globalfishingwatch.org",
        "https://services1.arcgis.com",
        "https://api.open-meteo.com",
        "https://marine-api.open-meteo.com",
        "https://www.marineregions.org",
        "wss:",
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
});
