"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";

const TARGET_URL = "https://najdshad.github.io/noghteh-menu/";

const NAME = "کافه نقطه";
const NAME_EN = "Cafe Noghteh";

export default function QRSinglePage() {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(TARGET_URL, {
      width: 600,
      margin: 1,
      color: { dark: "#111111", light: "#f5f0e6" },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, []);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;

    const s = 3;
    const pad = 24 * s;
    const nameSize = 18 * s;
    const nameLine = 22 * s;
    const dividerMargin = 16 * s;
    const qrSize = 200 * s;
    const footerMargin = 16 * s;
    const fontSize = 10 * s;
    const cardW = pad + qrSize + pad;
    const cardH =
      pad +
      nameLine +
      dividerMargin +
      1 * s +
      dividerMargin +
      qrSize +
      footerMargin +
      pad;

    const c = document.createElement("canvas");
    c.width = cardW;
    c.height = cardH;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f5f0e6";
    roundRect(ctx, 0, 0, cardW, cardH, 28 * s);
    ctx.fill();

    ctx.strokeStyle = "#d8d1c4";
    ctx.lineWidth = 1 * s;
    roundRect(ctx, 0, 0, cardW, cardH, 28 * s);
    ctx.stroke();

    ctx.fillStyle = "#111111";
    ctx.font = `bold ${nameSize}px 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(NAME, cardW / 2, pad);

    const divY = pad + nameLine + dividerMargin;
    ctx.strokeStyle = "#d8d1c4";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(cardW * 0.2, divY);
    ctx.lineTo(cardW * 0.8, divY);
    ctx.stroke();

    const qrY = divY + 1 * s + dividerMargin;
    const qrX = (cardW - qrSize) / 2;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      const footerY = qrY + qrSize + footerMargin;
      ctx.fillStyle = "#5f5a52";
      ctx.font = `${fontSize}px 'Times New Roman', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("Powered by mofé", cardW / 2, footerY);

      const link = document.createElement("a");
      link.download = "noghteh-qr.png";
      link.href = c.toDataURL("image/png");
      link.click();
    };
    img.src = qrDataUrl;
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <title>QR Code — ${NAME}</title>
  <style>
    @page { margin: 0; size: auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #f5f0e6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
    }
    .card {
      background: #f5f0e6;
      border: 1px solid #d8d1c4;
      border-radius: 28px;
      padding: 24px;
      text-align: center;
    }
    .name { font-family: "EB Garamond", "Georgia", serif; color: #111; font-size: 18px; font-weight: 400; margin-bottom: 16px; }
    .divider { height: 1px; background: #d8d1c4; width: 60%; margin: 16px auto; }
    .qr { width: 200px; height: 200px; display: block; margin: 0 auto; }
    .footer { color: #5f5a52; font-size: 10px; margin-top: 16px; letter-spacing: 0.15em; text-transform: uppercase; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="name">${NAME}</div>
    <div class="divider"></div>
    <img class="qr" src="${qrDataUrl}" alt="QR Code" />
    <div class="footer">Powered by mofé</div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();window.close()},500)}</script>
</body>
</html>`);
    w.document.close();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper p-6">
      <div className="inline-block rounded-[28px] border border-line bg-paper p-8 text-center shadow-sm">
        <h1 className="font-serif text-2xl text-ink">{NAME}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{NAME_EN}</p>
        <div className="mx-auto my-4 h-px w-3/5 bg-line" />
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code for کافه نقطه"
            className="mx-auto"
            width={200}
            height={200}
          />
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center text-sm text-ink-muted">
            در حال تولید QR...
          </div>
        )}
        <p className="mt-4 text-[10px] uppercase tracking-[0.15em] text-ink-muted">
          Powered by mofé
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={handleDownloadPng} disabled={!qrDataUrl}>
          دانلود PNG
        </Button>
        <Button variant="secondary" onClick={handlePrint} disabled={!qrDataUrl}>
          دانلود PDF
        </Button>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
