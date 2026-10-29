import { ApiClient, ApiError, id, Row } from "./client";
import { bodyFor } from "./resources";
export interface Company {
  id: number;
  razonSocial: string;
  nombreFantasia: string | null;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  tieneLogo: boolean;
}
export const companyFields = [
  { key: "razonSocial", label: "Razón social", max: 200, required: true },
  { key: "nombreFantasia", label: "Nombre de fantasía", max: 200 },
  { key: "ruc", label: "RUC", max: 20, format: "taxId" },
  { key: "direccion", label: "Dirección", max: 300 },
  { key: "telefono", label: "Teléfono", max: 50, format: "phone" },
  { key: "email", label: "Correo institucional", max: 150, format: "email" },
] as const;
export type CompanyKey = (typeof companyFields)[number]["key"];
export type CompanyDraft = Record<CompanyKey, string>;
export interface CompanyBranding {
  company: Company;
  logoDataUrl?: string;
}
export function companyDraft(company?: Company | null): CompanyDraft {
  return Object.fromEntries(
    companyFields.map((f) => [f.key, company?.[f.key] ?? ""]),
  ) as CompanyDraft;
}
export function companyBody(draft: CompanyDraft): Row {
  return bodyFor(companyFields, draft);
}
export function readCompany(value: unknown): Company {
  const c = value as Company;
  if (
    !c ||
    typeof c.razonSocial !== "string" ||
    !c.razonSocial.trim() ||
    typeof c.activo !== "boolean" ||
    typeof c.tieneLogo !== "boolean" ||
    companyFields.some((f) => c[f.key] !== null && typeof c[f.key] !== "string")
  )
    throw new ApiError(
      "La información empresarial no cumple el contrato de la API.",
      0,
      "CONTRACT_ERROR",
    );
  id(c.id);
  return c;
}
export async function getCompany(client: ApiClient): Promise<Company | null> {
  try {
    return readCompany(await client.request("/empresa"));
  } catch (e) {
    if (
      e instanceof ApiError &&
      e.status === 404 &&
      e.code === "EMPRESA_NOT_CONFIGURED"
    )
      return null;
    throw e;
  }
}
export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export function validateLogo(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > MAX_LOGO_SIZE)
    throw new ApiError(
      "Seleccioná una imagen de hasta 2 MB.",
      400,
      "LOGO_TOO_LARGE",
    );
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!((mime === "image/png" && png) || (mime === "image/jpeg" && jpeg)))
    throw new ApiError(
      "El archivo debe ser una imagen PNG o JPEG válida.",
      400,
      "INVALID_LOGO",
    );
}
export function isLogoDataUrl(value: string): boolean {
  return (
    value.length <= Math.ceil(MAX_LOGO_SIZE / 3) * 4 + 32 &&
    /^(?:data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}|data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2})$/.test(
      value,
    )
  );
}
export async function getCompanyLogo(client: ApiClient): Promise<string> {
  const blob = (await client.request("/empresa/logo", {
    binary: true,
  })) as Blob;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new ApiError("No se pudo leer el logotipo.", 0, "IMAGE_ERROR"));
    reader.onabort = reader.onerror;
    reader.onload = () => {
      const value = String(reader.result);
      if (!isLogoDataUrl(value))
        reject(
          new ApiError(
            "La imagen empresarial no es válida.",
            0,
            "INVALID_LOGO",
          ),
        );
      else resolve(value);
    };
    reader.readAsDataURL(blob);
  });
}
export async function loadCompanyBranding(
  client: ApiClient,
): Promise<CompanyBranding | undefined> {
  const company = await getCompany(client);
  if (!company) return undefined;
  return {
    company,
    ...(company.tieneLogo ? { logoDataUrl: await getCompanyLogo(client) } : {}),
  };
}
