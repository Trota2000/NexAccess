import { CompanyBranding } from "./company";

// Native administrative exports retain the existing server PDF. The personal
// Android app does not expose this administrative screen.
export async function brandServerReport(
  data: Blob,
  branding: CompanyBranding,
): Promise<Blob> {
  void branding;
  return data;
}
