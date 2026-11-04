import { useEffect, useState } from "react";
import { getAuthToken } from "../api/client.js";
import { toAuthenticatedFileUrl } from "../utils/authenticatedFileUrl.js";

/**
 * Hook para cargar un archivo protegido con autenticación.
 * 
 * Dado que <img> y <a> no pueden enviar headers de Authorization,
 * este hook descarga el archivo con fetch (incluyendo el Bearer token),
 * lo convierte a un blob y devuelve un object URL que puede usarse
 * en src o href.
 * 
 * @param {string} url - URL del archivo (antigua o nueva)
 * @returns {{ blobUrl: string | null, loading: boolean, error: Error | null }}
 */
export function useAuthenticatedFile(url) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    async function loadFile() {
      setLoading(true);
      setError(null);
      
      try {
        const authUrl = toAuthenticatedFileUrl(url);
        const token = getAuthToken();
        
        const response = await fetch(authUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        if (cancelled) {
          // Si el componente se desmontó mientras descargábamos, no actualizar el estado
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setBlobUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFile();

    // Cleanup: revocar el object URL cuando el componente se desmonte o url cambie
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  return { blobUrl, loading, error };
}

/**
 * Componente para renderizar una imagen autenticada.
 * 
 * Usa el hook useAuthenticatedFile internamente y muestra un placeholder
 * mientras carga o si hay error.
 */
export function AuthenticatedImage({ src, alt, className, style, placeholder, errorPlaceholder, ...props }) {
  const { blobUrl, loading, error } = useAuthenticatedFile(src);

  if (loading) {
    return placeholder || (
      <div className={className} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa" }}>
        <div className="spinner-border spinner-border-sm text-secondary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error || !blobUrl) {
    return errorPlaceholder || (
      <div className={className} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa", color: "#6c757d" }}>
        <i className="bi bi-image" style={{ fontSize: "2rem" }}></i>
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} style={style} {...props} />;
}

/**
 * Componente para renderizar un enlace de descarga autenticado.
 * 
 * Usa el hook useAuthenticatedFile internamente para obtener el blob URL.
 */
export function AuthenticatedDownloadLink({ href, children, className, download, ...props }) {
  const { blobUrl, loading, error } = useAuthenticatedFile(href);

  if (loading) {
    return (
      <span className={className} {...props}>
        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        {children || "Cargando..."}
      </span>
    );
  }

  if (error || !blobUrl) {
    return (
      <span className={className} style={{ opacity: 0.5, cursor: "not-allowed" }} {...props}>
        {children || "No disponible"}
      </span>
    );
  }

  return (
    <a href={blobUrl} className={className} download={download} {...props}>
      {children}
    </a>
  );
}
