import { ApiError, id, instant, Row, SystemRole } from "./client";
export type ReportType = "ATTENDANCE" | "ACCESS_EVENTS";
export type ReportOption = {
  type: ReportType;
  name: string;
  description: string;
  formats: string[];
  filters: string[];
  groupBy: string[];
  columns: string[];
};
export type ReportOptions = {
  reports: ReportOption[];
  filterValues: Record<string, string[]>;
  maxReportDays: number;
  supportsSummary: boolean;
  supportsDetails: boolean;
};
const filters = [
  "from",
  "to",
  "employeeIds",
  "areaIds",
  "deviceIds",
  "attendanceTypes",
  "attendanceSources",
  "accessResults",
];
export const enumCode = (value: string) =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
const strings = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
    throw new ApiError(
      "Las opciones de reportes no cumplen el contrato.",
      0,
      "CONTRACT_ERROR",
    );
  return [...new Set(value)];
};
export function reportOptions(value: unknown, role: SystemRole): ReportOptions {
  const data = value as Row;
  if (
    !data ||
    !Array.isArray(data.reports) ||
    !Number.isSafeInteger(data.maxReportDays) ||
    Number(data.maxReportDays) < 1 ||
    Number(data.maxReportDays) > 366 ||
    !data.filterValues ||
    typeof data.filterValues !== "object"
  )
    throw new ApiError(
      "Las opciones de reportes no cumplen el contrato.",
      0,
      "CONTRACT_ERROR",
    );
  const allowed =
    role === "ADMIN"
      ? ["ATTENDANCE", "ACCESS_EVENTS"]
      : role === "RRHH"
        ? ["ATTENDANCE"]
        : ["ACCESS_EVENTS"];
  const reports = (data.reports as Row[])
    .map((row) => {
      if (!row || typeof row.type !== "string" || typeof row.name !== "string")
        throw new ApiError("Tipo de reporte inválido.", 0, "CONTRACT_ERROR");
      return {
        type: enumCode(row.type) as ReportType,
        name: row.name,
        description: typeof row.description === "string" ? row.description : "",
        formats: strings(row.formats)
          .map(enumCode)
          .filter((v) => ["JSON", "PDF"].includes(v)),
        filters: strings(row.filters).filter((v) => filters.includes(v)),
        groupBy: strings(row.groupBy)
          .map(enumCode)
          .filter((v) =>
            ["EMPLOYEE", "DAY", "WEEK", "MONTH", "AREA", "DEVICE"].includes(v),
          ),
        columns: strings(row.columns),
      };
    })
    .filter((row) => allowed.includes(row.type) && row.formats.length);
  const values = data.filterValues as Row;
  return {
    reports,
    filterValues: {
      attendanceTypes: strings(values.attendanceTypes)
        .map(enumCode)
        .filter((v) => ["ENTRADA", "SALIDA"].includes(v)),
      attendanceSources: strings(values.attendanceSources)
        .map(enumCode)
        .filter((v) => ["DISPOSITIVO", "MANUAL"].includes(v)),
      accessResults: strings(values.accessResults)
        .map(enumCode)
        .filter((v) => ["AUTORIZADO", "RECHAZADO"].includes(v)),
    },
    maxReportDays: Number(data.maxReportDays),
    supportsSummary: data.supportsSummary === true,
    supportsDetails: data.supportsDetails === true,
  };
}
export function reportBody(
  options: ReportOptions,
  report: ReportOption,
  draft: Row,
): Row {
  if (
    !options.reports.includes(report) ||
    !report.formats.includes(String(draft.format))
  )
    throw new ApiError(
      "Seleccioná un tipo y formato de reporte permitidos.",
      400,
    );
  const from = instant(String(draft.from ?? "")),
    to = instant(String(draft.to ?? ""));
  const duration = Date.parse(to) - Date.parse(from);
  if (duration < 0 || duration > options.maxReportDays * 86400000)
    throw new ApiError(
      `Elegí un rango ordenado de hasta ${options.maxReportDays} días.`,
      400,
    );
  const body: Row = { type: report.type, format: draft.format, from, to };
  for (const key of filters.filter((key) => !["from", "to"].includes(key))) {
    const selected = Array.isArray(draft[key]) ? (draft[key] as unknown[]) : [];
    if (key.endsWith("Ids") && selected.length > 500)
      throw new ApiError(
        "Seleccioná como máximo 500 registros por filtro.",
        400,
      );
    if (selected.length && !report.filters.includes(key))
      throw new ApiError(
        "Un filtro no pertenece al reporte seleccionado.",
        400,
      );
    body[key] = key.endsWith("Ids")
      ? [...new Set(selected.map(id))]
      : [...new Set(selected.map((v) => String(v)))];
    if (
      !key.endsWith("Ids") &&
      (body[key] as string[]).some(
        (v) => !options.filterValues[key]?.includes(v),
      )
    )
      throw new ApiError("Filtro de reporte inválido.", 400);
  }
  for (const key of ["groupBy", "columns"] as const) {
    const selected = Array.isArray(draft[key]) ? (draft[key] as string[]) : [];
    if (selected.some((v) => !report[key].includes(v)))
      throw new ApiError(
        "Seleccioná agrupaciones y columnas disponibles.",
        400,
      );
    body[key] = [...new Set(selected)];
  }
  body.includeSummary =
    options.supportsSummary && draft.includeSummary === true;
  body.includeDetails =
    options.supportsDetails && draft.includeDetails === true;
  if (!body.includeSummary && !body.includeDetails)
    throw new ApiError("Incluí el resumen o el detalle del reporte.", 400);
  return body;
}
