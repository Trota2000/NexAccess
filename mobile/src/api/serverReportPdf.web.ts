import { CompanyBranding } from "./company";
import { letterheadData } from "./letterhead";
import { stampPdf } from "./stampPdf";

function linesFor(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    // Long unbroken identifiers/addresses still wrap without truncation.
    for (const char of word) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line);
        line = char;
      } else line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderLetterhead(
  branding: CompanyBranding,
  pageWidth: number,
) {
  const brand = letterheadData(branding);
  const width = pageWidth - 56;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error("El navegador no permite preparar el membrete PDF.");
  await document.fonts.ready;
  let logo: HTMLImageElement | undefined;
  if (brand.logo) {
    logo = new Image();
    logo.src = brand.logo;
    await logo.decode();
  }
  const textX = logo ? 146 : 0,
    textWidth = width - textX - 4;
  ctx.font = "600 14px Arial, sans-serif";
  const title = linesFor(ctx, brand.title, textWidth);
  ctx.font = "9px Arial, sans-serif";
  const details = brand.lines.flatMap((line) => linesFor(ctx, line, textWidth));
  const contentHeight = Math.max(
    64,
    title.length * 18 + details.length * 13 + 4,
  );
  const height = contentHeight + 14;
  canvas.width = Math.ceil(width * 3);
  canvas.height = Math.ceil(height * 3);
  ctx.scale(3, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  if (logo) {
    const factor = Math.min(130 / logo.naturalWidth, 64 / logo.naturalHeight);
    const w = logo.naturalWidth * factor,
      h = logo.naturalHeight * factor;
    ctx.drawImage(logo, (130 - w) / 2, (contentHeight - h) / 2, w, h);
  }
  ctx.textBaseline = "top";
  ctx.fillStyle = "#263e45";
  ctx.font = "600 14px Arial, sans-serif";
  let y = 0;
  for (const line of title) {
    ctx.fillText(line, textX, y);
    y += 18;
  }
  y += 4;
  ctx.font = "9px Arial, sans-serif";
  for (const line of details) {
    ctx.fillText(line, textX, y);
    y += 13;
  }
  ctx.strokeStyle = "#286c64";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, height - 1);
  ctx.lineTo(width, height - 1);
  ctx.stroke();
  return { image: canvas.toDataURL("image/png"), height };
}

export async function brandServerReport(
  data: Blob,
  branding: CompanyBranding,
): Promise<Blob> {
  const result = await stampPdf(
    new Uint8Array(await data.arrayBuffer()),
    (width) => renderLetterhead(branding, width),
  );
  return new Blob([new Uint8Array(result)], { type: "application/pdf" });
}
