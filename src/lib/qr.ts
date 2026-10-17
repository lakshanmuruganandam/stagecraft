import "server-only";
import QRCode from "qrcode";

export function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, { margin: 0, width: 360, color: { dark: "#1d1a14", light: "#fbf7ee" }, errorCorrectionLevel: "M" });
}
