import { useState } from "react";

/**
 * Entrada de foto de perfil por archivo .jpg (misma UX en alta y edición de usuario).
 * - `onFileChange`: archivo para subir al servidor (sin leer en memoria).
 * - `onDataUrl`: data URL (p. ej. solicitudes por correo en Mi perfil).
 */
export function UserAvatarFileInput({
  id = "user-avatar-file",
  onDataUrl,
  onFileChange,
  label = "Foto de perfil (archivo .jpg)",
}) {
  const [avatarErr, setAvatarErr] = useState("");

  async function onAvatarChange(e) {
    setAvatarErr("");
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      onFileChange?.(null);
      onDataUrl?.("");
      return;
    }

    const isJpeg =
      file.type === "image/jpeg" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg");
    if (!isJpeg) {
      setAvatarErr("El archivo debe ser .jpg / .jpeg");
      e.target.value = "";
      onFileChange?.(null);
      onDataUrl?.("");
      return;
    }

    const maxBytes = 1024 * 1024;
    if (file.size > maxBytes) {
      setAvatarErr("El archivo supera 1 MB");
      e.target.value = "";
      onFileChange?.(null);
      onDataUrl?.("");
      return;
    }

    onFileChange?.(file);

    if (onDataUrl) {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = () => reject(new Error("No se pudo leer el archivo"));
        r.readAsDataURL(file);
      });
      onDataUrl(dataUrl);
    }
  }

  return (
    <div className="col-12">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="form-control"
        type="file"
        accept=".jpg,.jpeg,image/jpeg"
        onChange={onAvatarChange}
      />
      <div className="form-text">Máx. 1 MB. Recomendado: 500 x 500 px.</div>
      {avatarErr ? (
        <div className="text-danger small mt-1">{avatarErr}</div>
      ) : null}
    </div>
  );
}
