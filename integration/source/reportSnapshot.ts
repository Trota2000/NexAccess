import { ApiClient, Row } from "./client";
import { enumCode } from "./reportContract";

export interface ReportSnapshot {
  type: string;
  from: string;
  to: string;
  generatedAt: string;
  totalRecords: number;
  rows: Row[];
  groups: Row[];
}

export function reportDate(value: unknown): Date {
  if (typeof value !== "string") throw new Error("Fecha de reporte inválida.");
  // ASP.NET may serialize UTC database DateTimes without their UTC suffix.
  const date = new Date(
    /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`,
  );
  if (!Number.isFinite(date.getTime()))
    throw new Error("Fecha de reporte inválida.");
  return date;
}

export function reportSnapshot(value: unknown, request: Row): ReportSnapshot {
  const data = value as ReportSnapshot;
  const invalid = () => {
    throw new Error(
      "Los datos del reporte están incompletos o no corresponden a los filtros solicitados.",
    );
  };
  if (
    !data ||
    typeof data.type !== "string" ||
    enumCode(data.type) !== request.type ||
    !Number.isSafeInteger(data.totalRecords) ||
    data.totalRecords < 0 ||
    !Array.isArray(data.rows) ||
    !Array.isArray(data.groups)
  )
    invalid();
  if (
    reportDate(data.from).getTime() !== reportDate(request.from).getTime() ||
    reportDate(data.to).getTime() !== reportDate(request.to).getTime()
  )
    invalid();
  reportDate(data.generatedAt);
  if (request.includeDetails && data.rows.length !== data.totalRecords)
    invalid();
  for (const row of data.rows) {
    if (!row || typeof row !== "object") invalid();
    reportDate(row.occurredAt);
    for (const key of [
      "employeeName",
      "type",
      "source",
      "result",
      "reason",
      "areaName",
      "deviceCode",
      "note",
    ])
      if (row[key] != null && typeof row[key] !== "string") invalid();
  }
  for (const group of data.groups) {
    if (
      !group ||
      !group.keys ||
      typeof group.keys !== "object" ||
      Array.isArray(group.keys) ||
      Object.values(group.keys).some((v) => typeof v !== "string")
    )
      invalid();
    for (const key of [
      "totalRecords",
      "entries",
      "exits",
      "authorized",
      "rejected",
    ])
      if (!Number.isSafeInteger(group[key]) || Number(group[key]) < 0)
        invalid();
  }
  return data;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}

/** Keep the existing PDF authorization/audit path; never silently omit it. */
export async function exportReportSnapshot(
  client: ApiClient,
  body: Row,
  render: (snapshot: ReportSnapshot) => Promise<Blob>,
  active: () => boolean = () => true,
): Promise<Blob> {
  const check = () => {
    if (!active()) throw new Error("Exportación cancelada.");
  };
  const read = async () =>
    reportSnapshot(
      await client.request("/reports/generate", {
        method: "POST",
        body: { ...body, format: "JSON" },
      }),
      body,
    );
  const snapshot = await read();
  check();
  const result = await render(snapshot);
  check();
  // This is the existing request that writes REPORT_EXPORT on the backend.
  await client.request("/reports/generate", {
    method: "POST",
    body,
    pdf: true,
  });
  check();
  // Separate HTTP requests are not an atomic snapshot. Detect concurrent edits
  // rather than downloading a report whose rows changed during the export.
  const latest = await read();
  check();
  const content = (r: ReportSnapshot) =>
    stable({ totalRecords: r.totalRecords, rows: r.rows, groups: r.groups });
  if (content(snapshot) !== content(latest))
    throw new Error(
      "Los datos cambiaron durante la exportación. Volvé a generar el reporte.",
    );
  return result;
}
