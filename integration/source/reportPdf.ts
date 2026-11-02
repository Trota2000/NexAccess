import type { PDFFont } from "pdf-lib";
import { Row } from "./client";
import { PdfLetterhead } from "./stampPdf";
import { ReportSnapshot, reportDate } from "./reportSnapshot";

const titles: Record<string, string> = {
  occurredAt: "Fecha y hora",
  employeeId: "ID empleado",
  employeeName: "Empleado",
  type: "Tipo",
  source: "Origen",
  result: "Resultado",
  reason: "Motivo",
  areaName: "Área",
  deviceCode: "Dispositivo",
  note: "Observación",
};
export interface ReportTextFallback {
  measure(text: string, size: number, bold: boolean): number;
  image(
    text: string,
    size: number,
    bold: boolean,
    color: string,
  ): { image: string; width: number; height: number };
}

/** Layout only: all counts, rows and groups come from the server snapshot. */
export async function renderReportPdf(
  snapshot: ReportSnapshot,
  request: Row,
  userId: number,
  renderHeader: (width: number) => Promise<PdfLetterhead>,
  fallback?: ReportTextFallback,
): Promise<Uint8Array> {
  // Same self-contained build already used by stampPdf (Metro ESM/CJS).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const library = require("pdf-lib/dist/pdf-lib.min.js");
  const { PDFDocument, StandardFonts, rgb } =
    library as typeof import("pdf-lib");
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const attendance = request.type === "ATTENDANCE";
  const title = attendance ? "Reporte de asistencia" : "Reporte de accesos";
  const footer = attendance ? "Control de asistencia" : "Control de accesos";
  const columns = (request.columns as string[]).length
    ? (request.columns as string[])
    : [
        "occurredAt",
        "employeeName",
        ...(attendance ? ["type", "source"] : ["result", "areaName"]),
        "deviceCode",
      ];
  if (columns.some((c) => !titles[c]))
    throw new Error("El reporte contiene una columna no compatible.");
  const [width, height] =
    request.includeDetails && columns.length > 5
      ? [841.89, 595.28]
      : [595.28, 841.89];
  const margin = 28,
    contentWidth = width - margin * 2,
    bottom = 52;
  const primary = "#194e4a",
    ink = "#263e45",
    muted = "#64748b",
    border = "#dce4e8";
  const color = (hex: string) =>
    rgb(
      ...([1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16) / 255) as [
        number,
        number,
        number,
      ]),
    );
  const header = await renderHeader(width);
  if (
    !Number.isFinite(header.height) ||
    header.height <= 0 ||
    header.height > height * 0.35
  )
    throw new Error("El membrete es demasiado extenso para el reporte.");
  const logo = await pdf.embedPng(header.image);
  let page = pdf.addPage([width, height]),
    y = height;
  const encodable = (text: string, font: PDFFont) => {
    try {
      font.encodeText(text);
      return true;
    } catch {
      return false;
    }
  };
  const measure = (text: string, size: number, heavy = false) => {
    const font = heavy ? bold : normal;
    if (encodable(text, font)) return font.widthOfTextAtSize(text, size);
    if (!fallback)
      throw new Error(
        "El navegador no permite representar un carácter del reporte.",
      );
    return fallback.measure(text, size, heavy);
  };
  const clean = (value: unknown) =>
    String(value ?? "—")
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, "    ");
  function wrap(
    value: unknown,
    maxWidth: number,
    size = 9,
    heavy = false,
  ): string[] {
    const result: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/ +/)) {
        const next = line ? `${line} ${word}` : word;
        if (measure(next, size, heavy) <= maxWidth) {
          line = next;
          continue;
        }
        if (line) result.push(line);
        line = "";
        for (const char of word) {
          if (line && measure(line + char, size, heavy) > maxWidth) {
            result.push(line);
            line = "";
          }
          line += char;
        }
      }
      result.push(line);
    }
    return result;
  }
  async function text(
    value: string,
    x: number,
    top: number,
    size = 9,
    heavy = false,
    fill = ink,
  ) {
    if (!value) return;
    const font = heavy ? bold : normal;
    if (encodable(value, font))
      page.drawText(value, {
        x,
        y: top - size,
        font,
        size,
        color: color(fill),
      });
    else {
      if (!fallback)
        throw new Error("No se puede representar un carácter del reporte.");
      const image = fallback.image(value, size, heavy, fill);
      page.drawImage(await pdf.embedPng(image.image), {
        x,
        y: top - image.height,
        width: image.width,
        height: image.height,
      });
    }
  }
  async function startPage(first = false) {
    if (!first) page = pdf.addPage([width, height]);
    page.drawImage(logo, {
      x: margin,
      y: height - margin - header.height,
      width: contentWidth,
      height: header.height,
    });
    y = height - margin - header.height - 16;
    await text(title, margin, y, first ? 15 : 11, true, primary);
    y -= first ? 30 : 24;
  }
  async function block(lines: string[], size = 9, heavy = false, fill = ink) {
    for (const line of lines) {
      if (y - 13 < bottom) await startPage();
      await text(line, margin, y, size, heavy, fill);
      y -= 13;
    }
  }
  const localDate = (value: unknown) =>
    new Intl.DateTimeFormat("es-PY", {
      timeZone: "America/Asuncion",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(reportDate(value));
  const list = (value: unknown) =>
    Array.isArray(value) && value.length ? value.join(", ") : "Todos";
  await startPage(true);
  const half = (contentWidth - 24) / 2;
  const dates = [
    `Desde: ${localDate(snapshot.from)}`,
    `Hasta: ${localDate(snapshot.to)}`,
    `Generado: ${localDate(snapshot.generatedAt)}`,
    `Total de registros: ${snapshot.totalRecords}`,
    `Generado por: Usuario #${userId}`,
    "Zona horaria: America/Asuncion",
  ].flatMap((v) => wrap(v, half));
  const filters = [
    `Empleados: ${list(request.employeeIds)}`,
    ...(attendance
      ? [
          `Tipos de marcación: ${list(request.attendanceTypes)}`,
          `Origen: ${list(request.attendanceSources)}`,
        ]
      : [
          `Áreas: ${list(request.areaIds)}`,
          `Resultados: ${list(request.accessResults)}`,
        ]),
    `Dispositivos: ${list(request.deviceIds)}`,
    `Agrupaciones: ${list(request.groupBy)}`,
  ].flatMap((v) => wrap(v, half));
  const right = ["Filtros aplicados", ...filters];
  for (let i = 0; i < Math.max(dates.length, right.length); i++) {
    if (y - 13 < bottom) await startPage();
    await text(dates[i] ?? "", margin, y);
    await text(
      right[i] ?? "",
      margin + half + 24,
      y,
      9,
      i === 0,
      i === 0 ? primary : ink,
    );
    y -= 13;
  }
  y -= 16;
  async function section(name: string, minimum = 60) {
    if (y - minimum < bottom) await startPage();
    await text(name, margin, y, 11, true, primary);
    y -= 24;
  }
  if (request.includeSummary && snapshot.groups.length) {
    await section("Resumen agrupado");
    for (const group of snapshot.groups) {
      const keys = Object.entries(group.keys as Row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" / ");
      const counts = `Total: ${group.totalRecords} | Entradas: ${group.entries} | Salidas: ${group.exits} | Autorizados: ${group.authorized} | Rechazados: ${group.rejected}`;
      await block(wrap(keys, contentWidth, 9, true), 9, true);
      await block(wrap(counts, contentWidth));
      y -= 10;
    }
  }
  if (request.includeDetails) {
    await section("Detalle de registros", 80);
    const weights = columns.map((c) => (c === "employeeName" ? 2 : 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (contentWidth * w) / sum);
    const headings = columns.map((c, i) =>
      wrap(titles[c], widths[i] - 12, 8, true),
    );
    const headingHeight = Math.max(...headings.map((v) => v.length)) * 11 + 12;
    async function tableHeader() {
      page.drawRectangle({
        x: margin,
        y: y - headingHeight,
        width: contentWidth,
        height: headingHeight,
        color: color(primary),
      });
      let x = margin;
      for (let c = 0; c < columns.length; c++) {
        for (let i = 0; i < headings[c].length; i++)
          await text(headings[c][i], x + 6, y - 6 - i * 11, 8, true, "#ffffff");
        x += widths[c];
      }
      y -= headingHeight;
    }
    if (y - headingHeight - 23 < bottom) await startPage();
    await tableHeader();
    for (let index = 0; index < snapshot.rows.length; index++) {
      const row = snapshot.rows[index];
      const cells = columns.map((c, i) =>
        wrap(
          c === "occurredAt"
            ? localDate(row[c])
            : c === "employeeName"
              ? (row[c] ?? "Sin identificar")
              : row[c],
          widths[i] - 12,
          8,
        ),
      );
      const lineCount = Math.max(...cells.map((v) => v.length));
      let offset = 0;
      while (offset < lineCount) {
        const fullHeight = (lineCount - offset) * 11 + 12;
        // Keep ordinary rows together; exceptionally long cells continue safely.
        const pageCapacity =
          height - margin - header.height - 40 - headingHeight - bottom;
        if (
          (fullHeight <= pageCapacity && y - fullHeight < bottom) ||
          y - 23 < bottom
        ) {
          await startPage();
          await tableHeader();
        }
        const count = Math.min(
          lineCount - offset,
          Math.floor((y - bottom - 12) / 11),
        );
        if (count < 1)
          throw new Error("No hay espacio para las filas del reporte.");
        const h = count * 11 + 12;
        if (index % 2 === 1)
          page.drawRectangle({
            x: margin,
            y: y - h,
            width: contentWidth,
            height: h,
            color: color("#f5f8f7"),
          });
        let x = margin;
        for (let c = 0; c < columns.length; c++) {
          for (let i = 0; i < count; i++)
            await text(cells[c][offset + i] ?? "", x + 6, y - 6 - i * 11, 8);
          x += widths[c];
        }
        y -= h;
        page.drawLine({
          start: { x: margin, y },
          end: { x: width - margin, y },
          thickness: 0.5,
          color: color(border),
        });
        offset += count;
        if (offset < lineCount) {
          await startPage();
          await tableHeader();
        }
      }
    }
    if (!snapshot.rows.length) {
      y -= 12;
      await block(["Sin registros para los filtros seleccionados."]);
    }
  }
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    page = pages[i];
    page.drawLine({
      start: { x: margin, y: 40 },
      end: { x: width - margin, y: 40 },
      thickness: 0.5,
      color: color(border),
    });
    await text(footer, margin, 32, 8, false, muted);
    const number = `Página ${i + 1} de ${pages.length}`;
    await text(
      number,
      width - margin - measure(number, 8),
      32,
      8,
      false,
      muted,
    );
  }
  pdf.setTitle(title);
  pdf.setCreator("NexAccess");
  pdf.setCreationDate(reportDate(snapshot.generatedAt));
  return pdf.save();
}
