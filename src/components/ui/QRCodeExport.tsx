"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "./Button";

interface QRCodeExportProps {
  publicUrl: string;
  venueName: string;
  isUnpublished?: boolean;
}

export function QRCodeExport({
  publicUrl,
  venueName,
  isUnpublished,
}: QRCodeExportProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(publicUrl, {
      width: 280,
      margin: 1,
      color: { dark: "#111111", light: "#f5f0e6" },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [publicUrl]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;

    const cardW = 600;
    const cardH = 720;
    const pad = 40;
    const qrSize = 280;
    const c = document.createElement("canvas");
    c.width = cardW;
    c.height = cardH;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.save();

    // Paper background with rounded corners
    ctx.fillStyle = "#f5f0e6";
    roundRect(ctx, 0, 0, cardW, cardH, 24);
    ctx.fill();

    // Border
    ctx.strokeStyle = "#d8d1c4";
    ctx.lineWidth = 1;
    roundRect(ctx, 0, 0, cardW, cardH, 24);
    ctx.stroke();

    // Venue name
    ctx.fillStyle = "#111111";
    ctx.font = "bold 22px 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(venueName, cardW / 2, pad);

    // Divider
    ctx.strokeStyle = "#d8d1c4";
    ctx.lineWidth = 1;
    const divY = pad + 40;
    ctx.beginPath();
    ctx.moveTo(cardW * 0.2, divY);
    ctx.lineTo(cardW * 0.8, divY);
    ctx.stroke();

    // QR code
    const qrX = (cardW - qrSize) / 2;
    const qrY = divY + 24;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      ctx.restore();

      // URL text
      ctx.fillStyle = "#5f5a52";
      ctx.font = "13px 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(publicUrl, cardW / 2, qrY + qrSize + 24);

      // Footer
      ctx.fillStyle = "#5f5a52";
      ctx.font = "10px 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Powered by mofé", cardW / 2, cardH - pad);

      const link = document.createElement("a");
      link.download = `${venueName.replace(/\s+/g, "-")}-qr.png`;
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
  <title>QR Code — ${venueName}</title>
  <style>
    @page { margin: 0; size: 100mm 150mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #f5f0e6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'Times New Roman', serif;
    }
    .card {
      background: #f5f0e6;
      border: 1px solid #d8d1c4;
      border-radius: 28px;
      padding: 40px;
      text-align: center;
    }
    .name { color: #111; font-size: 22px; font-weight: bold; margin-bottom: 12px; }
    .divider { height: 1px; background: #d8d1c4; width: 60%; margin: 0 auto 24px; }
    .qr { width: 280px; height: 280px; display: block; margin: 0 auto; }
    .url { color: #5f5a52; font-size: 12px; margin-top: 20px; word-break: break-all; }
    .footer { color: #5f5a52; font-size: 10px; margin-top: 24px; letter-spacing: 0.15em; text-transform: uppercase; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="name">${venueName}</div>
    <div class="divider"></div>
    <img class="qr" src="${qrDataUrl}" alt="QR Code" />
    <div class="url">${publicUrl}</div>
    <div class="footer">Powered by mofé</div>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); window.close(); }, 500); };</script>
</body>
</html>`);
    w.document.close();
  };

  return (
    <div>
      {isUnpublished && (
        <div className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3">
          <p className="text-sm text-ink-muted">
            منو منتشر نشده است. بازدیدکنندگان QR صفحه «منو در دسترس نیست» را
            مشاهده خواهند کرد.
          </p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={handleDownloadPng} disabled={!qrDataUrl}>
          دانلود PNG
        </Button>
        <Button variant="secondary" onClick={handlePrint} disabled={!qrDataUrl}>
          دانلود PDF
        </Button>
      </div>
      <div className="mt-4 flex justify-center">
        {qrDataUrl ? (
          <div className="inline-block rounded-[var(--radius-panel)] border border-line bg-paper p-6 text-center shadow-sm">
            <div className="font-serif text-lg text-ink">{venueName}</div>
            <div className="mx-auto my-4 h-px w-3/5 bg-line" />
            <img
              src={qrDataUrl}
              alt={`QR Code for ${venueName}`}
              className="mx-auto"
              width={200}
              height={200}
            />
            <div className="mt-3 text-xs text-ink-muted" dir="ltr">
              {publicUrl}
            </div>
          </div>
        ) : (
          <div className="py-8 text-sm text-ink-muted">در حال تولید QR...</div>
        )}
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
