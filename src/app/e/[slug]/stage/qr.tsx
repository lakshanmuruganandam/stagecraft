"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRCodeSVG({ text, size }: { text: string; size: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(text, { type: "svg", margin: 0, width: size }).then(setSvg);
  }, [text, size]);
  return <div role="img" aria-label="QR code to join" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
