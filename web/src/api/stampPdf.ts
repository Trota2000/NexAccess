
export interface PdfLetterhead {
  image: string;
  height: number;
}

/** Add a header in reserved space, retaining every original page as vector content. */
export async function stampPdf(
  bytes: Uint8Array,
  renderHeader: (width: number) => Promise<PdfLetterhead>,
): Promise<Uint8Array> {
  // The self-contained browser build avoids tslib ESM/CJS interop in Metro.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const library = require("pdf-lib/dist/pdf-lib.min.js");
  const { degrees, PDFDocument } = library as typeof import("pdf-lib");
  const source = await PDFDocument.load(bytes);
  if (!source.getPageCount())
    throw new Error("El PDF del servidor no tiene páginas.");
  const result = await PDFDocument.create();
  if (source.getTitle()) result.setTitle(source.getTitle()!);
  if (source.getAuthor()) result.setAuthor(source.getAuthor()!);
  result.setCreator("NexAccess");
  const headers = new Map<
    number,
    { image: Awaited<ReturnType<typeof result.embedPng>>; height: number }
  >();
  for (const original of source.getPages()) {
    const box = original.getCropBox();
    const rotation = ((original.getRotation().angle % 360) + 360) % 360;
    const sideways = rotation === 90 || rotation === 270;
    const width = sideways ? box.height : box.width;
    const height = sideways ? box.width : box.height;
    if (!headers.has(width)) {
      const header = await renderHeader(width);
      if (!Number.isFinite(header.height) || header.height <= 0)
        throw new Error("El tamaño del membrete no es válido.");
      headers.set(width, {
        image: await result.embedPng(header.image),
        height: header.height,
      });
    }
    const header = headers.get(width)!;
    const margin = 28,
      gap = 12,
      bottom = 12;
    const availableHeight = height - margin - header.height - gap - bottom;
    if (availableHeight < height * 0.45)
      throw new Error(
        "El membrete es demasiado extenso para el tamaño de página del reporte.",
      );
    const embedded = await result.embedPage(original, {
      left: box.x,
      bottom: box.y,
      right: box.x + box.width,
      top: box.y + box.height,
    });
    const page = result.addPage([width, height]);
    const scale = Math.min(
      (width - 2 * margin) / width,
      availableHeight / height,
      1,
    );
    const w = width * scale,
      h = height * scale;
    const x = (width - w) / 2,
      y = bottom + (availableHeight - h) / 2;
    page.drawPage(embedded, {
      x: x + (rotation === 180 || rotation === 270 ? w : 0),
      y: y + (rotation === 90 || rotation === 180 ? h : 0),
      width: box.width * scale,
      height: box.height * scale,
      rotate: degrees(-rotation),
    });
    page.drawImage(header.image, {
      x: margin,
      y: height - margin - header.height,
      width: width - 2 * margin,
      height: header.height,
    });
  }
  return result.save();
}
