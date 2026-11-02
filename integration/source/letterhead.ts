import { CompanyBranding, isLogoDataUrl } from "./company";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

export function letterheadData(branding?: CompanyBranding) {
  const company = branding?.company;
  const logo = branding?.logoDataUrl;
  if (logo && !isLogoDataUrl(logo))
    throw new Error("El logotipo del membrete no es válido.");
  return {
    logo,
    title: company?.razonSocial ?? "NexAccess",
    lines: company
      ? [
          company.nombreFantasia,
          company.ruc ? `RUC: ${company.ruc}` : null,
          company.direccion,
          [company.telefono, company.email].filter(Boolean).join(" · "),
        ].filter((value): value is string => !!value)
      : ["Control de accesos y asistencia"],
  };
}

export function letterheadHtml(branding?: CompanyBranding) {
  const { logo, title, lines } = letterheadData(branding);
  return `<header class="letterhead">${logo ? `<img class="company-logo" alt="Logotipo del membrete" src="${escapeHtml(logo)}">` : ""}<div class="company-info"><h2>${escapeHtml(title)}</h2>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div></header>`;
}

export const letterheadCss = `.letterhead{display:flex;align-items:center;gap:24px;border-bottom:2px solid #286c64;padding-bottom:14px;margin-bottom:16px;break-inside:avoid}.company-logo{width:130px;height:85px;object-fit:contain;flex-shrink:0}.company-info{min-width:0;overflow-wrap:anywhere}.company-info h2{font-size:19px;margin:0 0 4px;color:#263e45}.company-info p{margin:2px 0}`;
