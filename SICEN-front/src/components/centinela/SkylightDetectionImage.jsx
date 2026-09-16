import { useEffect, useState } from "react";
import { skylightFetchImageChip } from "../../api/client.js";

/**
 * Chip óptico/SAR de una detección Skylight en la ventana de detalle.
 * Carga vía proxy autenticado (`/api/skylight/image-chip`).
 */
export function SkylightDetectionImage({ imageUrl, alt = "Imagen satelital" }) {
  const [src, setSrc] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  useEffect(() => {
    const url = String(imageUrl || "").trim();
    if (!url) {
      setSrc(null);
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;
    const ac = new AbortController();
    setStatus("loading");
    setSrc(null);

    skylightFetchImageChip(url, { signal: ac.signal })
      .then((blob) => {
        const next = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        objectUrl = next;
        setSrc(next);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled || err?.name === "AbortError") return;
        setSrc(null);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      ac.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  if (!imageUrl || status === "idle") return null;
  if (status === "error") return null;

  return (
    <figure className="centinela-skylight-chip">
      <figcaption className="centinela-skylight-chip__caption">
        Imagen satelital
      </figcaption>
      {status === "loading" ? (
        <div className="centinela-skylight-chip__placeholder" aria-busy="true">
          Cargando imagen…
        </div>
      ) : (
        <a
          href={src || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="centinela-skylight-chip__link"
          title="Abrir imagen a tamaño completo"
        >
          <img
            className="centinela-skylight-chip__img"
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
          />
        </a>
      )}
    </figure>
  );
}
