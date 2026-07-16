"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Button } from "./Button";

interface QRCodeExportProps {
  publicUrl: string;
  venueName: string;
  isUnpublished?: boolean;
}

// 1x layout constants matching the HTML/CSS preview card:
const L = {
  pad: 24, // p-6
  nameSize: 18, // text-lg
  nameLine: 22,
  dividerMargin: 16, // my-4
  qrSize: 200, // displayed size in web preview
  fontSize: 10,
  footerMargin: 16,
  radius: 28,
};

// Derived card dimensions at 1x
const CARD_W_1X = L.pad + L.qrSize + L.pad;
const CARD_H_1X =
  L.pad +
  L.nameLine +
  L.dividerMargin +
  1 +
  L.dividerMargin +
  L.qrSize +
  L.footerMargin +
  L.fontSize +
  L.pad;

export function QRCodeExport({
  publicUrl,
  venueName,
  isUnpublished,
}: QRCodeExportProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(() => {
    setError(null);
    setQrDataUrl("");
    QRCode.toDataURL(publicUrl, {
      width: L.qrSize * 3, // 600 — high-res for crisp exports
      margin: 1,
      color: { dark: "#111111", light: "#f5f0e6" },
    })
      .then(setQrDataUrl)
      .catch(() => setError("خطا در تولید QR"));
  }, [publicUrl]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;

    const s = 3;
    const cardW = CARD_W_1X * s;
    const cardH = CARD_H_1X * s;
    const pad = L.pad * s;
    const qrSize = L.qrSize * s;
    const radius = L.radius * s;

    const c = document.createElement("canvas");
    c.width = cardW;
    c.height = cardH;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f5f0e6";
    roundRect(ctx, 0, 0, cardW, cardH, radius);
    ctx.fill();

    ctx.strokeStyle = "#d8d1c4";
    ctx.lineWidth = 1 * s;
    roundRect(ctx, 0, 0, cardW, cardH, radius);
    ctx.stroke();

    ctx.fillStyle = "#111111";
    ctx.font = `bold ${L.nameSize * s}px 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(venueName, cardW / 2, pad);

    const divY = pad + L.nameLine * s + L.dividerMargin * s;
    ctx.strokeStyle = "#d8d1c4";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(cardW * 0.2, divY);
    ctx.lineTo(cardW * 0.8, divY);
    ctx.stroke();

    const qrY = divY + 1 * s + L.dividerMargin * s;
    const qrX = (cardW - qrSize) / 2;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      const footerY = qrY + qrSize + L.footerMargin * s;
      ctx.fillStyle = "#5f5a52";
      ctx.font = `${L.fontSize * s}px 'Times New Roman', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("Powered by mofé", cardW / 2, footerY);

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

    const safeName = venueName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    w.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <title>QR Code</title>
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
      border-radius: ${L.radius}px;
      padding: ${L.pad}px;
      text-align: center;
    }
    .name { font-family: "EB Garamond", "Georgia", serif; color: #111; font-size: ${L.nameSize}px; font-weight: 400; margin-bottom: ${L.dividerMargin}px; }
    .divider { height: 1px; background: #d8d1c4; width: 60%; margin: ${L.dividerMargin}px auto; }
    .qr { width: ${L.qrSize}px; height: ${L.qrSize}px; display: block; margin: 0 auto; }
    .footer { color: #5f5a52; font-size: ${L.fontSize}px; margin-top: ${L.footerMargin}px; letter-spacing: 0.15em; text-transform: uppercase; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="name">${safeName}</div>
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
        {error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="secondary" size="sm" onClick={generate}>تلاش مجدد</Button>
          </div>
        ) : qrDataUrl ? (
          <div
            className="inline-block rounded-[var(--radius-panel)] border border-line bg-paper p-6 text-center shadow-sm"
            style={{ padding: `${L.pad}px` }}
          >
            <div className="font-serif text-lg text-ink" style={{ fontSize: L.nameSize }}>
              {venueName}
            </div>
            <div className="mx-auto h-px w-3/5 bg-line" style={{ margin: `${L.dividerMargin}px auto` }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR Code for ${venueName}`}
              className="mx-auto"
              width={L.qrSize}
              height={L.qrSize}
            />
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
