import { localParts } from "./dates";
import { Row } from "./client";
import { CompanyBranding } from "./company";
import { escapeHtml, letterheadHtml, letterheadCss } from "./letterhead";
export { escapeHtml } from "./letterhead";
export function parseCsv(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0];
  const separator = first.includes(",") ? "," : ";";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === separator && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("El CSV del servidor está incompleto.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length || rows.some((r) => r.length !== rows[0].length))
    throw new Error("El CSV no tiene columnas consistentes.");
  return rows;
}
const columnTitles: Record<string, string> = {
  id: "ID",
  fecha_hora_local: "Fecha y hora",
  resultado: "Resultado",
  motivo: "Motivo",
  empleado_id: "ID de empleado",
  empleado: "Empleado",
  dispositivo: "Dispositivo",
  area: "Área",
  credencial: "Credencial",
  tipo: "Tipo",
  origen: "Origen",
  observacion: "Observación",
};
const filterTitles: Record<string, string> = {
  from: "Desde",
  to: "Hasta",
  employeeId: "ID de empleado",
  deviceId: "ID de lector",
  areaId: "ID de área",
  result: "Resultado",
  type: "Tipo",
  source: "Origen",
};
function filterValue(key: string, value: unknown) {
  if (["from", "to"].includes(key)) {
    const p = localParts(String(value));
    return (
      p.day.split("-").reverse().join("/") +
      " " +
      p.hour +
      ":" +
      p.minute +
      " (Asunción)"
    );
  }
  return String(value);
}

export function reportFooter(title: string): string {
  if (/asistencia/i.test(title)) return "Control de asistencia";
  if (/accesos?/i.test(title)) return "Control de accesos";
  return title;
}

export function reportHtml(
  csv: string,
  title: string,
  filters: Row,
  branding?: CompanyBranding,
): string {
  const identity = letterheadHtml(branding);
  const [headers, ...rows] = parseCsv(csv);
  const entries = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  const dates = entries.filter(([key]) => key === "from" || key === "to");
  const applied = entries.filter(([key]) => key !== "from" && key !== "to");
  const lines = (values: [string, unknown][]) =>
    values
      .map(
        ([key, value]) =>
          `<p>${escapeHtml(filterTitles[key] ?? key)}: ${escapeHtml(filterValue(key, value))}</p>`,
      )
      .join("");
  const metadata = `<div class="report-meta"><section class="report-dates">${lines(dates)}<p>${rows.length} registros</p></section><section class="report-filters"><h2>Filtros aplicados</h2>${applied.length ? lines(applied) : "<p>Todos</p>"}</section></div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>NexAccess · ${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial,sans-serif;color:#263e45;font-size:10px}h1{color:#286c64;font-size:21px}${letterheadCss}.report-meta{display:flex;align-items:flex-start;gap:32px;margin:16px 0 20px;break-inside:avoid}.report-dates,.report-filters{flex:1;min-width:0;overflow-wrap:anywhere}.report-meta p{margin:4px 0}.report-filters h2{font-size:11px;margin:0 0 6px;color:#286c64}.report-footer{margin-top:16px;border-top:1px solid #cedcd7;padding-top:8px;color:#5b6a70;font-size:9px}p{line-height:1.5}table{border-collapse:collapse;width:100%;table-layout:fixed}th{background:#dcebe5;text-align:left}th,td{border:1px solid #cedcd7;padding:7px;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}tbody tr:nth-child(even){background:#f5f8f5}</style></head><body>${identity}<h1>${escapeHtml(title)}</h1>${metadata}<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(columnTitles[h] ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>${!rows.length ? "<p>Sin registros para los filtros seleccionados.</p>" : ""}<footer class="report-footer">${escapeHtml(reportFooter(title))}</footer></body></html>`;
}
