import { AccessEvent, Credential, Employee } from './types';

export function eventRows(events: AccessEvent[], users: Employee[], credentials: Credential[] = []) {
  return [['Registro', 'Empleado', 'ID empleado', 'ID credencial', 'Identificador enmascarado', 'Fecha y hora ISO', 'Área', 'Lector', 'Resultado', 'Motivo'], ...events.map(e => {
    const user = users.find(u => u.id === e.employeeId);
    return [e.id, user ? `${user.nombre} ${user.apellido}` : 'No disponible', e.employeeId, e.credentialId, credentials.find(c => c.id === e.credentialId)?.maskedUid ?? 'No disponible', e.date, e.area, e.lector, e.resultado, e.motivo];
  })];
}

export function dateKey(date: string, timezone = 'America/Asuncion') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  const get = (key: string) => parts.find(p => p.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function groupEvents(events: AccessEvent[], group: string, timezone: string) {
  const result: Record<string, number> = {};
  events.forEach(e => {
    const day = dateKey(e.date, timezone);
    let key = group === 'Mes' ? day.slice(0, 7) : day;
    if (group === 'Semana') { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); key = `Semana ${d.toISOString().slice(0, 10)}`; }
    result[key] = (result[key] ?? 0) + 1;
  });
  return Object.entries(result).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}
export function csvContent(rows: string[][]) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function reportHtml(title: string, rows: string[][]) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:16mm}body{font:12px Arial;color:#293f46}h1{font-size:24px}table{border-collapse:collapse;width:100%}td,th{padding:9px;border:1px solid #dce4df;text-align:left}th{background:#e9eeea}tr{break-inside:avoid}</style></head><body><h1>${escapeHtml(title)}</h1><p>Datos ficticios · Exportación de la selección actual</p><table><thead><tr>${(rows[0] ?? []).map(v => `<th>${escapeHtml(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${row.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
}
