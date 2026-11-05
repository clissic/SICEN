import QRCode from "qrcode";

export async function otpauthToDataUrl(otpauthUrl) {
  return QRCode.toDataURL(String(otpauthUrl), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
