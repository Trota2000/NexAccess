import { CompanyBranding } from "./company";
import { Row } from "./client";
import { ReportSnapshot } from "./reportSnapshot";

export async function renderWebReport(
  snapshot: ReportSnapshot,
  request: Row,
  userId: number,
  branding: CompanyBranding,
): Promise<Blob> {
  void snapshot;
  void request;
  void userId;
  void branding;
  throw new Error(
    "La plantilla web de reportes solo está disponible en el navegador.",
  );
}

// Native administrative exports retain the existing server PDF. The personal
// Android app does not expose this administrative screen.
export async function brandServerReport(
  data: Blob,
  branding: CompanyBranding,
): Promise<Blob> {
  void branding;
  return data;
}
