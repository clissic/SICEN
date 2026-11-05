import helmet from "helmet";

/** Tiles Leaflet: CARTO Voyager/dark_all, OpenSeaMap seamarks, OSM de respaldo. */
const LEAFLET_TILE_ORIGINS = [
  "https://basemaps.cartocdn.com",
  "https://*.basemaps.cartocdn.com",
  "https://tiles.openseamap.org",
  "https://tile.openstreetmap.org",
  "https://*.tile.openstreetmap.org",
];

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://cdn.jsdelivr.net",
        ...LEAFLET_TILE_ORIGINS,
      ],
      fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
      connectSrc: [
        "'self'",
        ...LEAFLET_TILE_ORIGINS,
        "https://stream.aisstream.io",
        "https://api.skylight.earth",
        "https://gateway.api.globalfishingwatch.org",
        "https://services1.arcgis.com",
        "https://api.open-meteo.com",
        "https://marine-api.open-meteo.com",
        "https://www.marineregions.org",
        "wss:",
      ],
      /* blob: cubre object URLs de AuthenticatedImage (img) y previews de
         PDF autenticados abiertos en pestaña/iframe (frame). No se usa
         <object>/<embed> para /api/files, así que object-src queda 'none'. */
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests:
        process.env.NODE_ENV === "production" ? [] : null,
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
