import { localParts } from "./dates";
import { Row } from "./client";
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
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
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
export function reportHtml(csv: string, title: string, filters: Row): string {
  const [headers, ...rows] = parseCsv(csv);
  const summary = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${filterTitles[k] ?? k}: ${filterValue(k, v)}`)
    .join(" · ");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>NexAccess · ${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial,sans-serif;color:#263e45;font-size:10px}h1{color:#286c64;font-size:21px}p{line-height:1.5}table{border-collapse:collapse;width:100%;table-layout:fixed}th{background:#dcebe5;text-align:left}th,td{border:1px solid #cedcd7;padding:7px;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}tbody tr:nth-child(even){background:#f5f8f5}</style></head><body><h1>NexAccess · ${escapeHtml(title)}</h1><p>${escapeHtml(summary)}</p><p>${rows.length} registros · Horarios del CSV: zona configurada en el servidor</p><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(columnTitles[h] ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>${!rows.length ? "<p>Sin registros para los filtros seleccionados.</p>" : ""}</body></html>`;
}
